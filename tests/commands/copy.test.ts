import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { $ } from "bun";

const TEST_DIR = "/tmp/speccraft-test-copy";

describe("craft copy", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  test("复制 brainstorm 模板", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts copy brainstorm ${TEST_DIR}`.quiet();
    
    const targetPath = path.join(TEST_DIR, "brainstorm");
    
    // 检查目录存在
    expect(await fs.pathExists(targetPath)).toBe(true);
    
    // 检查必要文件存在
    expect(await fs.pathExists(path.join(targetPath, "workflow.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(targetPath, "SKILL.md"))).toBe(true);
    expect(await fs.pathExists(path.join(targetPath, "templates"))).toBe(true);
  });

  test("使用自定义名称复制", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts copy brainstorm ${TEST_DIR} --name my-brainstorm`.quiet();
    
    const targetPath = path.join(TEST_DIR, "my-brainstorm");
    
    expect(await fs.pathExists(targetPath)).toBe(true);
    expect(await fs.pathExists(path.join(targetPath, "workflow.yaml"))).toBe(true);
  });

  test("未知模板应该报错", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts copy unknown-template ${TEST_DIR}`.quiet().nothrow();
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("未知模板");
  });

  test("目标目录已存在应该报错", async () => {
    const targetPath = path.join(TEST_DIR, "brainstorm");
    await fs.ensureDir(targetPath);
    
    const result = await $`bun ${process.cwd()}/bin/craft.ts copy brainstorm ${TEST_DIR}`.quiet().nothrow();
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("已存在");
  });
});
