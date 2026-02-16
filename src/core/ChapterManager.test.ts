import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { ChapterManager } from "./ChapterManager";
import type { ChapterDefinition, ChapterGroup } from "../types/chapter";

describe("ChapterManager", () => {
  const testDir = join(process.cwd(), ".test-chapters");
  let manager: ChapterManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new ChapterManager();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should get next chapter group to generate", () => {
    const chapters: ChapterDefinition[] = [
      { id: "background", title: "Background" },
      { id: "user-stories", title: "User Stories" },
      { id: "requirements", title: "Requirements" },
      { id: "acceptance", title: "Acceptance Criteria" },
    ];
    const groups: ChapterGroup[] = [
      { name: "phase-1", chapters: ["background", "user-stories"] },
      { name: "phase-2", chapters: ["requirements", "acceptance"] },
    ];
    const completedChapters: string[] = [];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next?.name).toBe("phase-1");
    expect(next?.chapters).toEqual(["background", "user-stories"]);
  });

  it("should return next group when first is completed", () => {
    const chapters: ChapterDefinition[] = [
      { id: "background", title: "Background" },
      { id: "user-stories", title: "User Stories" },
      { id: "requirements", title: "Requirements" },
    ];
    const groups: ChapterGroup[] = [
      { name: "phase-1", chapters: ["background", "user-stories"] },
      { name: "phase-2", chapters: ["requirements"] },
    ];
    const completedChapters = ["background", "user-stories"];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next?.name).toBe("phase-2");
  });

  it("should return null when all groups are completed", () => {
    const chapters: ChapterDefinition[] = [
      { id: "background", title: "Background" },
    ];
    const groups: ChapterGroup[] = [
      { name: "phase-1", chapters: ["background"] },
    ];
    const completedChapters = ["background"];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next).toBeNull();
  });

  it("should get specific chapters by ids", () => {
    const chapters: ChapterDefinition[] = [
      { id: "background", title: "Background" },
      { id: "user-stories", title: "User Stories" },
      { id: "requirements", title: "Requirements" },
    ];

    const selected = manager.getChaptersByIds(chapters, [
      "background",
      "requirements",
    ]);
    expect(selected).toHaveLength(2);
    expect(selected[0].id).toBe("background");
    expect(selected[1].id).toBe("requirements");
  });

  it("should merge chapter content into existing document", async () => {
    const existingPath = join(testDir, "design.md");
    await writeFile(
      existingPath,
      `# Design

## Background

Existing background content.

## User Stories

<!-- pending -->
`
    );

    const newChapterContent = `## User Stories

As a user, I want to login.`;

    const merged = await manager.mergeChapter(
      existingPath,
      "User Stories",
      newChapterContent
    );
    expect(merged).toContain("Existing background content");
    expect(merged).toContain("As a user, I want to login");
    expect(merged).not.toContain("<!-- pending -->");
  });

  it("should append chapter if section not found", async () => {
    const existingPath = join(testDir, "design.md");
    await writeFile(
      existingPath,
      "# Design\n\n## Background\n\nSome content.\n"
    );

    const newChapter = "## New Section\n\nNew content here.";

    const merged = await manager.mergeChapter(
      existingPath,
      "New Section",
      newChapter
    );
    expect(merged).toContain("Some content.");
    expect(merged).toContain("New content here.");
  });
});
