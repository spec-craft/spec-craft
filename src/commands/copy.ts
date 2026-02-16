import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";

// 内置模板列表
const BUILTIN_TEMPLATES = ["brainstorm", "feature-dev"];

// 获取内置模板路径
function getBuiltinTemplatePath(templateName: string): string {
  return path.join(__dirname, "..", "templates", templateName);
}

export const copyCommand = new Command("copy")
  .description("从内置模板复制工作流")
  .argument("<template>", `模板名称 (可选: ${BUILTIN_TEMPLATES.join(", ")})`)
  .argument("[dest]", "目标路径", ".")
  .option("-n, --name <name>", "工作流名称（默认使用模板名）")
  .action(async (template: string, dest: string, options: { name?: string }) => {
    // 检查模板是否存在
    if (!BUILTIN_TEMPLATES.includes(template)) {
      console.error(`错误: 未知模板 "${template}"`);
      console.error(`可用模板: ${BUILTIN_TEMPLATES.join(", ")}`);
      process.exit(1);
    }
    
    const workflowName = options.name || template;
    const templatePath = getBuiltinTemplatePath(template);
    const targetPath = path.resolve(dest, workflowName);
    
    // 检查目标目录是否已存在
    if (await fs.pathExists(targetPath)) {
      console.error(`错误: 目标目录 "${targetPath}" 已存在`);
      process.exit(1);
    }
    
    console.log(`复制模板: ${template} -> ${workflowName}`);
    console.log(`源路径: ${templatePath}`);
    console.log(`目标路径: ${targetPath}`);
    
    // 复制模板目录
    await fs.copy(templatePath, targetPath);
    
    console.log(`\n✅ 工作流 "${workflowName}" 复制成功！`);
    console.log(`\n下一步：`);
    console.log(`  cd ${targetPath}`);
    console.log(`  craft run ${workflowName} init --instance <实例名>`);
  });

// 导出模板列表供其他模块使用
export { BUILTIN_TEMPLATES };
