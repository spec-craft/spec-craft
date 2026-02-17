import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { WorkflowLoader } from "../../src/core/WorkflowLoader";
import { $ } from "bun";

const TEMPLATE_DIR = path.join(process.cwd(), "src/templates/feature-dev");
const TEST_DIR = path.join(process.cwd(), ".test-feature-dev");

describe("feature-dev 模板", () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it("workflow.yaml 配置正确", async () => {
    const workflow = await WorkflowLoader.loadFromDir(TEMPLATE_DIR);

    expect(workflow.name).toBe("feature-dev");
    expect(workflow.version).toBe("1.0.0");
    expect(workflow.description).toBe("标准功能开发流程（文档 + 代码混合）");

    // 检查变量
    expect(workflow.variables?.feature).toBeDefined();
    expect(workflow.variables?.feature.type).toBe("string");
    expect(workflow.variables?.feature.required).toBe(true);

    expect(workflow.variables?.priority).toBeDefined();
    expect(workflow.variables?.priority.type).toBe("select");
    expect(workflow.variables?.priority.options).toEqual(["P0", "P1", "P2", "P3"]);

    // 检查命令
    expect(workflow.commands.init).toBeDefined();
    expect(workflow.commands.spec).toBeDefined();
    expect(workflow.commands.design).toBeDefined();
    expect(workflow.commands.tasks).toBeDefined();
    expect(workflow.commands.implement).toBeDefined();
    expect(workflow.commands.test).toBeDefined();
    expect(workflow.commands.validate).toBeDefined();

    // 检查依赖关系
    expect(workflow.commands.spec.dependsOn).toEqual(["init"]);
    expect(workflow.commands.design.dependsOn).toEqual(["spec"]);
    expect(workflow.commands.tasks.dependsOn).toEqual(["design"]);
    expect(workflow.commands.implement.dependsOn).toEqual(["tasks"]);
  });

  it("所有模板文件存在", async () => {
    const templatesDir = path.join(TEMPLATE_DIR, "templates");

    await expect(fs.pathExists(path.join(templatesDir, "init.md"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(templatesDir, "spec.md"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(templatesDir, "design.md"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(templatesDir, "tasks.md"))).resolves.toBe(true);
  });

  it("SKILL.md exists and has correct format", async () => {
    // SKILL.md is now in src/skills/ instead of src/templates/
    const skillPath = path.join(process.cwd(), "src/skills/feature-dev/SKILL.md");
    await expect(fs.pathExists(skillPath)).resolves.toBe(true);

    const content = await fs.readFile(skillPath, "utf-8");
    expect(content).toContain("# Feature Development Workflow");
    expect(content).toContain("## When to Use");
    expect(content).toContain("## Commands");
    expect(content).toContain("craft run feature-dev");
  });

  it("可以通过 copy 命令复制", async () => {
    const targetDir = path.join(TEST_DIR, "feature-dev");
    
    await $`bun ${process.cwd()}/bin/craft.ts copy feature-dev ${TEST_DIR}`.quiet();

    // 检查复制后的文件
    await expect(fs.pathExists(path.join(targetDir, "workflow.yaml"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(targetDir, "SKILL.md"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(targetDir, "templates", "init.md"))).resolves.toBe(true);
  });

  it("模板内容包含变量占位符", async () => {
    const initTemplate = await fs.readFile(
      path.join(TEMPLATE_DIR, "templates", "init.md"),
      "utf-8"
    );

    expect(initTemplate).toContain("{{feature}}");
    expect(initTemplate).toContain("{{priority}}");
    expect(initTemplate).toContain("{{createdAt}}");

    const specTemplate = await fs.readFile(
      path.join(TEMPLATE_DIR, "templates", "spec.md"),
      "utf-8"
    );

    expect(specTemplate).toContain("{{feature}}");
    expect(specTemplate).toContain("{{createdAt}}");
  });
});
