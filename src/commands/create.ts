import { mkdir, access, writeFile } from "fs/promises";
import { join } from "path";
import { Command } from "commander";
import { stringify } from "yaml";
import type { CommandType } from "../core/types";

export interface CreateVariableOption {
  name: string;
  type: "string" | "select" | "boolean";
  required?: boolean;
  description?: string;
  options?: string[];
}

export interface CreateCommandOption {
  name: string;
  description: string;
  type: CommandType;
  dependsOn?: string[];
}

export interface CreateOptions {
  name: string;
  description: string;
  variables: CreateVariableOption[];
  commands: CreateCommandOption[];
}

export const createCommand = new Command("create")
  .description("创建新的自定义工作流")
  .argument("<name>", "工作流名称")
  .option("-d, --description <desc>", "工作流描述", "Custom workflow")
  .action(async (name: string, cmdOptions: { description: string }) => {
    // For now, create a basic workflow structure
    // Interactive creation can be extended later
    const options: CreateOptions = {
      name,
      description: cmdOptions.description,
      variables: [
        {
          name: "topic",
          type: "string",
          required: true,
          description: "Topic name",
        },
      ],
      commands: [
        { name: "init", description: "Initialize", type: "template" },
        { name: "status", description: "Show status", type: "query" },
        { name: "done", description: "Complete", type: "template" },
      ],
    };

    await createCommandHandler(options, process.cwd());
    console.log(`✅ 工作流 "${name}" 创建成功！`);
    console.log(`\n下一步：`);
    console.log(`  cd ${name}`);
    console.log(`  craft run ${name} init --instance <实例名>`);
  });

export async function createCommandHandler(
  options: CreateOptions,
  targetDir: string
): Promise<void> {
  const workflowDir = join(targetDir, options.name);

  // Check if exists
  try {
    await access(workflowDir);
    throw new Error(
      `Workflow "${options.name}" already exists in ${targetDir}`
    );
  } catch (err: unknown) {
    if ((err as Error).message.includes("already exists")) throw err;
  }

  // Create directory structure
  await mkdir(join(workflowDir, "templates"), { recursive: true });

  // Build workflow.yaml
  const workflowDef: Record<string, unknown> = {
    name: options.name,
    version: "1.0.0",
    description: options.description,
  };

  // Variables
  if (options.variables.length > 0) {
    const variables: Record<string, Record<string, unknown>> = {};
    for (const v of options.variables) {
      const varDef: Record<string, unknown> = { type: v.type };
      if (v.required) varDef.required = true;
      if (v.description) varDef.description = v.description;
      if (v.options) varDef.options = v.options;
      variables[v.name] = varDef;
    }
    workflowDef.variables = variables;
  }

  // Commands
  const commands: Record<string, Record<string, unknown>> = {};
  for (const cmd of options.commands) {
    const cmdDef: Record<string, unknown> = {
      type: cmd.type,
      description: cmd.description,
    };

    if (cmd.type === "template") {
      cmdDef.template = `templates/${cmd.name}.md`;
      cmdDef.output = `specs/{{${options.variables[0]?.name ?? "topic"}}}/${cmd.name}.md`;
    }

    if (cmd.dependsOn?.length) {
      cmdDef.dependsOn = cmd.dependsOn;
    }

    commands[cmd.name] = cmdDef;
  }
  workflowDef.commands = commands;

  await writeFile(
    join(workflowDir, "workflow.yaml"),
    stringify(workflowDef),
    "utf-8"
  );

  // Generate SKILL.md
  const skillContent = generateSkillMd(options);
  await writeFile(join(workflowDir, "SKILL.md"), skillContent, "utf-8");

  // Generate template files for template commands
  for (const cmd of options.commands) {
    if (cmd.type === "template") {
      const varRef = options.variables[0]?.name ?? "topic";
      const templateContent = `# {{${varRef}}} - ${cmd.description}\n\n> Created: {{createdAt}}\n\n---\n\n<!-- Add content here -->\n`;
      await writeFile(
        join(workflowDir, "templates", `${cmd.name}.md`),
        templateContent,
        "utf-8"
      );
    }
  }
}

function generateSkillMd(options: CreateOptions): string {
  const lines: string[] = [
    `# ${options.name}`,
    "",
    options.description,
    "",
    "## Usage",
    "",
    `Use \`craft run ${options.name} <command>\` to execute commands:`,
    "",
  ];

  for (const cmd of options.commands) {
    lines.push(`### ${cmd.name}`);
    lines.push("");
    lines.push("```bash");
    lines.push(`craft run ${options.name} ${cmd.name}`);
    lines.push("```");
    lines.push("");
    lines.push(cmd.description);
    lines.push("");
  }

  lines.push("## Commands");
  lines.push("");
  lines.push(
    `Commands: ${options.commands.map((c) => `\`${c.name}\``).join(", ")}`
  );
  lines.push("");

  return lines.join("\n");
}
