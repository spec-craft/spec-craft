import { Command } from "commander";
import * as path from "path";
import { WorkflowLoader } from "../core/WorkflowLoader";
import type { Workflow } from "../core/types";

export interface WorkflowDetail {
  name: string;
  version: string;
  description?: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    default?: string | boolean;
    options?: string[];
  }>;
  commands: Array<{
    name: string;
    description?: string;
    type: string;
    dependsOn?: string[];
  }>;
}

export const showCommand = new Command("show")
  .description("显示工作流详情")
  .argument("<workflow>", "工作流名称或路径")
  .action(async (workflow: string) => {
    try {
      const workflowPath = path.resolve(workflow);
      const detail = await showCommandHandler(workflowPath);

      console.log(`\n${detail.name} v${detail.version}`);
      if (detail.description) {
        console.log(`  ${detail.description}`);
      }

      if (detail.variables.length > 0) {
        console.log("\n变量:");
        for (const v of detail.variables) {
          const req = v.required ? " (必填)" : "";
          const def = v.default !== undefined ? ` [默认: ${v.default}]` : "";
          console.log(`  ${v.name}: ${v.type}${req}${def}`);
          if (v.description) {
            console.log(`    ${v.description}`);
          }
          if (v.options && v.options.length > 0) {
            console.log(`    选项: ${v.options.join(", ")}`);
          }
        }
      }

      console.log("\n命令:");
      for (const cmd of detail.commands) {
        const deps = cmd.dependsOn && cmd.dependsOn.length > 0 
          ? ` [依赖: ${cmd.dependsOn.join(", ")}]` 
          : "";
        const desc = cmd.description || "无描述";
        console.log(`  ${cmd.name} (${cmd.type}) - ${desc}${deps}`);
      }
      console.log();
    } catch (error) {
      console.error(`错误: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

export async function showCommandHandler(workflowPath: string): Promise<WorkflowDetail> {
  const workflow = await WorkflowLoader.loadFromDir(workflowPath);

  const variables = Object.entries(workflow.variables ?? {}).map(([name, v]) => ({
    name,
    type: v.type,
    required: v.required ?? false,
    description: v.description,
    default: v.default,
    options: v.options
  }));

  const commands = Object.entries(workflow.commands).map(([name, cmd]) => ({
    name,
    description: cmd.description,
    type: cmd.type,
    dependsOn: cmd.dependsOn
  }));

  return {
    name: workflow.name,
    version: workflow.version,
    description: workflow.description,
    variables,
    commands
  };
}
