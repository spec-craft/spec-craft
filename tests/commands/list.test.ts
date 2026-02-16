import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { listCommandHandler } from "../../src/commands/list";

const TEST_DIR = path.join(process.cwd(), ".test-list");

describe("craft list", () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it("列出所有工作流", async () => {
    // 创建两个工作流
    const brainstormDir = path.join(TEST_DIR, "brainstorm");
    await fs.ensureDir(brainstormDir);
    await fs.writeFile(
      path.join(brainstormDir, "workflow.yaml"),
      `name: brainstorm
version: 1.0.0
description: 头脑风暴工作流
commands:
  init:
    type: template
    description: 初始化
    template: templates/init.md
    output: "specs/{{topic}}/init.md"
  next:
    type: interactive
    description: 继续探索
`
    );

    const featureDevDir = path.join(TEST_DIR, "feature-dev");
    await fs.ensureDir(featureDevDir);
    await fs.writeFile(
      path.join(featureDevDir, "workflow.yaml"),
      `name: feature-dev
version: 2.0.0
description: 功能开发工作流
commands:
  spec:
    type: template
    description: 生成规格
  design:
    type: template
    description: 生成设计
`
    );

    const workflows = await listCommandHandler(TEST_DIR);

    expect(workflows).toHaveLength(2);
    
    const names = workflows.map(w => w.name).sort();
    expect(names).toEqual(["brainstorm", "feature-dev"]);

    const brainstorm = workflows.find(w => w.name === "brainstorm");
    expect(brainstorm?.version).toBe("1.0.0");
    expect(brainstorm?.description).toBe("头脑风暴工作流");
    expect(brainstorm?.commands).toEqual(["init", "next"]);

    const featureDev = workflows.find(w => w.name === "feature-dev");
    expect(featureDev?.version).toBe("2.0.0");
    expect(featureDev?.commands).toEqual(["spec", "design"]);
  });

  it("空 marketplace 返回空列表", async () => {
    const workflows = await listCommandHandler(TEST_DIR);
    expect(workflows).toHaveLength(0);
  });

  it("跳过没有 workflow.yaml 的目录", async () => {
    const randomDir = path.join(TEST_DIR, "random-dir");
    await fs.ensureDir(randomDir);
    await fs.writeFile(path.join(randomDir, "README.md"), "Not a workflow");

    const workflows = await listCommandHandler(TEST_DIR);
    expect(workflows).toHaveLength(0);
  });

  it("跳过无效的 workflow.yaml", async () => {
    const invalidDir = path.join(TEST_DIR, "invalid");
    await fs.ensureDir(invalidDir);
    await fs.writeFile(
      path.join(invalidDir, "workflow.yaml"),
      "invalid: yaml: content: ["
    );

    const workflows = await listCommandHandler(TEST_DIR);
    expect(workflows).toHaveLength(0);
  });

  it("目录不存在时抛出错误", async () => {
    await expect(listCommandHandler("/nonexistent/path")).rejects.toThrow("目录不存在");
  });
});
