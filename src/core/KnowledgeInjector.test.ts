import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { KnowledgeInjector } from "./KnowledgeInjector";
import type { KnowledgeInjection } from "../core/types";

describe("KnowledgeInjector", () => {
  const testDir = join(process.cwd(), ".test-knowledge");
  let injector: KnowledgeInjector;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    injector = new KnowledgeInjector(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should load knowledge from local file", async () => {
    await mkdir(join(testDir, "knowledge"), { recursive: true });
    await writeFile(
      join(testDir, "knowledge", "testing.md"),
      "# Testing Guidelines\n\nAlways write tests first."
    );

    const injections: KnowledgeInjection[] = [
      {
        id: "testing",
        source: "knowledge/testing.md",
        removeFromOutput: true,
      },
    ];

    const loaded = await injector.loadKnowledge(injections);
    expect(loaded["testing"]).toContain("Testing Guidelines");
  });

  it("should inject knowledge into template content", () => {
    const template = `# Design

<knowledge id="standards">
{{knowledge.standards}}
</knowledge>

Please follow the standards above.`;

    const knowledge = {
      standards: "## Code Standards\n\nUse TypeScript strict mode.",
    };

    const injected = injector.inject(template, knowledge);
    expect(injected).toContain("Code Standards");
    expect(injected).toContain("Use TypeScript strict mode");
  });

  it("should remove knowledge blocks from output", () => {
    const content = `# Design

<knowledge id="standards">
## Code Standards

Use TypeScript strict mode.
</knowledge>

Please follow the standards above.

## My Design

Some design content here.`;

    const injections: KnowledgeInjection[] = [
      {
        id: "standards",
        source: "knowledge/standards.md",
        removeFromOutput: true,
      },
    ];

    const cleaned = injector.removeKnowledgeBlocks(content, injections);
    expect(cleaned).not.toContain("<knowledge");
    expect(cleaned).not.toContain("Code Standards");
    expect(cleaned).toContain("Please follow the standards above");
    expect(cleaned).toContain("Some design content here");
  });

  it("should keep knowledge blocks when removeFromOutput is false", () => {
    const content = `# Design

<knowledge id="ref">
## Reference

Keep this.
</knowledge>

More content.`;

    const injections: KnowledgeInjection[] = [
      { id: "ref", source: "knowledge/ref.md", removeFromOutput: false },
    ];

    const cleaned = injector.removeKnowledgeBlocks(content, injections);
    expect(cleaned).toContain("Keep this");
  });
});
