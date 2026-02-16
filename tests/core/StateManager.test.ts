import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { StateManager } from "../../src/core/StateManager";

const TEST_DIR = "/tmp/speccraft-test-state";

describe("StateManager", () => {
  let manager: StateManager;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    manager = new StateManager(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe("getInstance", () => {
    test("不存在的实例返回 null", async () => {
      const instance = await manager.getInstance("test-workflow", "test-instance");
      expect(instance).toBeNull();
    });
  });

  describe("upsertInstance", () => {
    test("创建新实例", async () => {
      const instance = await manager.upsertInstance("test-workflow", "test-instance", {
        topic: "test-topic"
      });
      
      expect(instance.instance).toBe("test-instance");
      expect(instance.workflow).toBe("test-workflow");
      expect(instance.variables.topic).toBe("test-topic");
      expect(instance.createdAt).toBeDefined();
      expect(instance.updatedAt).toBeDefined();
    });

    test("更新现有实例", async () => {
      await manager.upsertInstance("test-workflow", "test-instance", { topic: "topic1" });
      const instance = await manager.upsertInstance("test-workflow", "test-instance", { priority: "P0" });
      
      expect(instance.variables.topic).toBe("topic1");
      expect(instance.variables.priority).toBe("P0");
    });
  });

  describe("getCommandStatus", () => {
    test("不存在的命令返回 null", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      const status = await manager.getCommandStatus("test-workflow", "test-instance", "init");
      expect(status).toBeNull();
    });

    test("获取命令状态", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      await manager.setCommandStatus("test-workflow", "test-instance", "init", "completed", {
        output: "output/init.md"
      });
      
      const status = await manager.getCommandStatus("test-workflow", "test-instance", "init");
      expect(status?.status).toBe("completed");
      expect(status?.output).toBe("output/init.md");
    });
  });

  describe("setCommandStatus", () => {
    test("设置命令状态", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      
      const state = await manager.setCommandStatus("test-workflow", "test-instance", "init", "in_progress");
      expect(state.status).toBe("in_progress");
      expect(state.startedAt).toBeDefined();
    });

    test("完成命令时记录 completedAt", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      
      const state = await manager.setCommandStatus("test-workflow", "test-instance", "init", "completed");
      expect(state.status).toBe("completed");
      expect(state.completedAt).toBeDefined();
    });

    test("失败时记录错误", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      
      const state = await manager.setCommandStatus("test-workflow", "test-instance", "init", "failed", {
        error: "Something went wrong"
      });
      expect(state.status).toBe("failed");
      expect(state.error).toBe("Something went wrong");
    });
  });

  describe("canExecuteCommand", () => {
    test("实例不存在时不能执行", async () => {
      const result = await manager.canExecuteCommand("test-workflow", "test-instance", "explore", ["init"]);
      expect(result.canExecute).toBe(false);
      expect(result.reason).toContain("不存在");
    });

    test("依赖未完成时不能执行", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      await manager.setCommandStatus("test-workflow", "test-instance", "init", "in_progress");
      
      const result = await manager.canExecuteCommand("test-workflow", "test-instance", "explore", ["init"]);
      expect(result.canExecute).toBe(false);
      expect(result.reason).toContain("尚未完成");
    });

    test("依赖已完成时可以执行", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      await manager.setCommandStatus("test-workflow", "test-instance", "init", "completed");
      
      const result = await manager.canExecuteCommand("test-workflow", "test-instance", "explore", ["init"]);
      expect(result.canExecute).toBe(true);
    });

    test("无依赖时可以执行", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      
      const result = await manager.canExecuteCommand("test-workflow", "test-instance", "init", []);
      expect(result.canExecute).toBe(true);
    });
  });

  describe("listInstances", () => {
    test("列出所有实例", async () => {
      await manager.upsertInstance("workflow1", "instance1");
      await manager.upsertInstance("workflow1", "instance2");
      await manager.upsertInstance("workflow2", "instance3");
      
      const instances = await manager.listInstances();
      expect(instances.length).toBe(3);
    });

    test("按工作流名称筛选", async () => {
      await manager.upsertInstance("workflow1", "instance1");
      await manager.upsertInstance("workflow1", "instance2");
      await manager.upsertInstance("workflow2", "instance3");
      
      const instances = await manager.listInstances("workflow1");
      expect(instances.length).toBe(2);
      expect(instances.every(i => i.workflow === "workflow1")).toBe(true);
    });
  });

  describe("deleteInstance", () => {
    test("删除实例", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      
      const deleted = await manager.deleteInstance("test-workflow", "test-instance");
      expect(deleted).toBe(true);
      
      const instance = await manager.getInstance("test-workflow", "test-instance");
      expect(instance).toBeNull();
    });

    test("删除不存在的实例返回 false", async () => {
      const deleted = await manager.deleteInstance("test-workflow", "non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("状态持久化", () => {
    test("状态保存到文件", async () => {
      await manager.upsertInstance("test-workflow", "test-instance");
      await manager.setCommandStatus("test-workflow", "test-instance", "init", "completed");
      
      const statePath = manager.getStatePath();
      expect(await fs.pathExists(statePath)).toBe(true);
      
      const content = await fs.readJson(statePath);
      expect(content.version).toBe("1.0.0");
      expect(content.instances["test-workflow:test-instance"]).toBeDefined();
    });
  });
});
