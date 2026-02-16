import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";
import inquirer from "inquirer";
import { WorkflowLoader } from "../core/WorkflowLoader";
import { StateManager } from "../core/StateManager";
import { TemplateRenderer } from "../core/TemplateRenderer";
import type { Workflow, WorkflowVariable } from "../core/types";

export const runCommand = new Command("run")
  .description("运行工作流命令")
  .argument("<workflow>", "工作流目录路径")
  .argument("[command]", "命令名称")
  .option("-i, --instance <name>", "实例名称")
  .option("-f, --force", "强制重新执行", false)
  .option("-d, --work-dir <path>", "工作目录", ".")
  .action(async (workflowPath: string, command: string | undefined, options: { instance?: string; force: boolean; workDir: string }) => {
    try {
      await executeRun(workflowPath, command, options);
    } catch (error) {
      console.error(`错误: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

async function executeRun(
  workflowPath: string,
  command: string | undefined,
  options: { instance?: string; force: boolean; workDir: string }
): Promise<void> {
  const workDir = path.resolve(options.workDir);
  const absoluteWorkflowPath = path.resolve(workflowPath);
  
  // 1. 加载工作流定义
  const workflow = await loadWorkflow(absoluteWorkflowPath);
  console.log(`工作流: ${workflow.name} v${workflow.version}`);
  
  // 2. 如果没有指定命令，显示可用命令
  if (!command) {
    showAvailableCommands(workflow);
    return;
  }
  
  // 3. 验证命令存在
  const cmd = workflow.commands[command];
  if (!cmd) {
    throw new Error(`命令 "${command}" 不存在。可用命令: ${Object.keys(workflow.commands).join(", ")}`);
  }
  
  // 4. 获取或创建实例名称
  const instanceName = options.instance || await promptInstanceName();
  console.log(`实例: ${instanceName}`);
  
  // 5. 初始化状态管理器
  const stateManager = new StateManager(workDir);
  
  // 6. 获取或创建实例
  let instance = await stateManager.getInstance(workflow.name, instanceName);
  if (!instance) {
    // 收集变量
    const variables = await collectVariables(workflow.variables || {});
    instance = await stateManager.upsertInstance(workflow.name, instanceName, variables);
    console.log(`变量: ${JSON.stringify(instance.variables)}`);
  } else {
    console.log(`变量: ${JSON.stringify(instance.variables)} (已保存)`);
  }
  
  // 7. 检查命令是否已完成
  const currentStatus = await stateManager.getCommandStatus(workflow.name, instanceName, command);
  if (currentStatus?.status === "completed" && !options.force) {
    console.log(`\n命令 "${command}" 已完成。`);
    console.log(`输出: ${currentStatus.output}`);
    console.log(`使用 --force 强制重新执行`);
    return;
  }
  
  // 8. 检查依赖
  if (cmd.dependsOn && cmd.dependsOn.length > 0) {
    const { canExecute, reason } = await stateManager.canExecuteCommand(
      workflow.name, instanceName, command, cmd.dependsOn
    );
    if (!canExecute) {
      throw new Error(`无法执行命令 "${command}": ${reason}`);
    }
  }
  
  // 9. 设置命令状态为 in_progress
  await stateManager.setCommandStatus(workflow.name, instanceName, command, "in_progress");
  console.log(`\n执行命令: ${command}`);
  console.log(`描述: ${cmd.description || "无"}`);
  
  try {
    // 10. 执行命令
    if (cmd.type === "template" && cmd.template && cmd.output) {
      const outputPath = await executeTemplateCommand(
        absoluteWorkflowPath, 
        { template: cmd.template, output: cmd.output }, 
        instance.variables, 
        workDir
      );
      
      // 11. 更新状态为 completed
      await stateManager.setCommandStatus(workflow.name, instanceName, command, "completed", {
        output: outputPath
      });
      
      console.log(`\n✅ 命令 "${command}" 执行完成`);
      console.log(`输出: ${outputPath}`);
    } else {
      // 其他命令类型暂不支持
      throw new Error(`命令类型 "${cmd.type}" 暂不支持`);
    }
  } catch (error) {
    // 更新状态为 failed
    await stateManager.setCommandStatus(workflow.name, instanceName, command, "failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function loadWorkflow(workflowPath: string): Promise<Workflow> {
  // 检查是文件还是目录
  const stat = await fs.stat(workflowPath);
  
  if (stat.isDirectory()) {
    return WorkflowLoader.loadFromDir(workflowPath);
  } else {
    return WorkflowLoader.load(workflowPath);
  }
}

function showAvailableCommands(workflow: Workflow): void {
  console.log(`\n可用命令:`);
  
  const commandOrder = WorkflowLoader.getAllCommandsOrder(workflow);
  
  for (const name of commandOrder) {
    const cmd = workflow.commands[name];
    const deps = cmd.dependsOn?.length ? ` (依赖: ${cmd.dependsOn.join(", ")})` : "";
    console.log(`  ${name}${deps} - ${cmd.description || "无描述"}`);
  }
  
  console.log(`\n使用方法: craft run <workflow> <command> -i <instance>`);
}

async function promptInstanceName(): Promise<string> {
  const { instance } = await inquirer.prompt([{
    type: "input",
    name: "instance",
    message: "请输入实例名称",
    default: "default"
  }]);
  return instance;
}

async function collectVariables(
  variables: Record<string, WorkflowVariable>
): Promise<Record<string, string | boolean>> {
  const result: Record<string, string | boolean> = {};
  
  for (const [name, config] of Object.entries(variables)) {
    const value = await promptVariable(name, config);
    result[name] = value;
  }
  
  return result;
}

async function promptVariable(
  name: string,
  config: WorkflowVariable
): Promise<string | boolean> {
  if (config.type === "boolean") {
    const { value } = await inquirer.prompt([{
      type: "confirm",
      name: "value",
      message: config.prompt || config.description || `请输入 ${name}`,
      default: config.default as boolean
    }]);
    return value;
  }
  
  if (config.type === "select" && config.options) {
    const { value } = await inquirer.prompt([{
      type: "list",
      name: "value",
      message: config.prompt || config.description || `请选择 ${name}`,
      choices: config.options,
      default: config.default as string
    }]);
    return value;
  }
  
  // string 类型
  const { value } = await inquirer.prompt([{
    type: "input",
    name: "value",
    message: config.prompt || config.description || `请输入 ${name}`,
    default: config.default as string
  }]);
  return value;
}

async function executeTemplateCommand(
  workflowPath: string,
  cmd: { template: string; output: string },
  variables: Record<string, string | boolean>,
  workDir: string
): Promise<string> {
  // 解析模板路径（相对于工作流目录）
  const templatePath = path.join(workflowPath, cmd.template);
  
  // 检查模板文件存在
  if (!(await fs.pathExists(templatePath))) {
    throw new Error(`模板文件不存在: ${templatePath}`);
  }
  
  // 渲染模板
  const content = await TemplateRenderer.renderFile(templatePath, variables);
  
  // 渲染输出路径
  const relativeOutput = TemplateRenderer.renderPath(cmd.output, variables);
  const absoluteOutput = path.join(workDir, relativeOutput);
  
  // 确保输出目录存在
  await fs.ensureDir(path.dirname(absoluteOutput));
  
  // 写入文件
  await fs.writeFile(absoluteOutput, content);
  
  return relativeOutput;
}
