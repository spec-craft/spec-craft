/**
 * 状态管理类型
 */

export type CommandStatus = "pending" | "in_progress" | "completed" | "failed" | "needs-update";

export interface CommandState {
  status: CommandStatus;
  completedAt?: string;
  startedAt?: string;
  output?: string;
  error?: string;
}

export interface WorkflowInstanceState {
  instance: string;
  workflow: string;
  createdAt: string;
  updatedAt: string;
  variables: Record<string, string | boolean>;
  commands: Record<string, CommandState>;
}

export interface StateFile {
  version: string;
  instances: Record<string, WorkflowInstanceState>;
}
