import { Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { SkillPublisher } from "../core/SkillPublisher";
import type { PublishMode } from "../core/SkillPublisher";
import type { AuthorInfo } from "../core/types";

export interface PublishCommandOptions {
  mode?: PublishMode;
  marketplace?: string;
  authorName?: string;
  authorEmail?: string;
  force?: boolean;
  dryRun?: boolean;
}

export const publishCommand = new Command("publish")
  .description("Publish workflow skills locally or to marketplace")
  .argument("<workflow-name>", "Workflow name to publish")
  .option("-m, --mode <type>", "Publishing mode: local | marketplace")
  .option("--marketplace <path>", "Marketplace directory path")
  .option("--author-name <name>", "Author name")
  .option("--author-email <email>", "Author email")
  .option("--force", "Force overwrite existing", false)
  .option("--dry-run", "Preview without executing", false)
  .action(async (workflowName: string, options: PublishCommandOptions) => {
    await publishCommandHandler(workflowName, options);
  });

export async function publishCommandHandler(
  workflowName: string,
  options: PublishCommandOptions
): Promise<void> {
  console.log(chalk.bold(`\n✨ Publishing workflow: ${workflowName}\n`));

  // Find workflow directory
  const workflowPath = path.resolve(workflowName);

  if (!await fs.pathExists(workflowPath)) {
    console.error(chalk.red(`❌ Workflow directory not found: ${workflowPath}`));
    process.exit(1);
  }

  // Prompt for mode if not provided
  let mode = options.mode;
  if (!mode) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: 'Choose publishing mode:',
      choices: [
        { name: 'Local Skill - Install to ~/.claude/skills/', value: 'local' },
        { name: 'Marketplace - Publish to team/community marketplace', value: 'marketplace' }
      ]
    }]);
    mode = answer.mode;
  }

  // Prepare publish options
  const publishOptions: any = {
    workflowPath,
    mode,
    force: options.force,
    dryRun: options.dryRun
  };

  // If marketplace mode, get marketplace path and author
  if (mode === 'marketplace') {
    if (!options.marketplace) {
      const answer = await inquirer.prompt([{
        type: 'input',
        name: 'marketplace',
        message: 'Enter marketplace directory path:',
        default: path.join(process.env.HOME || '~', 'my-marketplace')
      }]);
      publishOptions.marketplacePath = answer.marketplace;
    } else {
      publishOptions.marketplacePath = options.marketplace;
    }

    // Get author info
    const author: AuthorInfo = {
      name: options.authorName || 'Unknown',
      email: options.authorEmail || 'unknown@example.com'
    };

    if (!options.authorName || !options.authorEmail) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Author name:',
          default: author.name
        },
        {
          type: 'input',
          name: 'email',
          message: 'Author email:',
          default: author.email
        }
      ]);
      author.name = answers.name;
      author.email = answers.email;
    }

    publishOptions.author = author;
  }

  // Dry run
  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run - no changes will be made\n'));
    console.log('Publish options:', publishOptions);
    return;
  }

  // Publish
  try {
    const result = await SkillPublisher.publish(publishOptions);

    console.log(chalk.green(`\n${result.message}\n`));

    if (result.actions && result.actions.length > 0) {
      console.log(chalk.bold('Next steps:'));
      result.actions.forEach(action => {
        console.log(`  ${action}`);
      });
    }
  } catch (err) {
    console.error(chalk.red(`\n❌ Failed to publish: ${(err as Error).message}\n`));
    process.exit(1);
  }
}
