import { describe, test, expect } from "bun:test";
import type {
  WorkflowCommand,
  ExecutionConfig,
  Workflow,
  CommandType,
  QueryCheck,
  ContextManagement
} from "../../src/core/types";
import {
  isTemplateCommand,
  isExecutionCommand,
  isQueryCommand,
  isInteractiveCommand
} from "../../src/core/types";

describe("Workflow Types", () => {
  test("支持所有四种命令类型", () => {
    const types: CommandType[] = ["template", "execution", "query", "interactive"];
    expect(types).toHaveLength(4);
  });

  test("支持 execution 配置", () => {
    const cmd: WorkflowCommand = {
      description: "运行测试",
      type: "execution",
      execution: {
        command: "npm test",
        mode: "full",
        failFast: true,
        coverage: true
      }
    };
    expect(cmd.type).toBe("execution");
    expect(cmd.execution?.command).toBe("npm test");
    expect(cmd.execution?.mode).toBe("full");
  });

  test("支持 query 检查项", () => {
    const cmd: WorkflowCommand = {
      description: "验证",
      type: "query",
      checks: ["spec-completeness", "test-coverage"]
    };
    expect(cmd.checks).toHaveLength(2);
  });

  test("支持 dependsOn 和 autoRunDeps", () => {
    const cmd: WorkflowCommand = {
      description: "设计",
      type: "template",
      template: "templates/design.md",
      output: "specs/design.md",
      dependsOn: ["spec"],
      autoRunDeps: true
    };
    expect(cmd.dependsOn).toEqual(["spec"]);
    expect(cmd.autoRunDeps).toBe(true);
  });

  test("支持 workflow 级别的 contextManagement", () => {
    const wf: Workflow = {
      name: "test",
      version: "1.0.0",
      commands: { init: { type: "template", template: "t.md", output: "o.md" } },
      contextManagement: {
        tokenThreshold: 8000,
        roundThreshold: 20
      }
    };
    expect(wf.contextManagement?.tokenThreshold).toBe(8000);
    expect(wf.contextManagement?.roundThreshold).toBe(20);
  });
});

describe("Command Type Guards", () => {
  test("isTemplateCommand 正确识别模板命令", () => {
    const cmd: WorkflowCommand = {
      type: "template",
      template: "t.md",
      output: "o.md"
    };
    expect(isTemplateCommand(cmd)).toBe(true);
    expect(isExecutionCommand(cmd)).toBe(false);
  });

  test("isExecutionCommand 正确识别执行命令", () => {
    const cmd: WorkflowCommand = {
      type: "execution",
      execution: { command: "npm test" }
    };
    expect(isExecutionCommand(cmd)).toBe(true);
    expect(isTemplateCommand(cmd)).toBe(false);
  });

  test("isQueryCommand 正确识别查询命令", () => {
    const cmd: WorkflowCommand = {
      type: "query",
      checks: ["test-coverage"]
    };
    expect(isQueryCommand(cmd)).toBe(true);
  });

  test("isInteractiveCommand 正确识别交互命令", () => {
    const cmd: WorkflowCommand = {
      type: "interactive"
    };
    expect(isInteractiveCommand(cmd)).toBe(true);
  });

  test("缺少必要字段时类型守卫返回 false", () => {
    const incompleteCmd: WorkflowCommand = {
      type: "template"
      // 缺少 template 和 output
    };
    expect(isTemplateCommand(incompleteCmd)).toBe(false);
  });
});
