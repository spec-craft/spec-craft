import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { SkillPublisher } from "../../src/core/SkillPublisher";
import type { PublishOptions, PublishResult } from "../../src/core/SkillPublisher";

describe("SkillPublisher - Types", () => {
  it("should accept valid PublishOptions", () => {
    const options: PublishOptions = {
      workflowPath: "/tmp/workflow",
      mode: "local",
      force: false,
      dryRun: false
    };

    expect(options.mode).toBe("local");
  });
});

describe("SkillPublisher - Local Publishing", () => {
  let tempDir: string;
  let testSkillsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-workflow-"));
    testSkillsDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-skills-"));

    // Create test workflow
    const workflowDef = {
      name: "test-local",
      version: "1.0.0",
      description: "Test local publishing",
      variables: {},
      commands: {
        init: {
          type: "template",
          description: "Init",
          template: "templates/init.md",
          output: "output/init.md"
        }
      }
    };

    await fs.writeFile(
      path.join(tempDir, "workflow.yaml"),
      require("yaml").stringify(workflowDef)
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    await fs.remove(testSkillsDir);
  });

  it("should publish skill to local directory", async () => {
    const result = await SkillPublisher.publish({
      workflowPath: tempDir,
      mode: "local",
      force: false,
      dryRun: false
    }, testSkillsDir);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("local");
    expect(result.installedPath).toContain("speccraft:test-local");

    // Verify SKILL.md was created
    const skillPath = path.join(result.installedPath, "SKILL.md");
    expect(await fs.pathExists(skillPath)).toBe(true);

    const skillContent = await fs.readFile(skillPath, "utf-8");
    expect(skillContent).toContain("name: speccraft:test-local");
  });
});
