/**
 * 工作流定义类型
 */

export interface WorkflowVariable {
  type: "string" | "select" | "boolean";
  required?: boolean;
  default?: string | boolean;
  options?: string[];
  description?: string;
  prompt?: string;
}

export interface WorkflowCommand {
  type: "template" | "execution" | "query" | "interactive";
  description?: string;
  template?: string;
  output?: string;
  dependsOn?: string[];
  autoRunDeps?: boolean;
}

export interface Workflow {
  name: string;
  version: string;
  description?: string;
  variables?: Record<string, WorkflowVariable>;
  commands: Record<string, WorkflowCommand>;
}

export interface MarketplaceConfig {
  name: string;
  description?: string;
  version?: string;
  workflows?: string[];
}
