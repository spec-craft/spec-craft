import { Command } from "commander";

export const initCommand = new Command("init")
  .description("创建新的 marketplace")
  .argument("[name]", "marketplace 名称", "my-spec-workflows")
  .option("-p, --path <path>", "创建路径", ".")
  .action(async (name: string, options: { path: string }) => {
    console.log(`[TODO] craft init: 创建 marketplace "${name}" 在路径 ${options.path}`);
    // TODO: 实现 init 命令
  });
