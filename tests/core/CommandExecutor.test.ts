import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { CommandExecutor } from "../../src/core/CommandExecutor";
import type { WorkflowCommand } from "../../src/core/types";

const TEST_DIR = "/tmp/speccraft-test-executor";

describe("CommandExecutor", () => {
  let executor: CommandExecutor;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    executor = new CommandExecutor(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe("execute", () => {
    test("执行模板命令", async () => {
      // 创建测试模板
      const templateDir = path.join(TEST_DIR, "templates");
      await fs.ensureDir(templateDir);
      await fs.writeFile(path.join(templateDir, "test.md"), "# {{name}}");

      const cmd: WorkflowCommand = {
        type: "template",
        template: "templates/test.md",
        output: "output/result.md"
      };

      const result = await executor.execute(cmd, { name: "Test" }, TEST_DIR);
      
      expect(result.success).toBe(true);
      expect(result.output).toBe("output/result.md");
      
      const content = await fs.readFile(path.join(TEST_DIR, "output/result.md"), "utf-8");
      expect(content).toBe("# Test");
    });

    test("执行模板命令时缺少模板文件报错", async () => {
      const cmd: WorkflowCommand = {
        type: "template",
        template: "nonexistent.md",
        output: "output/result.md"
      };

      const result = await executor.execute(cmd, {}, TEST_DIR);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });

    test("执行 shell 命令成功", async () => {
      const cmd: WorkflowCommand = {
        type: "execution",
        execution: {
          command: "echo 'hello'"
        }
      };

      const result = await executor.execute(cmd, {}, TEST_DIR);
      
      expect(result.success).toBe(true);
    });

    test("执行 shell 命令失败", async () => {
      const cmd: WorkflowCommand = {
        type: "execution",
        execution: {
          command: "sh -c 'exit 1'"
        }
      };

      const result = await executor.execute(cmd, {}, TEST_DIR);
      
      expect(result.success).toBe(false);
    });

    test("执行 query 命令", async () => {
      const cmd: WorkflowCommand = {
        type: "query",
        checks: ["test-coverage", "spec-completeness"]
      };

      const result = await executor.execute(cmd, {}, TEST_DIR);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain("test-coverage");
    });

    test("执行 interactive 命令", async () => {
      const cmd: WorkflowCommand = {
        type: "interactive"
      };

      const result = await executor.execute(cmd, {}, TEST_DIR);
      
      expect(result.success).toBe(true);
    });
  });

  describe("模板渲染", () => {
    test("渲染多个变量", async () => {
      const templateDir = path.join(TEST_DIR, "templates");
      await fs.ensureDir(templateDir);
      await fs.writeFile(
        path.join(templateDir, "multi.md"), 
        "{{greeting}}, {{name}}!"
      );

      const cmd: WorkflowCommand = {
        type: "template",
        template: "templates/multi.md",
        output: "output/multi.md"
      };

      const result = await executor.execute(cmd, { greeting: "Hello", name: "World" }, TEST_DIR);
      
      expect(result.success).toBe(true);
      
      const content = await fs.readFile(path.join(TEST_DIR, "output/multi.md"), "utf-8");
      expect(content).toBe("Hello, World!");
    });

    test("渲染输出路径中的变量", async () => {
      const templateDir = path.join(TEST_DIR, "templates");
      await fs.ensureDir(templateDir);
      await fs.writeFile(path.join(templateDir, "test.md"), "content");

      const cmd: WorkflowCommand = {
        type: "template",
        template: "templates/test.md",
        output: "specs/{{feature}}/init.md"
      };

      const result = await executor.execute(cmd, { feature: "user-auth" }, TEST_DIR);
      
      expect(result.success).toBe(true);
      expect(result.output).toBe("specs/user-auth/init.md");
      
      expect(await fs.pathExists(path.join(TEST_DIR, "specs/user-auth/init.md"))).toBe(true);
    });
  });
});
