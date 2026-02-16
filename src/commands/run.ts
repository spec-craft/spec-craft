import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";
import inquirer from "inquirer";
import { WorkflowLoader } from "../core/WorkflowLoader";
import { StateManager } from "../core/StateManager";
import { DependencyResolver } from "../core/DependencyResolver";
import { CommandExecutor } from "../core/CommandExecutor";
import type { Workflow, WorkflowVariable, WorkflowCommand } from "../core/types";

export const runCommand = new Command("run")
  .description("运行工作流命令")
  .argument("<workflow>", "工作流目录路径")
  .argument("[command]", "命令名称")
  .option("-i, --instance <name>", "实例名称")
  .option("-f, --force", "强制重新执行", false)
  .option("-d, --work-dir <path>", "工作目录", ".")
  .option("--no-auto-deps", "不自动执行依赖命令")
  .action(async (workflowPath: string, command: string | undefined, options: { 
    instance?: string; 
    force: boolean; 
    workDir: string;
    autoDeps: boolean;
  }) => {
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
  options: { instance?: string; force: boolean; workDir: string; autoDeps: boolean }
): Promise<void> {
  const workDir = path.resolve(options.workDir);
  const absoluteWorkflowPath = path.resolve(workflowPath);
  
  // 1. 加载工作流定义
  const workflow = await loadWorkflow(absoluteWorkflowPath);
  console.log(`工作流: ${workflow.name} v${workflow.version}`);
  
  // 2. 验证工作流依赖
  const validation = DependencyResolver.validate(workflow);
  if (!validation.valid) {
    throw new Error(`工作流验证失败:\n${validation.errors.join("\n")}`);
  }
  
  // 3. 如果没有指定命令，显示可用命令
  if (!command) {
    showAvailableCommands(workflow);
    return;
  }
  
  // 4. 验证命令存在
  const cmd = workflow.commands[command];
  if (!cmd) {
    throw new Error(`命令 "${command}" 不存在。可用命令: ${Object.keys(workflow.commands).join(", ")}`);
  }
  
  // 5. 获取或创建实例名称
  const instanceName = options.instance || await promptInstanceName();
  console.log(`实例: ${instanceName}`);
  
  // 6. 初始化管理器
  const stateManager = new StateManager(workDir);
  const executor = new CommandExecutor(workDir);
  
  // 7. 获取或创建实例
  let instance = await stateManager.getInstance(workflow.name, instanceName);
  if (!instance) {
    // 收集变量
    const variables = await collectVariables(workflow.variables || {});
    instance = await stateManager.upsertInstance(workflow.name, instanceName, variables);
    console.log(`变量: ${JSON.stringify(instance.variables)}`);
  } else {
    console.log(`变量: ${JSON.stringify(instance.variables)} (已保存)`);
  }
  
  // 8. 如果使用 --force，使该命令及下游命令失效
  if (options.force) {
    const dependents = DependencyResolver.getAffectedCommands(workflow, command);
    if (dependents.length > 0) {
      console.log(`\n⚠️  强制重新执行将影响以下命令: ${dependents.join(", ")}`);
      await stateManager.invalidateCommand(workflow.name, instanceName, command, dependents);
    } else {
      await stateManager.resetCommandStatus(workflow.name, instanceName, command);
    }
  }
  
  // 9. 获取需要执行的命令链（包括依赖）
  const commandChain = DependencyResolver.getDependencyChain(workflow, command);
  const commandsToExecute = options.autoDeps 
    ? await filterCommandsToExecute(stateManager, workflow.name, instanceName, commandChain)
    : [command];
  
  if (commandsToExecute.length === 0) {
    console.log(`\n✅ 命令 "${command}" 已是最新状态，无需重新执行`);
    const status = await stateManager.getCommandStatus(workflow.name, instanceName, command);
    if (status?.output) {
      console.log(`输出: ${status.output}`);
    }
    return;
  }
  
  console.log(`\n将执行以下命令: ${commandsToExecute.join(" -> ")}`);
  
  // 10. 按顺序执行命令
  for (const cmdName of commandsToExecute) {
    await executeCommand(
      workflow, 
      cmdName, 
      absoluteWorkflowPath, 
      instance.variables, 
      instanceName,
      stateManager, 
      executor,
      workDir
    );
  }
  
  console.log(`\n✅ 所有命令执行完成`);
}

/**
 * 过滤出需要执行的命令
 */
async function filterCommandsToExecute(
  stateManager: StateManager,
  workflowName: string,
  instanceName: string,
  commandChain: string[]
): Promise<string[]> {
  const result: string[] = [];
  
  for (const cmdName of commandChain) {
    const status = await stateManager.getCommandStatus(workflowName, instanceName, cmdName);
    
    // 需要执行的情况：
    // 1. 从未执行过
    // 2. 状态为 pending 或 in_progress
    // 3. 状态为 needs-update
    // 4. 状态为 failed
    if (!status || 
        status.status === "pending" || 
        status.status === "in_progress" ||
        status.status === "needs-update" ||
        status.status === "failed") {
      result.push(cmdName);
    }
  }
  
  return result;
}

/**
 * 执行单个命令
 */
async function executeCommand(
  workflow: Workflow,
  commandName: string,
  workflowPath: string,
  variables: Record<string, string | boolean>,
  instanceName: string,
  stateManager: StateManager,
  executor: CommandExecutor,
  workDir: string
): Promise<void> {
  const cmd = workflow.commands[commandName];
  
  console.log(`\n▶ 执行命令: ${commandName}`);
  console.log(`  描述: ${cmd.description || "无"}`);
  
  // 检查依赖
  if (cmd.dependsOn && cmd.dependsOn.length > 0) {
    const { canExecute, reason } = await stateManager.canExecuteCommand(
      workflow.name, instanceName, commandName, cmd.dependsOn
    );
    if (!canExecute) {
      throw new Error(`无法执行命令 "${commandName}": ${reason}`);
    }
  }
  
  // 设置状态为 in_progress
  await stateManager.setCommandStatus(
    workflow.name, 
    instanceName, 
    commandName, 
    "in_progress"
  );
  
  try {
    // 执行命令
    const result = await executor.execute(cmd, variables, workflowPath);
    
    if (result.success) {
      // 更新状态为 completed
      await stateManager.setCommandStatus(
        workflow.name, 
        instanceName, 
        commandName, 
        "completed",
        { output: result.output }
      );
      
      console.log(`  ✅ 完成${result.output ? ` -> ${result.output}` : ""}`);
    } else {
      throw new Error(result.error || "执行失败");
    }
  } catch (error) {
    // 更新状态为 failed
    await stateManager.setCommandStatus(
      workflow.name, 
      instanceName, 
      commandName, 
      "failed",
      { error: error instanceof Error ? error.message : String(error) }
    );
    throw error;
  }
}

async function loadWorkflow(workflowPath: string): Promise<Workflow> {
  const stat = await fs.stat(workflowPath);
  
  if (stat.isDirectory()) {
    return WorkflowLoader.loadFromDir(workflowPath);
  } else {
    return WorkflowLoader.load(workflowPath);
  }
}

function showAvailableCommands(workflow: Workflow): void {
  console.log(`\n可用命令:`);
  
  const commandOrder = DependencyResolver.getExecutionOrder(workflow);
  
  for (const name of commandOrder) {
    const cmd = workflow.commands[name];
    const deps = cmd.dependsOn?.length ? ` (依赖: ${cmd.dependsOn.join(", ")})` : "";
    const autoRun = cmd.autoRunDeps !== false ? " [自动执行依赖]" : "";
    console.log(`  ${name}${deps} - ${cmd.description || "无描述"}${autoRun}`);
  }
  
  console.log(`\n使用方法: craft run <workflow> <command> -i <instance>`);
  console.log(`选项:`);
  console.log(`  --force         强制重新执行（包括下游命令）`);
  console.log(`  --no-auto-deps  不自动执行依赖命令`);
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
  
  const { value } = await inquirer.prompt([{
    type: "input",
    name: "value",
    message: config.prompt || config.description || `请输入 ${name}`,
    default: config.default as string
  }]);
  return value;
}
