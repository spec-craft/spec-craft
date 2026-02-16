import { readFile } from "fs/promises";
import { join } from "path";
import type { KnowledgeInjection } from "./types";

export class KnowledgeInjector {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Load knowledge content from configured sources.
   */
  async loadKnowledge(
    injections: KnowledgeInjection[]
  ): Promise<Record<string, string>> {
    const knowledge: Record<string, string> = {};

    for (const injection of injections) {
      if (
        injection.source.startsWith("http://") ||
        injection.source.startsWith("https://")
      ) {
        knowledge[injection.id] = await this.loadFromUrl(injection.source);
      } else {
        knowledge[injection.id] = await this.loadFromFile(injection.source);
      }
    }

    return knowledge;
  }

  /**
   * Inject knowledge values into template content.
   * Replaces {{knowledge.<id>}} placeholders.
   */
  inject(template: string, knowledge: Record<string, string>): string {
    let result = template;
    for (const [id, content] of Object.entries(knowledge)) {
      result = result.replace(
        new RegExp(`\\{\\{knowledge\\.${this.escapeRegex(id)}\\}\\}`, "g"),
        content
      );
    }
    return result;
  }

  /**
   * Remove knowledge blocks from output content.
   * Only removes blocks where removeFromOutput is true.
   */
  removeKnowledgeBlocks(
    content: string,
    injections: KnowledgeInjection[]
  ): string {
    let result = content;

    for (const injection of injections) {
      if (!injection.removeFromOutput) continue;

      const pattern = new RegExp(
        `<knowledge id="${this.escapeRegex(injection.id)}">[\\s\\S]*?</knowledge>\\n?`,
        "g"
      );
      result = result.replace(pattern, "");
    }

    // Clean up extra blank lines
    result = result.replace(/\n{3,}/g, "\n\n");
    return result;
  }

  private async loadFromFile(relativePath: string): Promise<string> {
    const fullPath = join(this.basePath, relativePath);
    return readFile(fullPath, "utf-8");
  }

  private async loadFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch knowledge from ${url}: ${response.statusText}`
      );
    }
    return response.text();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
