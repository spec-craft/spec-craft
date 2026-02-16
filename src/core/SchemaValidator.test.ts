import { describe, it, expect } from "bun:test";
import { SchemaValidator } from "./SchemaValidator";

describe("SchemaValidator", () => {
  const validator = new SchemaValidator();

  it("should validate a correct minimal workflow", () => {
    const result = validator.validateWorkflow({
      name: "test",
      version: "1.0.0",
      commands: {
        init: { description: "Initialize" },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate a full workflow with all fields", () => {
    const result = validator.validateWorkflow({
      name: "feature-dev",
      version: "1.0.0",
      description: "Feature development",
      variables: {
        feature: {
          type: "string",
          required: true,
          description: "Feature name",
          prompt: "Enter feature name",
        },
        priority: {
          type: "select",
          options: ["P0", "P1", "P2"],
          default: "P1",
        },
      },
      commands: {
        init: {
          type: "template",
          description: "Init",
          template: "templates/init.md",
          output: "specs/{{feature}}/init.md",
        },
        implement: {
          type: "execution",
          description: "Implement",
          dependsOn: ["init"],
          execution: {
            command: "npm test",
            mode: "incremental",
            failFast: true,
          },
        },
        status: {
          type: "query",
          description: "Status",
          checks: ["spec-completeness"],
        },
        brainstorm: {
          type: "interactive",
          description: "Explore ideas",
        },
      },
    });

    expect(result.valid).toBe(true);
  });

  it("should reject workflow without name", () => {
    const result = validator.validateWorkflow({
      version: "1.0.0",
      commands: { init: { description: "Init" } },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("name");
  });

  it("should reject workflow without version", () => {
    const result = validator.validateWorkflow({
      name: "test",
      commands: { init: { description: "Init" } },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("should reject workflow without commands", () => {
    const result = validator.validateWorkflow({
      name: "test",
      version: "1.0.0",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("commands"))).toBe(true);
  });

  it("should reject invalid variable type", () => {
    const result = validator.validateWorkflow({
      name: "test",
      version: "1.0.0",
      variables: {
        bad: { type: "invalid_type" },
      },
      commands: { init: { description: "Init" } },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("type"))).toBe(true);
  });

  it("should reject invalid command type", () => {
    const result = validator.validateWorkflow({
      name: "test",
      version: "1.0.0",
      commands: {
        init: { description: "Init", type: "invalid_type" },
      },
    });

    expect(result.valid).toBe(false);
  });

  it("should provide user-friendly error messages", () => {
    const result = validator.validateWorkflow({});

    expect(result.valid).toBe(false);
    // Should have clear, human-readable messages
    for (const error of result.errors) {
      expect(typeof error).toBe("string");
      expect(error.length).toBeGreaterThan(0);
    }
  });

  it("should validate marketplace.json", () => {
    const result = validator.validateMarketplace({
      name: "my-marketplace",
      version: "1.0.0",
      description: "My marketplace",
      workflows: [],
    });

    expect(result.valid).toBe(true);
  });

  it("should reject invalid marketplace.json", () => {
    const result = validator.validateMarketplace({});

    expect(result.valid).toBe(false);
  });
});
