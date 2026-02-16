/**
 * 工作流定义类型
 */

// 命令类型
export type CommandType = "template" | "execution" | "query" | "interactive";

// 执行配置（type: execution）
export interface ExecutionConfig {
  command?: string;
  mode?: "full" | "incremental";
  failFast?: boolean;
  coverage?: boolean;
}

// 检查项配置（type: query）
export interface QueryCheck {
  id: string;
  description?: string;
}

// 上下文管理配置
export interface ContextManagement {
  tokenThreshold?: number;
  roundThreshold?: number;
}

// 工作流变量定义
export interface WorkflowVariable {
  type: "string" | "select" | "boolean";
  required?: boolean;
  default?: string | boolean;
  options?: string[];
  description?: string;
  prompt?: string;
}

// 工作流命令定义
export interface WorkflowCommand {
  type: CommandType;
  description?: string;
  
  // template 类型
  template?: string;
  output?: string;
  
  // execution 类型
  execution?: ExecutionConfig;
  
  // query 类型
  checks?: string[] | QueryCheck[];
  
  // 依赖关系
  dependsOn?: string[];
  autoRunDeps?: boolean;
}

// 工作流定义
export interface Workflow {
  name: string;
  version: string;
  description?: string;
  variables?: Record<string, WorkflowVariable>;
  commands: Record<string, WorkflowCommand>;
  contextManagement?: ContextManagement;
}

// Marketplace 配置
export interface MarketplaceConfig {
  name: string;
  description?: string;
  version?: string;
  workflows?: string[];
}

// 命令类型守卫
export function isTemplateCommand(cmd: WorkflowCommand): cmd is WorkflowCommand & { template: string; output: string } {
  return cmd.type === "template" && !!cmd.template && !!cmd.output;
}

export function isExecutionCommand(cmd: WorkflowCommand): cmd is WorkflowCommand & { execution: ExecutionConfig } {
  return cmd.type === "execution";
}

export function isQueryCommand(cmd: WorkflowCommand): cmd is WorkflowCommand & { checks: string[] | QueryCheck[] } {
  return cmd.type === "query" && !!cmd.checks;
}

export function isInteractiveCommand(cmd: WorkflowCommand): cmd is WorkflowCommand {
  return cmd.type === "interactive";
}
