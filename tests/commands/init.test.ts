import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { $ } from "bun";

const TEST_DIR = "/tmp/speccraft-test-init";

describe("craft init", () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  test("创建 marketplace 目录结构", async () => {
    const result = await $`bun ${process.cwd()}/bin/craft.ts init my-workflows -p ${TEST_DIR}`.quiet();
    
    const targetPath = path.join(TEST_DIR, "my-workflows");
    
    // 检查目录存在
    expect(await fs.pathExists(targetPath)).toBe(true);
    
    // 检查 marketplace.json 存在
    expect(await fs.pathExists(path.join(targetPath, "marketplace.json"))).toBe(true);
    
    // 检查 README.md 存在
    expect(await fs.pathExists(path.join(targetPath, "README.md"))).toBe(true);
    
    // 检查 .gitignore 存在
    expect(await fs.pathExists(path.join(targetPath, ".gitignore"))).toBe(true);
  });

  test("marketplace.json 内容正确", async () => {
    await $`bun ${process.cwd()}/bin/craft.ts init test-mp -p ${TEST_DIR}`.quiet();
    
    const configPath = path.join(TEST_DIR, "test-mp", "marketplace.json");
    const config = await fs.readJson(configPath);
    
    expect(config.name).toBe("test-mp");
    expect(config.version).toBe("1.0.0");
    expect(config.workflows).toEqual([]);
  });

  test("非空目录应该报错", async () => {
    const targetPath = path.join(TEST_DIR, "existing-dir");
    await fs.ensureDir(targetPath);
    await fs.writeFile(path.join(targetPath, "some-file.txt"), "content");
    
    const result = await $`bun ${process.cwd()}/bin/craft.ts init existing-dir -p ${TEST_DIR}`.quiet().nothrow();
    
    expect(result.exitCode).toBe(1);
  });

  test("空目录应该正常创建", async () => {
    const targetPath = path.join(TEST_DIR, "empty-dir");
    await fs.ensureDir(targetPath);
    
    const result = await $`bun ${process.cwd()}/bin/craft.ts init empty-dir -p ${TEST_DIR}`.quiet();
    
    expect(result.exitCode).toBe(0);
    expect(await fs.pathExists(path.join(targetPath, "marketplace.json"))).toBe(true);
  });
});
