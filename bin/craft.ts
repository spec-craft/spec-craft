#!/usr/bin/env bun
import { program } from "commander";
import { initCommand } from "../src/commands/init";
import { copyCommand } from "../src/commands/copy";
import { runCommand } from "../src/commands/run";

program
  .name("craft")
  .description("SpecCraft CLI - 帮团队创建和管理 spec-driven 工作流")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(copyCommand);
program.addCommand(runCommand);

program.parse();
