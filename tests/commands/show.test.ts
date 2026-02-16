import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { showCommandHandler } from "../../src/commands/show";

const TEST_DIR = path.join(process.cwd(), ".test-show");

describe("craft show", () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it("显示工作流完整详情", async () => {
    const workflowDir = path.join(TEST_DIR, "test-workflow");
    await fs.ensureDir(workflowDir);
    await fs.writeFile(
      path.join(workflowDir, "workflow.yaml"),
      `name: test-workflow
version: 1.0.0
description: 测试工作流

variables:
  topic:
    type: string
    required: true
    description: 主题名称
  priority:
    type: select
    options: [P0, P1, P2, P3]
    default: P2
    description: 优先级
  enabled:
    type: boolean
    default: true

commands:
  init:
    type: template
    description: 初始化
    template: templates/init.md
    output: "specs/{{topic}}/init.md"
  
  spec:
    type: template
    description: 生成规格
    dependsOn: [init]
  
  validate:
    type: query
    description: 验证
    dependsOn: [init, spec]
`
    );

    const detail = await showCommandHandler(workflowDir);

    expect(detail.name).toBe("test-workflow");
    expect(detail.version).toBe("1.0.0");
    expect(detail.description).toBe("测试工作流");

    // 检查变量
    expect(detail.variables).toHaveLength(3);
    
    const topicVar = detail.variables.find(v => v.name === "topic");
    expect(topicVar?.type).toBe("string");
    expect(topicVar?.required).toBe(true);
    expect(topicVar?.description).toBe("主题名称");

    const priorityVar = detail.variables.find(v => v.name === "priority");
    expect(priorityVar?.type).toBe("select");
    expect(priorityVar?.default).toBe("P2");
    expect(priorityVar?.options).toEqual(["P0", "P1", "P2", "P3"]);

    const enabledVar = detail.variables.find(v => v.name === "enabled");
    expect(enabledVar?.type).toBe("boolean");
    expect(enabledVar?.default).toBe(true);

    // 检查命令
    expect(detail.commands).toHaveLength(3);

    const initCmd = detail.commands.find(c => c.name === "init");
    expect(initCmd?.type).toBe("template");
    expect(initCmd?.description).toBe("初始化");
    expect(initCmd?.dependsOn).toBeUndefined();

    const specCmd = detail.commands.find(c => c.name === "spec");
    expect(specCmd?.dependsOn).toEqual(["init"]);

    const validateCmd = detail.commands.find(c => c.name === "validate");
    expect(validateCmd?.type).toBe("query");
    expect(validateCmd?.dependsOn).toEqual(["init", "spec"]);
  });

  it("显示最小工作流", async () => {
    const workflowDir = path.join(TEST_DIR, "minimal");
    await fs.ensureDir(workflowDir);
    await fs.writeFile(
      path.join(workflowDir, "workflow.yaml"),
      `name: minimal
version: 1.0.0
commands:
  run:
    type: execution
`
    );

    const detail = await showCommandHandler(workflowDir);

    expect(detail.name).toBe("minimal");
    expect(detail.variables).toHaveLength(0);
    expect(detail.commands).toHaveLength(1);
    expect(detail.commands[0].name).toBe("run");
  });

  it("工作流不存在时抛出错误", async () => {
    await expect(showCommandHandler("/nonexistent/path")).rejects.toThrow();
  });

  it("无效的 workflow.yaml 抛出错误", async () => {
    const workflowDir = path.join(TEST_DIR, "invalid");
    await fs.ensureDir(workflowDir);
    await fs.writeFile(
      path.join(workflowDir, "workflow.yaml"),
      "invalid: yaml: ["
    );

    await expect(showCommandHandler(workflowDir)).rejects.toThrow();
  });
});
