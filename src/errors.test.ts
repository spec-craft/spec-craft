import { describe, it, expect } from "bun:test";
import {
  SpecCraftError,
  WorkflowNotFoundError,
  CommandNotFoundError,
  ValidationError,
  DependencyError,
  StateError,
} from "./errors";

describe("Error Hierarchy", () => {
  it("should create WorkflowNotFoundError", () => {
    const err = new WorkflowNotFoundError("brainstorm", "/path/to/wf");
    expect(err).toBeInstanceOf(SpecCraftError);
    expect(err).toBeInstanceOf(WorkflowNotFoundError);
    expect(err.message).toContain("brainstorm");
    expect(err.code).toBe("WORKFLOW_NOT_FOUND");
    expect(err.hint).toBeDefined();
  });

  it("should create CommandNotFoundError", () => {
    const err = new CommandNotFoundError("unknown", "brainstorm", [
      "init",
      "next",
      "done",
    ]);
    expect(err).toBeInstanceOf(SpecCraftError);
    expect(err.message).toContain("unknown");
    expect(err.code).toBe("COMMAND_NOT_FOUND");
    expect(err.hint).toContain("init");
  });

  it("should create ValidationError", () => {
    const err = new ValidationError([
      "name is required",
      "commands is empty",
    ]);
    expect(err.message).toContain("name is required");
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("should create DependencyError", () => {
    const err = new DependencyError("tasks", ["init", "spec", "design"]);
    expect(err.message).toContain("tasks");
    expect(err.code).toBe("DEPENDENCY_ERROR");
    expect(err.hint).toContain("init");
  });

  it("should create StateError", () => {
    const err = new StateError("Instance not found", "brainstorm", "my-topic");
    expect(err.code).toBe("STATE_ERROR");
  });

  it("should format user-friendly error output", () => {
    const err = new CommandNotFoundError("xyz", "brainstorm", [
      "init",
      "next",
    ]);
    const formatted = err.format();
    expect(formatted).toContain("Error");
    expect(formatted).toContain("xyz");
    expect(formatted).toContain("Hint");
  });
});
