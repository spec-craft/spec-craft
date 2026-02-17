import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { MarketplaceManager } from "../../src/core/MarketplaceManager";
import type { MarketplaceConfig, MarketplaceIndex } from "../../src/core/MarketplaceManager";

describe("MarketplaceManager - Types", () => {
  it("should accept valid MarketplaceConfig", () => {
    const config: MarketplaceConfig = {
      name: "test-marketplace",
      path: "/tmp/marketplace",
      isLocal: true,
      owner: {
        name: "Test",
        email: "test@example.com"
      }
    };

    expect(config.name).toBe("test-marketplace");
  });
});

describe("MarketplaceManager - Validation", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it("should detect missing marketplace directory", async () => {
    const result = await MarketplaceManager.validate("/nonexistent");

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("not found");
  });

  it("should detect missing marketplace.json", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "marketplace-"));

    const result = await MarketplaceManager.validate(tempDir);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("marketplace.json"))).toBe(true);
  });

  it("should validate correct marketplace", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "marketplace-"));

    // Create structure
    await fs.ensureDir(path.join(tempDir, ".claude-plugin"));
    await fs.ensureDir(path.join(tempDir, "workflows"));

    const index: MarketplaceIndex = {
      $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
      name: "test",
      description: "Test marketplace",
      owner: { name: "Test", email: "test@example.com" },
      plugins: []
    };

    await fs.writeJSON(
      path.join(tempDir, ".claude-plugin", "marketplace.json"),
      index,
      { spaces: 2 }
    );

    const result = await MarketplaceManager.validate(tempDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
