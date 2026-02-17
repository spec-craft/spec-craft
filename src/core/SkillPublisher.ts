import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { WorkflowLoader } from "./WorkflowLoader";
import { SkillGenerator } from "./SkillGenerator";
import type { Workflow, AuthorInfo, PluginMetadata, ValidationResult } from "./types";

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
   * Publish to marketplace (stub for now)
   */
  private static async publishMarketplace(
    workflow: Workflow,
    workflowPath: string,
    marketplacePath: string,
    author: AuthorInfo,
    force: boolean
  ): Promise<PublishResult> {
    throw new Error("Marketplace publishing not yet implemented");
  }
}
