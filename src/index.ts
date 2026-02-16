/**
 * SpecCraft CLI
 * Spec Creator - 帮团队创建和管理 spec-driven 工作流的工具
 */

export const VERSION = "0.1.0";
export const NAME = "@speccraft/cli";

// Commands
export * from "./commands/init";
export * from "./commands/copy";
export * from "./commands/create";
export * from "./commands/run";
export * from "./commands/list";
export * from "./commands/show";

// Core modules
export { WorkflowLoader } from "./core/WorkflowLoader";
export { CommandExecutor } from "./core/CommandExecutor";
export { StateManager } from "./core/StateManager";
export { TemplateRenderer } from "./core/TemplateRenderer";
export { DependencyResolver } from "./core/DependencyResolver";
export { VariablePrompter } from "./core/VariablePrompter";

// Phase 3 modules
export { ChapterManager } from "./core/ChapterManager";
export { KnowledgeInjector } from "./core/KnowledgeInjector";
export { SubAgentManager } from "./core/SubAgentManager";

// Types
export type * from "./core/types";
export type * from "./core/state-types";
export type * from "./types/chapter";
