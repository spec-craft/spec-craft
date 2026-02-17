import * as fs from "fs-extra";
import * as path from "path";
import type { AuthorInfo, PluginEntry, ValidationResult } from "./types";

export interface MarketplaceConfig {
  name: string;
  path: string;
  url?: string;
  owner: AuthorInfo;
  isLocal: boolean;
}

export interface MarketplaceIndex {
  $schema: string;
  name: string;
  description: string;
  owner: AuthorInfo;
  plugins: PluginEntry[];
}

export class MarketplaceManager {
  /**
   * Initialize new marketplace
   */
  static async init(dirPath: string, config: MarketplaceConfig): Promise<void> {
    // Create marketplace directory structure
    const claudePluginDir = path.join(dirPath, '.claude-plugin');
    const workflowsDir = path.join(dirPath, 'workflows');

    await fs.ensureDir(claudePluginDir);
    await fs.ensureDir(workflowsDir);

    // Create marketplace.json
    const index: MarketplaceIndex = {
      $schema: 'https://spec-craft.dev/schema/marketplace.json',
      name: config.name,
      description: `SpecCraft marketplace: ${config.name}`,
      owner: config.owner,
      plugins: []
    };

    await fs.writeJSON(path.join(claudePluginDir, 'marketplace.json'), index, { spaces: 2 });
  }

  /**
   * Validate marketplace structure
   */
  static async validate(dirPath: string): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check directory exists
    if (!await fs.pathExists(dirPath)) {
      errors.push(`Marketplace directory not found: ${dirPath}`);
      return { valid: false, errors };
    }

    // Check marketplace.json
    const indexPath = path.join(dirPath, '.claude-plugin', 'marketplace.json');
    if (!await fs.pathExists(indexPath)) {
      errors.push('Missing .claude-plugin/marketplace.json');
    } else {
      try {
        const index = await fs.readJSON(indexPath);
        if (!index.name || !index.plugins) {
          errors.push('Invalid marketplace.json structure');
        }
      } catch (err) {
        errors.push(`Failed to parse marketplace.json: ${(err as Error).message}`);
      }
    }

    // Check workflows directory
    const workflowsDir = path.join(dirPath, 'workflows');
    if (!await fs.pathExists(workflowsDir)) {
      errors.push('Missing workflows/ directory');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * List all workflows in marketplace
   */
  static async list(dirPath: string): Promise<PluginEntry[]> {
    const indexPath = path.join(dirPath, '.claude-plugin', 'marketplace.json');

    if (!await fs.pathExists(indexPath)) {
      return [];
    }

    try {
      const index = await fs.readJSON(indexPath) as MarketplaceIndex;
      return index.plugins || [];
    } catch {
      return [];
    }
  }
}
