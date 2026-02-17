import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export class SkillInstaller {
  private static readonly BUILTIN_SKILLS = [
    'manager',
    'brainstorm',
    'feature-dev',
    'api-design',
    'bug-fix',
    'quick-prototype'
  ];

  /**
   * Ensure all built-in skills are installed
   */
  static async ensureBuiltinSkills(skillsDir?: string): Promise<void> {
    const homeDir = os.homedir();
    const targetSkillsDir = skillsDir || path.join(homeDir, '.claude', 'skills');

    await fs.ensureDir(targetSkillsDir);

    for (const skill of this.BUILTIN_SKILLS) {
      const targetPath = path.join(targetSkillsDir, `speccraft:${skill}`);

      // Skip if already exists
      if (await fs.pathExists(targetPath)) {
        continue;
      }

      // Copy from src/skills/
      const sourcePath = path.join(__dirname, '../../src/skills', skill, 'SKILL.md');

      if (!await fs.pathExists(sourcePath)) {
        console.warn(`Warning: Built-in skill not found: ${skill}`);
        continue;
      }

      await fs.ensureDir(targetPath);
      await fs.copy(sourcePath, path.join(targetPath, 'SKILL.md'));
    }
  }
}
