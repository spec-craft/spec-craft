#!/usr/bin/env bun
import { program } from "commander";
import { initCommand } from "../src/commands/init";
import { copyCommand } from "../src/commands/copy";
import { createCommand } from "../src/commands/create";
import { runCommand } from "../src/commands/run";
import { listCommand } from "../src/commands/list";
import { showCommand } from "../src/commands/show";
import { publishCommand } from "../src/commands/publish";
import { SkillInstaller } from "../src/core/SkillInstaller";
import { handleError } from "../src/utils/errorHandler";

// Auto-install built-in skills
await SkillInstaller.ensureBuiltinSkills();

program
  .name("craft")
  .description("SpecCraft CLI - 帮团队创建和管理 spec-driven 工作流")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(copyCommand);
program.addCommand(createCommand);
program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(publishCommand);

// Global error handler
program.parseAsync().catch(handleError);
