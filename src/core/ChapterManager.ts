import { readFile } from "fs/promises";
import type { ChapterDefinition, ChapterGroup } from "../types/chapter";

export class ChapterManager {
  /**
   * Get the next chapter group that hasn't been fully completed.
   */
  getNextGroup(
    chapters: ChapterDefinition[],
    groups: ChapterGroup[],
    completedChapterIds: string[]
  ): ChapterGroup | null {
    for (const group of groups) {
      const allCompleted = group.chapters.every((id) =>
        completedChapterIds.includes(id)
      );
      if (!allCompleted) {
        return group;
      }
    }
    return null;
  }

  /**
   * Get chapter definitions by their IDs.
   */
  getChaptersByIds(
    chapters: ChapterDefinition[],
    ids: string[]
  ): ChapterDefinition[] {
    return ids
      .map((id) => chapters.find((c) => c.id === id))
      .filter((c): c is ChapterDefinition => c !== undefined);
  }

  /**
   * Merge new chapter content into an existing document.
   * Replaces the section if found, appends if not.
   */
  async mergeChapter(
    filePath: string,
    sectionTitle: string,
    newContent: string
  ): Promise<string> {
    const existing = await readFile(filePath, "utf-8");
    const sectionPattern = new RegExp(
      `(## ${this.escapeRegex(sectionTitle)})\\n[\\s\\S]*?(?=\\n## |$)`,
      "g"
    );

    if (sectionPattern.test(existing)) {
      // Replace existing section
      return existing.replace(sectionPattern, newContent.trim());
    } else {
      // Append new section
      return existing.trimEnd() + "\n\n" + newContent.trim() + "\n";
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
