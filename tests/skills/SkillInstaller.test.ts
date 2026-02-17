import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { SkillInstaller } from "../../src/core/SkillInstaller";

describe("SkillInstaller", () => {
  let testSkillsDir: string;

  beforeEach(async () => {
    testSkillsDir = await fs.mkdtemp(path.join(os.tmpdir(), "skills-"));
  });

  afterEach(async () => {
    await fs.remove(testSkillsDir);
  });

  it("should install built-in skills", async () => {
    await SkillInstaller.ensureBuiltinSkills(testSkillsDir);

    // Check all skills installed
    const expectedSkills = [
      'manager', 'brainstorm', 'feature-dev',
      'api-design', 'bug-fix', 'quick-prototype'
    ];

    for (const skill of expectedSkills) {
      const skillPath = path.join(testSkillsDir, `speccraft:${skill}`, 'SKILL.md');
      expect(await fs.pathExists(skillPath)).toBe(true);
    }
  });

  it("should not reinstall existing skills", async () => {
    // First install
    await SkillInstaller.ensureBuiltinSkills(testSkillsDir);

    const skillPath = path.join(testSkillsDir, 'speccraft:manager', 'SKILL.md');
    const originalContent = await fs.readFile(skillPath, 'utf-8');

    // Modify content
    await fs.writeFile(skillPath, 'modified content');

    // Second install (should not overwrite)
    await SkillInstaller.ensureBuiltinSkills(testSkillsDir);

    const newContent = await fs.readFile(skillPath, 'utf-8');
    expect(newContent).toBe('modified content');
  });
});
