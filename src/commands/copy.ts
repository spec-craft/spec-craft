import { Command } from "commander";

export const copyCommand = new Command("copy")
  .description("从内置模板复制工作流")
  .argument("<template>", "模板名称 (如: brainstorm, feature-dev)")
  .argument("[dest]", "目标路径", ".")
  .action(async (template: string, dest: string) => {
    console.log(`[TODO] craft copy: 从模板 "${template}" 复制到 ${dest}`);
    // TODO: 实现 copy 命令
  });
