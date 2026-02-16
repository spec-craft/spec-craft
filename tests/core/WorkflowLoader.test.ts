import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { WorkflowLoader } from "../../src/core/WorkflowLoader";

const TEST_DIR = "/tmp/speccraft-test-loader";

describe("WorkflowLoader", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe("parse", () => {
    test("解析有效的工作流 YAML", () => {
      const yaml = `
name: test-workflow
version: 1.0.0
description: 测试工作流

variables:
  topic:
    type: string
    required: true
    description: 主题

commands:
  init:
    type: template
    description: 初始化
    template: templates/init.md
    output: "output/init.md"
`;
      
      const workflow = WorkflowLoader.parse(yaml);
      
      expect(workflow.name).toBe("test-workflow");
      expect(workflow.version).toBe("1.0.0");
      expect(workflow.description).toBe("测试工作流");
      expect(workflow.variables?.topic).toBeDefined();
      expect(workflow.commands.init).toBeDefined();
      expect(workflow.commands.init.type).toBe("template");
    });

    test("缺少 name 字段应该报错", () => {
      const yaml = `
version: 1.0.0
commands:
  init:
    type: template
`;
      
      expect(() => WorkflowLoader.parse(yaml)).toThrow("name");
    });

    test("缺少 version 字段应该报错", () => {
      const yaml = `
name: test
commands:
  init:
    type: template
`;
      
      expect(() => WorkflowLoader.parse(yaml)).toThrow("version");
    });

    test("无效的命令类型应该报错", () => {
      const yaml = `
name: test
version: 1.0.0
commands:
  init:
    type: invalid-type
`;
      
      expect(() => WorkflowLoader.parse(yaml)).toThrow("type");
    });

    test("依赖不存在的命令应该报错", () => {
      const yaml = `
name: test
version: 1.0.0
commands:
  step2:
    type: template
    dependsOn: [non-existent]
`;
      
      expect(() => WorkflowLoader.parse(yaml)).toThrow("依赖的命令 \"non-existent\" 不存在");
    });
  });

  describe("load", () => {
    test("从文件加载工作流", async () => {
      const yaml = `
name: file-workflow
version: 1.0.0
commands:
  init:
    type: template
`;
      
      const filePath = path.join(TEST_DIR, "workflow.yaml");
      await fs.writeFile(filePath, yaml);
      
      const workflow = await WorkflowLoader.load(filePath);
      expect(workflow.name).toBe("file-workflow");
    });

    test("文件不存在应该报错", async () => {
      await expect(WorkflowLoader.load("/non-existent/workflow.yaml")).rejects.toThrow("工作流文件不存在");
    });
  });

  describe("loadFromDir", () => {
    test("从目录加载工作流", async () => {
      const yaml = `
name: dir-workflow
version: 1.0.0
commands:
  init:
    type: template
`;
      
      await fs.writeFile(path.join(TEST_DIR, "workflow.yaml"), yaml);
      
      const workflow = await WorkflowLoader.loadFromDir(TEST_DIR);
      expect(workflow.name).toBe("dir-workflow");
    });
  });

  describe("getDependencyOrder", () => {
    test("获取单个命令的依赖顺序", () => {
      const yaml = `
name: test
version: 1.0.0
commands:
  init:
    type: template
  explore:
    type: template
    dependsOn: [init]
  summarize:
    type: template
    dependsOn: [explore]
`;
      
      const workflow = WorkflowLoader.parse(yaml);
      const order = WorkflowLoader.getDependencyOrder(workflow, "summarize");
      
      expect(order).toEqual(["init", "explore", "summarize"]);
    });

    test("无依赖的命令", () => {
      const yaml = `
name: test
version: 1.0.0
commands:
  init:
    type: template
`;
      
      const workflow = WorkflowLoader.parse(yaml);
      const order = WorkflowLoader.getDependencyOrder(workflow, "init");
      
      expect(order).toEqual(["init"]);
    });
  });

  describe("getAllCommandsOrder", () => {
    test("获取所有命令的执行顺序", () => {
      const yaml = `
name: test
version: 1.0.0
commands:
  init:
    type: template
  explore:
    type: template
    dependsOn: [init]
  summarize:
    type: template
    dependsOn: [explore]
  standalone:
    type: template
`;
      
      const workflow = WorkflowLoader.parse(yaml);
      const order = WorkflowLoader.getAllCommandsOrder(workflow);
      
      // init 应该在 explore 之前，explore 应该在 summarize 之前
      expect(order.indexOf("init")).toBeLessThan(order.indexOf("explore"));
      expect(order.indexOf("explore")).toBeLessThan(order.indexOf("summarize"));
      expect(order).toContain("standalone");
    });
  });
});
