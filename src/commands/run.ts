import { Command } from "commander";

export const runCommand = new Command("run")
  .description("运行工作流命令")
  .argument("<workflow>", "工作流名称")
  .argument("[command]", "命令名称")
  .option("-i, --instance <name>", "实例名称")
  .option("-f, --force", "强制重新执行", false)
  .action(async (workflow: string, command: string | undefined, options: { instance?: string; force: boolean }) => {
    console.log(`[TODO] craft run: 运行工作流 "${workflow}" 命令 "${command || 'default'}"`);
    console.log(`  instance: ${options.instance || 'default'}`);
    console.log(`  force: ${options.force}`);
    // TODO: 实现 run 命令
  });
