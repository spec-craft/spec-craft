import * as fs from "fs-extra";
import * as path from "path";

export class TemplateRenderer {
  /**
   * 渲染模板内容，替换变量占位符
   */
  static render(content: string, variables: Record<string, string | boolean>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replaceAll(placeholder, String(value));
    }
    
    return result;
  }

  /**
   * 从文件加载并渲染模板
   */
  static async renderFile(
    templatePath: string,
    variables: Record<string, string | boolean>
  ): Promise<string> {
    const content = await fs.readFile(templatePath, "utf-8");
    return this.render(content, variables);
  }

  /**
   * 渲染输出路径
   */
  static renderPath(template: string, variables: Record<string, string | boolean>): string {
    return this.render(template, variables);
  }

  /**
   * 检查模板中是否有未替换的变量
   */
  static findUnresolvedVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const unresolved: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!unresolved.includes(match[1])) {
        unresolved.push(match[1]);
      }
    }
    
    return unresolved;
  }
}
