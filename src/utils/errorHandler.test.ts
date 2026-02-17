import { describe, it, expect } from "bun:test";
import { formatError } from "./errorHandler";
import {
  WorkflowNotFoundError,
  ValidationError,
} from "../errors";

describe("errorHandler", () => {
  it("should format SpecCraftError with hint", () => {
    const err = new WorkflowNotFoundError("brainstorm", "/tmp/wf");
    const output = formatError(err);

    expect(output).toContain("WORKFLOW_NOT_FOUND");
    expect(output).toContain("brainstorm");
    expect(output).toContain("Hint");
  });

  it("should format ValidationError with multiple errors", () => {
    const err = new ValidationError([
      "name is required",
      "commands is empty",
    ]);
    const output = formatError(err);

    expect(output).toContain("VALIDATION_ERROR");
    expect(output).toContain("name is required");
    expect(output).toContain("commands is empty");
  });

  it("should format generic Error", () => {
    const err = new Error("Something went wrong");
    const output = formatError(err);

    expect(output).toContain("Something went wrong");
  });

  it("should format unknown error", () => {
    const output = formatError("string error");
    expect(output).toContain("unexpected error");
  });
});
