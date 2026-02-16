import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { SchemaValidator } from "../../src/core/SchemaValidator";
import { WorkflowLoader } from "../../src/core/WorkflowLoader";
import { formatError } from "../../src/utils/errorHandler";
import { WorkflowNotFoundError, ValidationError } from "../../src/errors";

describe("Integration: Phase 4 - Polish & Templates", () => {
  const testDir = join(process.cwd(), ".test-phase4");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should validate all built-in templates with SchemaValidator", async () => {
    const validator = new SchemaValidator();
    const templates = [
      "brainstorm",
      "feature-dev",
      "api-design",
      "bug-fix",
      "quick-prototype",
    ];

    for (const tpl of templates) {
      const wf = await WorkflowLoader.loadFromDir(
        join(__dirname, "../../src/templates", tpl)
      );
      const result = validator.validateWorkflow(wf);
      expect(
        result.valid,
        `Template "${tpl}" should be valid: ${result.errors.join(", ")}`
      ).toBe(true);
    }
  });

  it("should reject invalid workflow with detailed schema errors", async () => {
    const workflowDir = join(testDir, "bad-workflow");
    await mkdir(workflowDir);
    await writeFile(
      join(workflowDir, "workflow.yaml"),
      `
version: 1.0.0
commands: {}
`
    );

    try {
      await WorkflowLoader.loadFromDir(workflowDir);
      expect.unreachable("Should have thrown");
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain("name");
      expect(message).toContain("commands");
    }
  });

  it("should provide user-friendly error messages", () => {
    const err = new WorkflowNotFoundError("nonexistent", "/path");
    const formatted = formatError(err);

    expect(formatted).toContain("WORKFLOW_NOT_FOUND");
    expect(formatted).toContain("nonexistent");
    expect(formatted).toContain("Hint");
  });

  it("should format validation errors with multiple issues", () => {
    const err = new ValidationError([
      "name is required",
      "commands must have at least one command",
    ]);
    const formatted = formatError(err);

    expect(formatted).toContain("VALIDATION_ERROR");
    expect(formatted).toContain("name is required");
    expect(formatted).toContain("commands must have at least one command");
  });

  it("should validate workflow with Phase 3 features", () => {
    const validator = new SchemaValidator();

    const result = validator.validateWorkflow({
      name: "advanced-workflow",
      version: "1.0.0",
      commands: {
        design: {
          type: "template",
          template: "templates/design.md",
          output: "specs/design.md",
          chapters: [
            { id: "bg", title: "Background" },
            { id: "req", title: "Requirements" },
          ],
          chapterGroups: [{ name: "phase-1", chapters: ["bg", "req"] }],
          injectKnowledge: [
            { id: "standards", source: "knowledge/standards.md" },
          ],
          subAgents: [
            { id: "security-check", prompt: "Check security" },
            { id: "perf-check", prompt: "Check performance" },
          ],
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it("should validate all 5 built-in templates exist and are loadable", async () => {
    const templates = [
      "brainstorm",
      "feature-dev",
      "api-design",
      "bug-fix",
      "quick-prototype",
    ];

    for (const tpl of templates) {
      const templatePath = join(__dirname, "../../src/templates", tpl);
      const wf = await WorkflowLoader.loadFromDir(templatePath);

      expect(wf.name).toBe(tpl);
      expect(wf.version).toBeDefined();
      expect(Object.keys(wf.commands).length).toBeGreaterThan(0);
    }
  });
});
