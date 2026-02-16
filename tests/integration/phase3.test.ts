import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { ChapterManager } from "../../src/core/ChapterManager";
import { KnowledgeInjector } from "../../src/core/KnowledgeInjector";
import { SubAgentManager } from "../../src/core/SubAgentManager";
import { createCommandHandler } from "../../src/commands/create";

describe("Integration: Phase 3 - Advanced Features", () => {
  const testDir = join(process.cwd(), ".test-phase3");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create custom workflow and verify structure", async () => {
    await createCommandHandler(
      {
        name: "code-review",
        description: "Code review workflow",
        variables: [
          { name: "pr", type: "string", required: true, description: "PR number" },
        ],
        commands: [
          { name: "init", description: "Prepare review", type: "template" },
          { name: "review", description: "Perform review", type: "interactive" },
          { name: "status", description: "Check status", type: "query" },
          { name: "done", description: "Complete review", type: "template" },
        ],
      },
      testDir
    );

    const wfDir = join(testDir, "code-review");
    const workflowYaml = await readFile(join(wfDir, "workflow.yaml"), "utf-8");
    const skillMd = await readFile(join(wfDir, "SKILL.md"), "utf-8");
    const initTemplate = await readFile(
      join(wfDir, "templates", "init.md"),
      "utf-8"
    );
    const doneTemplate = await readFile(
      join(wfDir, "templates", "done.md"),
      "utf-8"
    );

    expect(workflowYaml).toContain("code-review");
    expect(workflowYaml).toContain("pr");
    expect(skillMd).toContain("# code-review");
    expect(skillMd).toContain("Code review workflow");
    expect(initTemplate).toContain("{{pr}}");
    expect(doneTemplate).toContain("{{pr}}");
  });

  it("should handle knowledge injection end-to-end", async () => {
    await mkdir(join(testDir, "knowledge"), { recursive: true });
    await writeFile(
      join(testDir, "knowledge", "standards.md"),
      "## Code Standards\n\nUse strict TypeScript."
    );

    const injector = new KnowledgeInjector(testDir);

    // Load
    const knowledge = await injector.loadKnowledge([
      {
        id: "standards",
        source: "knowledge/standards.md",
        removeFromOutput: true,
      },
    ]);

    // Inject
    const template = `# Design

<knowledge id="standards">
{{knowledge.standards}}
</knowledge>

Follow the above.

## Implementation

Code here.`;
    const injected = injector.inject(template, knowledge);
    expect(injected).toContain("Use strict TypeScript");

    // Clean
    const cleaned = injector.removeKnowledgeBlocks(injected, [
      {
        id: "standards",
        source: "knowledge/standards.md",
        removeFromOutput: true,
      },
    ]);
    expect(cleaned).not.toContain("Use strict TypeScript");
    expect(cleaned).toContain("Follow the above");
    expect(cleaned).toContain("Code here");
  });

  it("should manage chapter groups incrementally", () => {
    const manager = new ChapterManager();

    const chapters = [
      { id: "bg", title: "Background" },
      { id: "us", title: "User Stories" },
      { id: "req", title: "Requirements" },
    ];
    const groups = [
      { name: "p1", chapters: ["bg", "us"] },
      { name: "p2", chapters: ["req"] },
    ];

    // First call: phase 1
    const g1 = manager.getNextGroup(chapters, groups, []);
    expect(g1?.name).toBe("p1");

    // After completing phase 1: phase 2
    const g2 = manager.getNextGroup(chapters, groups, ["bg", "us"]);
    expect(g2?.name).toBe("p2");

    // After completing all: null
    const g3 = manager.getNextGroup(chapters, groups, ["bg", "us", "req"]);
    expect(g3).toBeNull();
  });

  it("should plan subagent execution in parallel groups", () => {
    const manager = new SubAgentManager();

    const groups = manager.getParallelGroups([
      { id: "scan-a", prompt: "Scan A" },
      { id: "scan-b", prompt: "Scan B" },
      {
        id: "merge",
        prompt: "Merge results",
        dependsOn: ["scan-a", "scan-b"],
      },
      { id: "report", prompt: "Final report", dependsOn: ["merge"] },
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0].sort()).toEqual(["scan-a", "scan-b"]);
    expect(groups[1]).toEqual(["merge"]);
    expect(groups[2]).toEqual(["report"]);
  });

  it("should support chapter merging in documents", async () => {
    const manager = new ChapterManager();
    const docPath = join(testDir, "doc.md");

    await writeFile(
      docPath,
      `# Project Design

## Background

Initial background.

## User Stories

<!-- pending -->
`
    );

    const newChapter = `## User Stories

As a user, I want to login.
As a user, I want to logout.`;

    const merged = await manager.mergeChapter(docPath, "User Stories", newChapter);

    expect(merged).toContain("Initial background");
    expect(merged).toContain("As a user, I want to login");
    expect(merged).toContain("As a user, I want to logout");
    expect(merged).not.toContain("<!-- pending -->");
  });

  it("should render subagent prompts with outputs", () => {
    const manager = new SubAgentManager();

    const prompt = `Generate final report:

Security Scan Results:
{{subAgents.security-scan.output}}

Performance Analysis:
{{subAgents.perf-analysis.output}}

Conclusion: Based on the above findings.`;

    const outputs = {
      "security-scan": "No vulnerabilities detected.",
      "perf-analysis": "Load time: 1.2s (good)",
    };

    const rendered = manager.renderPrompt(prompt, outputs);

    expect(rendered).toContain("No vulnerabilities detected");
    expect(rendered).toContain("Load time: 1.2s (good)");
    expect(rendered).toContain("Conclusion: Based on the above findings");
  });

  it("should get chapters by IDs", () => {
    const manager = new ChapterManager();

    const allChapters = [
      { id: "intro", title: "Introduction" },
      { id: "goals", title: "Goals" },
      { id: "design", title: "Design" },
      { id: "tasks", title: "Tasks" },
    ];

    const selected = manager.getChaptersByIds(allChapters, ["goals", "tasks"]);

    expect(selected).toHaveLength(2);
    expect(selected[0].id).toBe("goals");
    expect(selected[0].title).toBe("Goals");
    expect(selected[1].id).toBe("tasks");
    expect(selected[1].title).toBe("Tasks");
  });

  it("should detect circular dependencies in subagents", () => {
    const manager = new SubAgentManager();

    expect(() =>
      manager.resolveOrder([
        { id: "a", prompt: "A", dependsOn: ["b"] },
        { id: "b", prompt: "B", dependsOn: ["c"] },
        { id: "c", prompt: "C", dependsOn: ["a"] },
      ])
    ).toThrow("Circular");
  });

  it("should handle complex subagent dependency graph", () => {
    const manager = new SubAgentManager();

    const order = manager.resolveOrder([
      { id: "d", prompt: "D", dependsOn: ["b", "c"] },
      { id: "a", prompt: "A" },
      { id: "c", prompt: "C", dependsOn: ["a"] },
      { id: "b", prompt: "B", dependsOn: ["a"] },
      { id: "e", prompt: "E", dependsOn: ["d"] },
    ]);

    // a must come before b, c
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));

    // b, c must come before d
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));

    // d must come before e
    expect(order.indexOf("d")).toBeLessThan(order.indexOf("e"));
  });

  it("should preserve knowledge blocks when removeFromOutput is false", () => {
    const injector = new KnowledgeInjector(testDir);

    const content = `# Document

<knowledge id="ref">
This is a reference that should be kept.
</knowledge>

Main content here.`;

    const cleaned = injector.removeKnowledgeBlocks(content, [
      { id: "ref", source: "ref.md", removeFromOutput: false },
    ]);

    expect(cleaned).toContain("reference that should be kept");
    expect(cleaned).toContain("Main content here");
  });
});
