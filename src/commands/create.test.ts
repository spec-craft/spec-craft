import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm, access, readFile } from "fs/promises";
import { join } from "path";
import {
  createCommandHandler,
  type CreateOptions,
} from "./create";

describe("create command", () => {
  const testDir = join(process.cwd(), ".test-create");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create workflow from options (non-interactive)", async () => {
    const options: CreateOptions = {
      name: "bug-triage",
      description: "Bug triage workflow",
      variables: [
        {
          name: "bugId",
          type: "string",
          required: true,
          description: "Bug ID",
        },
      ],
      commands: [
        { name: "init", description: "Initialize", type: "template" },
        { name: "triage", description: "Triage bug", type: "interactive" },
        { name: "fix", description: "Fix bug", type: "execution" },
      ],
    };

    await createCommandHandler(options, testDir);

    // Check files exist
    const workflowDir = join(testDir, "bug-triage");
    await access(join(workflowDir, "workflow.yaml")); // Will throw if not exists
    await access(join(workflowDir, "SKILL.md"));
    await access(join(workflowDir, "templates"));

    // Check workflow.yaml content
    const yamlContent = await readFile(
      join(workflowDir, "workflow.yaml"),
      "utf-8"
    );
    expect(yamlContent).toContain("name: bug-triage");
    expect(yamlContent).toContain("bugId");
    expect(yamlContent).toContain("init:");
    expect(yamlContent).toContain("triage:");
    expect(yamlContent).toContain("fix:");
  });

  it("should create SKILL.md with correct content", async () => {
    const options: CreateOptions = {
      name: "my-workflow",
      description: "A custom workflow",
      variables: [],
      commands: [
        { name: "start", description: "Start the workflow", type: "template" },
      ],
    };

    await createCommandHandler(options, testDir);

    const skillContent = await readFile(
      join(testDir, "my-workflow", "SKILL.md"),
      "utf-8"
    );
    expect(skillContent).toContain("# my-workflow");
    expect(skillContent).toContain("A custom workflow");
    expect(skillContent).toContain("craft run my-workflow start");
  });

  it("should throw if workflow already exists", async () => {
    await mkdir(join(testDir, "existing"), { recursive: true });

    const options: CreateOptions = {
      name: "existing",
      description: "Existing",
      variables: [],
      commands: [{ name: "init", description: "Init", type: "template" }],
    };

    await expect(createCommandHandler(options, testDir)).rejects.toThrow(
      "already exists"
    );
  });

  it("should create template files for template commands", async () => {
    const options: CreateOptions = {
      name: "with-templates",
      description: "Workflow with templates",
      variables: [{ name: "topic", type: "string", required: true }],
      commands: [
        {
          name: "init",
          description: "Initialize",
          type: "template",
        },
        {
          name: "review",
          description: "Review",
          type: "interactive",
        },
      ],
    };

    await createCommandHandler(options, testDir);

    // Template command should have a template file
    const templatePath = join(
      testDir,
      "with-templates",
      "templates",
      "init.md"
    );
    await access(templatePath); // Will throw if not exists

    const templateContent = await readFile(templatePath, "utf-8");
    expect(templateContent).toContain("{{topic}}");
  });
});
