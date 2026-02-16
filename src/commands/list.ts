import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";
import { WorkflowLoader } from "../core/WorkflowLoader";

export interface WorkflowSummary {
  name: string;
  version: string;
  description?: string;
  commands: string[];
  path: string;
}

export const listCommand = new Command("list")
  .description("列出所有工作流")
  .option("-d, --directory <dir>", "Marketplace 目录", ".")
  .action(async (options: { directory: string }) => {
    try {
      const workflows = await listCommandHandler(options.directory);

      if (workflows.length === 0) {
        console.log("未找到任何工作流。");
        return;
      }

      console.log("\n可用的工作流:\n");
      for (const wf of workflows) {
        console.log(`  ${wf.name} (v${wf.version})`);
        if (wf.description) {
          console.log(`    ${wf.description}`);
        }
        console.log(`    命令: ${wf.commands.join(", ")}`);
        console.log();
      }
    } catch (error) {
      console.error(`错误: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

export async function listCommandHandler(marketplacePath: string): Promise<WorkflowSummary[]> {
  const absolutePath = path.resolve(marketplacePath);
  
  // 检查目录是否存在
  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(`目录不存在: ${absolutePath}`);
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const workflows: WorkflowSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const workflowPath = path.join(absolutePath, entry.name);
    const yamlPath = path.join(workflowPath, "workflow.yaml");

    // 检查是否存在 workflow.yaml
    if (!(await fs.pathExists(yamlPath))) {
      continue;
    }

    try {
      const workflow = await WorkflowLoader.loadFromDir(workflowPath);
      workflows.push({
        name: workflow.name,
        version: workflow.version,
        description: workflow.description,
        commands: Object.keys(workflow.commands),
        path: workflowPath
      });
    } catch (error) {
      // 跳过无效的工作流
      console.warn(`警告: 跳过无效工作流 ${entry.name}: ${error instanceof Error ? error.message : error}`);
    }
  }

  return workflows;
}
