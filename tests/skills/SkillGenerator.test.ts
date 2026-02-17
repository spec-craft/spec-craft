import { describe, it, expect } from "bun:test";
import { SkillGenerator } from "../../src/core/SkillGenerator";
import type { SkillGenerationOptions, SkillSection } from "../../src/core/SkillGenerator";
import type { Workflow } from "../../src/core/types";

describe("SkillGenerator - Types", () => {
  it("should accept valid SkillGenerationOptions", () => {
    const options: SkillGenerationOptions = {
      workflow: {
        name: "test-workflow",
        version: "1.0.0",
        description: "Test",
        variables: {},
        commands: {}
      },
      outputPath: "/tmp/test.md",
      templateType: "standard"
    };

    expect(options.templateType).toBe("standard");
  });
});

describe("SkillGenerator - Front Matter", () => {
  it("should generate front matter with name and description", () => {
    const workflow: Workflow = {
      name: "test-workflow",
      version: "1.0.0",
      description: "Test workflow description",
      variables: {},
      commands: {}
    };

    const frontMatter = (SkillGenerator as any)['generateFrontMatter'](workflow);

    expect(frontMatter).toContain("name: speccraft:test-workflow");
    expect(frontMatter).toContain("description: Test workflow description");
    expect(frontMatter).toContain("---");
  });
});

describe("SkillGenerator - Commands", () => {
  it("should generate commands section with all commands", () => {
    const workflow: Workflow = {
      name: "test-workflow",
      version: "1.0.0",
      description: "Test",
      variables: {},
      commands: {
        init: {
          type: "template",
          description: "Initialize workflow",
          template: "templates/init.md",
          output: "output/init.md"
        },
        run: {
          type: "execution",
          description: "Run the workflow",
          dependsOn: ["init"]
        }
      }
    };

    const commands = (SkillGenerator as any)['generateCommands'](workflow);

    expect(commands).toContain("## Commands");
    expect(commands).toContain("### init - Initialize workflow");
    expect(commands).toContain("**Type:** template");
    expect(commands).toContain("### run - Run the workflow");
    expect(commands).toContain("**Type:** execution");
    expect(commands).toContain("**Dependencies:** init");
    expect(commands).toContain("craft run test-workflow init");
    expect(commands).toContain("craft run test-workflow run");
  });
});

describe("SkillGenerator - Variables", () => {
  it("should generate variables section", () => {
    const workflow: Workflow = {
      name: "test",
      version: "1.0.0",
      description: "Test",
      variables: {
        feature: {
          type: "string",
          required: true,
          description: "Feature name"
        },
        priority: {
          type: "select",
          options: ["P0", "P1", "P2"],
          default: "P2",
          description: "Priority level"
        }
      },
      commands: {}
    };

    const variables = (SkillGenerator as any)['generateVariables'](workflow);

    expect(variables).toContain("## Variables");
    expect(variables).toContain("**feature** (string)");
    expect(variables).toContain("Required");
    expect(variables).toContain("Feature name");
    expect(variables).toContain("**priority** (select)");
    expect(variables).toContain("Priority level");
  });

  it("should handle workflows with no variables", () => {
    const workflow: Workflow = {
      name: "test",
      version: "1.0.0",
      description: "Test",
      variables: {},
      commands: {}
    };

    const variables = (SkillGenerator as any)['generateVariables'](workflow);

    expect(variables).toBe("");
  });
});

describe("SkillGenerator - Complete Generation", () => {
  it("should generate complete SKILL.md", async () => {
    const workflow: Workflow = {
      name: "test-workflow",
      version: "1.0.0",
      description: "Test workflow for testing",
      variables: {
        topic: {
          type: "string",
          required: true,
          description: "Topic name"
        }
      },
      commands: {
        init: {
          type: "template",
          description: "Initialize",
          template: "templates/init.md",
          output: "output/init.md"
        },
        done: {
          type: "template",
          description: "Complete",
          template: "templates/done.md",
          output: "output/done.md",
          dependsOn: ["init"]
        }
      }
    };

    const content = await SkillGenerator.generate({
      workflow,
      outputPath: "/tmp/test.md",
      templateType: "standard"
    });

    // Front matter
    expect(content).toContain("---");
    expect(content).toContain("name: speccraft:test-workflow");
    expect(content).toContain("description: Test workflow for testing");

    // Title
    expect(content).toContain("# test-workflow");

    // Commands
    expect(content).toContain("## Commands");
    expect(content).toContain("### init - Initialize");
    expect(content).toContain("### done - Complete");

    // Variables
    expect(content).toContain("## Variables");
    expect(content).toContain("**topic**");

    // Usage
    expect(content).toContain("## Usage");
  });
});
