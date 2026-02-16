import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";

export const initCommand = new Command("init")
  .description("创建新的 marketplace")
  .argument("[name]", "marketplace 名称", "my-spec-workflows")
  .option("-p, --path <path>", "创建路径", ".")
  .action(async (name: string, options: { path: string }) => {
    const targetPath = path.resolve(options.path, name);
    
    // 检查目录是否已存在
    if (await fs.pathExists(targetPath)) {
      const files = await fs.readdir(targetPath);
      if (files.length > 0) {
        console.error(`错误: 目录 "${targetPath}" 已存在且不为空`);
        process.exit(1);
      }
    }
    
    console.log(`创建 marketplace: ${name}`);
    console.log(`路径: ${targetPath}`);
    
    // 创建目录结构
    await fs.ensureDir(targetPath);
    
    // 创建 marketplace.json
    const marketplaceConfig = {
      name,
      description: `${name} - SpecCraft 工作流集合`,
      version: "1.0.0",
      workflows: []
    };
    
    await fs.writeJson(
      path.join(targetPath, "marketplace.json"),
      marketplaceConfig,
      { spaces: 2 }
    );
    
    // 创建 README.md
    const readme = `# ${name}

SpecCraft 工作流集合

## 使用方法

将此 marketplace 添加到你的 Agent 平台：

\`\`\`bash
/plugin marketplace add <此仓库的 Git URL>
\`\`\`

## 可用工作流

（使用 \`craft copy\` 命令添加工作流）

## License

MIT
`;
    await fs.writeFile(path.join(targetPath, "README.md"), readme);
    
    // 创建 .gitignore
    const gitignore = `# SpecCraft 状态目录
.craft/

# Node
node_modules/

# IDE
.idea/
.vscode/
*.swp
*.swo
`;
    await fs.writeFile(path.join(targetPath, ".gitignore"), gitignore);
    
    console.log(`\n✅ Marketplace "${name}" 创建成功！`);
    console.log(`\n下一步：`);
    console.log(`  cd ${name}`);
    console.log(`  craft copy brainstorm ./brainstorm  # 添加 brainstorm 工作流`);
  });
