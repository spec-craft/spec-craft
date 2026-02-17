import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { WorkflowLoader } from "./WorkflowLoader";
import { SkillGenerator } from "./SkillGenerator";
import { MarketplaceManager } from "./MarketplaceManager";
import type { Workflow, AuthorInfo, PluginMetadata, ValidationResult, PluginEntry } from "./types";

export type PublishMode = 'local' | 'marketplace';

export interface PublishOptions {
  workflowPath: string;
  mode: PublishMode;
  marketplacePath?: string;
  author?: AuthorInfo;
  force?: boolean;
  dryRun?: boolean;
}

export interface PublishResult {
  success: boolean;
  mode: PublishMode;
  installedPath: string;
  message: string;
  actions?: string[];
}

export class SkillPublisher {
  /**
   * Publish workflow skill
   */
  static async publish(
    options: PublishOptions,
    skillsDir?: string  // For testing
  ): Promise<PublishResult> {
    // Load workflow
    const workflow = await WorkflowLoader.loadFromDir(options.workflowPath);

    if (options.mode === 'local') {
      return this.publishLocal(workflow, options.workflowPath, options.force || false, skillsDir);
    } else {
      if (!options.marketplacePath) {
        throw new Error("marketplacePath is required for marketplace mode");
      }
      if (!options.author) {
        throw new Error("author is required for marketplace mode");
      }
      return this.publishMarketplace(
        workflow,
        options.workflowPath,
        options.marketplacePath,
        options.author,
        options.force || false
      );
    }
  }

  /**
   * Publish to local ~/.claude/skills/
   */
  private static async publishLocal(
    workflow: Workflow,
    workflowPath: string,
    force: boolean,
    skillsDir?: string
  ): Promise<PublishResult> {
    const homeDir = os.homedir();
    const defaultSkillsDir = path.join(homeDir, '.claude', 'skills');
    const targetSkillsDir = skillsDir || defaultSkillsDir;
    const targetDir = path.join(targetSkillsDir, `speccraft:${workflow.name}`);

    // Check if exists
    if (await fs.pathExists(targetDir) && !force) {
      throw new Error(
        `Skill already exists: ${targetDir}. Use --force to overwrite.`
      );
    }

    // Create directory
    await fs.ensureDir(targetDir);

    // Generate or copy SKILL.md
    const skillPath = path.join(workflowPath, 'SKILL.md');
    const targetSkillPath = path.join(targetDir, 'SKILL.md');

    if (await fs.pathExists(skillPath)) {
      await fs.copy(skillPath, targetSkillPath);
    } else {
      const skillContent = await SkillGenerator.generate({
        workflow,
        outputPath: targetSkillPath,
        templateType: 'standard'
      });
      await fs.writeFile(targetSkillPath, skillContent, 'utf-8');
    }

    return {
      success: true,
      mode: 'local',
      installedPath: targetDir,
      message: `Skill installed to ${targetDir}`,
      actions: [
        'Claude Code will automatically discover this skill',
        'You can now use it in conversations'
      ]
    };
  }

  /**
   * Publish to marketplace
   */
  private static async publishMarketplace(
    workflow: Workflow,
    workflowPath: string,
    marketplacePath: string,
    author: AuthorInfo,
    force: boolean
  ): Promise<PublishResult> {
    const workflowsDir = path.join(marketplacePath, 'workflows');
    const targetDir = path.join(workflowsDir, workflow.name);

    // Check if exists
    if (await fs.pathExists(targetDir) && !force) {
      throw new Error(
        `Workflow already exists in marketplace: ${targetDir}. Use --force to overwrite.`
      );
    }

    // Create directory
    await fs.ensureDir(targetDir);

    // Copy workflow files
    const sourceFiles = ['workflow.yaml', 'SKILL.md'];
    for (const file of sourceFiles) {
      const sourcePath = path.join(workflowPath, file);
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, path.join(targetDir, file));
      }
    }

    // Update marketplace index
    const indexPath = path.join(marketplacePath, '.claude-plugin', 'marketplace.json');
    if (await fs.pathExists(indexPath)) {
      const index = await fs.readJSON(indexPath) as { plugins: PluginEntry[] };

      // Check if workflow already exists
      const existingIndex = index.plugins.findIndex(p => p.name === workflow.name);
      const pluginEntry: PluginEntry = {
        name: workflow.name,
        description: workflow.description || '',
        version: '1.0.0',
        author,
        source: `./workflows/${workflow.name}`,
        keywords: [],
        category: 'workflow'
      };

      if (existingIndex >= 0) {
        if (!force) {
          throw new Error(`Workflow "${workflow.name}" already in marketplace. Use --force to overwrite.`);
        }
        index.plugins[existingIndex] = pluginEntry;
      } else {
        index.plugins.push(pluginEntry);
      }

      await fs.writeJSON(indexPath, index, { spaces: 2 });
    }

    return {
      success: true,
      mode: 'marketplace',
      installedPath: targetDir,
      message: `Workflow published to marketplace: ${targetDir}`,
      actions: [
        'Share the marketplace directory with your team',
        'Team members can install workflows from the marketplace'
      ]
    };
  }
}
