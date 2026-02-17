import type { Workflow, SkillSection, ValidationResult } from "./types";

export interface SkillGenerationOptions {
  workflow: Workflow;
  outputPath: string;
  templateType?: 'minimal' | 'standard' | 'detailed';
  customSections?: SkillSection[];
}

export class SkillGenerator {
  /**
   * Generate front matter section
   */
  private static generateFrontMatter(workflow: Workflow): string {
    return `---
name: speccraft:${workflow.name}
description: ${workflow.description}
---`;
  }

  /**
   * Generate commands section
   */
  private static generateCommands(workflow: Workflow): string {
    const commandDocs = Object.entries(workflow.commands).map(([name, cmd]) => {
      const deps = cmd.dependsOn ? `\n**Dependencies:** ${cmd.dependsOn.join(', ')}` : '';

      return `### ${name} - ${cmd.description}

**Type:** ${cmd.type}${deps}

\`\`\`bash
craft run ${workflow.name} ${name}
\`\`\``;
    });

    return `## Commands\n\n${commandDocs.join('\n\n')}`;
  }

  /**
   * Generate variables section
   */
  private static generateVariables(workflow: Workflow): string {
    const vars = Object.entries(workflow.variables || {});

    if (vars.length === 0) {
      return "";
    }

    const varDocs = vars.map(([name, varDef]) => {
      const required = varDef.required ? " - Required" : "";
      const desc = varDef.description ? `\n  ${varDef.description}` : "";

      return `- **${name}** (${varDef.type})${required}${desc}`;
    });

    return `## Variables\n\n${varDocs.join('\n')}`;
  }

  /**
   * Generate usage section
   */
  private static generateUsage(workflow: Workflow): string {
    const firstCommand = Object.keys(workflow.commands)[0];
    if (!firstCommand) return "";

    return `## Usage

\`\`\`bash
# Start the workflow
craft run ${workflow.name} ${firstCommand}
\`\`\`

## Workflow State

Check progress anytime:
\`\`\`bash
craft status ${workflow.name}
\`\`\``;
  }

  /**
   * Generate SKILL.md from workflow definition
   */
  static async generate(options: SkillGenerationOptions): Promise<string> {
    const { workflow } = options;

    const sections = [
      this.generateFrontMatter(workflow),
      `\n# ${workflow.name}\n`,
      `\n${workflow.description || ''}\n`,
      `\n${this.generateCommands(workflow)}\n`,
      this.generateVariables(workflow) ? `\n${this.generateVariables(workflow)}\n` : '',
      this.generateUsage(workflow)
    ];

    return sections.filter(s => s.trim()).join('\n');
  }

  /**
   * Validate SKILL.md format
   */
  static validate(content: string): ValidationResult {
    throw new Error("Not implemented");
  }

  /**
   * Generate from template (for built-in workflows)
   */
  static async generateFromTemplate(
    workflow: Workflow,
    templatePath: string
  ): Promise<string> {
    throw new Error("Not implemented");
  }
}
