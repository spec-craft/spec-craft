import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { $ } from "bun";

const TEST_DIR = "/tmp/speccraft-test-run";
const WORKFLOW_PATH = path.resolve("src/templates/brainstorm");

describe("craft run", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  test("显示可用命令", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH}`.quiet();
    const output = result.stdout.toString();
    
    expect(output).toContain("工作流: brainstorm");
    expect(output).toContain("可用命令:");
    expect(output).toContain("init");
    expect(output).toContain("explore");
    expect(output).toContain("summarize");
  });

  test("未知命令应该报错", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH} unknown-cmd`.quiet().nothrow();
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("不存在");
  });

  test("执行 init 命令", async () => {
    // 创建一个预填充的状态文件，避免交互式输入
    const stateDir = path.join(TEST_DIR, ".craft");
    await fs.ensureDir(stateDir);
    await fs.writeJson(path.join(stateDir, "state.json"), {
      version: "1.0.0",
      instances: {
        "brainstorm:test1": {
          instance: "test1",
          workflow: "brainstorm",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          variables: { topic: "test-topic" },
          commands: {}
        }
      }
    });
    
    // 执行命令（已有变量，不需要交互输入）
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH} init -i test1 -d ${TEST_DIR}`.quiet();
    
    // 检查输出文件
    const outputPath = path.join(TEST_DIR, "brainstorms", "test-topic", "init.md");
    expect(await fs.pathExists(outputPath)).toBe(true);
    
    const content = await fs.readFile(outputPath, "utf-8");
    expect(content).toContain("test-topic");
    
    // 检查状态
    const state = await fs.readJson(path.join(stateDir, "state.json"));
    expect(state.instances["brainstorm:test1"].commands.init.status).toBe("completed");
  });

  test("依赖未满足时应该报错", async () => {
    // 创建状态：只有 init 完成
    const stateDir = path.join(TEST_DIR, ".craft");
    await fs.ensureDir(stateDir);
    await fs.writeJson(path.join(stateDir, "state.json"), {
      version: "1.0.0",
      instances: {
        "brainstorm:test2": {
          instance: "test2",
          workflow: "brainstorm",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          variables: { topic: "test-topic" },
          commands: {
            init: { status: "completed", completedAt: new Date().toISOString() }
          }
        }
      }
    });
    
    // 尝试执行 summarize（跳过 explore）
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH} summarize -i test2 -d ${TEST_DIR}`.quiet().nothrow();
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("依赖命令");
  });

  test("命令已完成时跳过执行", async () => {
    // 创建状态：init 已完成
    const stateDir = path.join(TEST_DIR, ".craft");
    await fs.ensureDir(stateDir);
    await fs.writeJson(path.join(stateDir, "state.json"), {
      version: "1.0.0",
      instances: {
        "brainstorm:test3": {
          instance: "test3",
          workflow: "brainstorm",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          variables: { topic: "test-topic" },
          commands: {
            init: { status: "completed", output: "test.md", completedAt: new Date().toISOString() }
          }
        }
      }
    });
    
    // 再次执行（不带 force）
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH} init -i test3 -d ${TEST_DIR}`.quiet();
    
    expect(result.stdout.toString()).toContain("已完成");
    expect(result.stdout.toString()).toContain("--force");
  });

  test("使用 --force 强制重新执行", async () => {
    // 创建状态和输出文件
    const stateDir = path.join(TEST_DIR, ".craft");
    await fs.ensureDir(stateDir);
    await fs.writeJson(path.join(stateDir, "state.json"), {
      version: "1.0.0",
      instances: {
        "brainstorm:test4": {
          instance: "test4",
          workflow: "brainstorm",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          variables: { topic: "test-topic" },
          commands: {
            init: { status: "completed", output: "test.md", completedAt: new Date().toISOString() }
          }
        }
      }
    });
    
    // 使用 force 重新执行
    const result = await $`bun ${process.cwd()}/bin/craft.ts run ${WORKFLOW_PATH} init -i test4 -d ${TEST_DIR} --force`.quiet();
    
    expect(result.stdout.toString()).toContain("执行完成");
  });
});
