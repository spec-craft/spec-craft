export class SpecCraftError extends Error {
  code: string;
  hint?: string;

  constructor(message: string, code: string, hint?: string) {
    super(message);
    this.name = "SpecCraftError";
    this.code = code;
    this.hint = hint;
  }

  format(): string {
    const lines = [`Error [${this.code}]: ${this.message}`];
    if (this.hint) {
      lines.push(`Hint: ${this.hint}`);
    }
    return lines.join("\n");
  }
}

export class WorkflowNotFoundError extends SpecCraftError {
  constructor(workflowName: string, searchPath: string) {
    super(
      `Workflow "${workflowName}" not found at ${searchPath}`,
      "WORKFLOW_NOT_FOUND",
      `Make sure the workflow directory exists and contains a workflow.yaml file. ` +
        `Run "craft list" to see available workflows.`
    );
    this.name = "WorkflowNotFoundError";
  }
}

export class CommandNotFoundError extends SpecCraftError {
  constructor(
    commandName: string,
    workflowName: string,
    availableCommands: string[]
  ) {
    super(
      `Command "${commandName}" not found in workflow "${workflowName}"`,
      "COMMAND_NOT_FOUND",
      `Available commands: ${availableCommands.join(", ")}`
    );
    this.name = "CommandNotFoundError";
  }
}

export class ValidationError extends SpecCraftError {
  constructor(errors: string[]) {
    super(
      `Workflow validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
      "VALIDATION_ERROR",
      "Check your workflow.yaml against the schema specification."
    );
    this.name = "ValidationError";
  }
}

export class DependencyError extends SpecCraftError {
  constructor(command: string, unmetDeps: string[]) {
    super(
      `Command "${command}" has unmet dependencies`,
      "DEPENDENCY_ERROR",
      `Run these commands first: ${unmetDeps.join(" -> ")}\n` +
        `Or use --auto to execute them automatically.`
    );
    this.name = "DependencyError";
  }
}

export class StateError extends SpecCraftError {
  constructor(message: string, workflow: string, instance: string) {
    super(
      `${message} (workflow: ${workflow}, instance: ${instance})`,
      "STATE_ERROR",
      `Check state directory at .craft/state/${workflow}/${instance}.yaml`
    );
    this.name = "StateError";
  }
}
