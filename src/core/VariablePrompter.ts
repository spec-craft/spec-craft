import inquirer from "inquirer";
import type { WorkflowVariable } from "./types";

/**
 * 变量提示器
 * 处理工作流变量的交互式收集
 */
export class VariablePrompter {
  /**
   * 收集工作流变量
   * @param variables 变量定义
   * @param existingValues 已有的值（跳过已有值的变量）
   * @returns 收集到的变量值
   */
  static async collect(
    variables: Record<string, WorkflowVariable>,
    existingValues: Record<string, string | boolean> = {}
  ): Promise<Record<string, string | boolean>> {
    const result: Record<string, string | boolean> = { ...existingValues };
    
    for (const [name, config] of Object.entries(variables)) {
      // 跳过已有值的变量
      if (result[name] !== undefined) {
        continue;
      }
      
      const value = await this.promptVariable(name, config);
      result[name] = value;
    }
    
    return result;
  }

  /**
   * 提示单个变量
   */
  private static async promptVariable(
    name: string,
    config: WorkflowVariable
  ): Promise<string | boolean> {
    const message = config.prompt || config.description || `请输入 ${name}`;

    if (config.type === "boolean") {
      return this.promptBoolean(name, message, config);
    }

    if (config.type === "select" && config.options) {
      return this.promptSelect(name, message, config);
    }

    return this.promptString(name, message, config);
  }

  /**
   * 提示布尔值
   */
  private static async promptBoolean(
    name: string,
    message: string,
    config: WorkflowVariable
  ): Promise<boolean> {
    const { value } = await inquirer.prompt([{
      type: "confirm",
      name: "value",
      message,
      default: config.default as boolean
    }]);
    
    return value;
  }

  /**
   * 提示选择
   */
  private static async promptSelect(
    name: string,
    message: string,
    config: WorkflowVariable
  ): Promise<string> {
    const { value } = await inquirer.prompt([{
      type: "list",
      name: "value",
      message,
      choices: config.options,
      default: config.default as string
    }]);
    
    return value;
  }

  /**
   * 提示字符串
   */
  private static async promptString(
    name: string,
    message: string,
    config: WorkflowVariable
  ): Promise<string> {
    const { value } = await inquirer.prompt([{
      type: "input",
      name: "value",
      message,
      default: config.default as string,
      validate: (input: string) => {
        if (config.required && !input.trim()) {
          return `${name} 是必填项`;
        }
        return true;
      }
    }]);
    
    return value;
  }

  /**
   * 验证变量值
   * @returns 验证结果 { valid, missing }
   */
  static validate(
    variables: Record<string, WorkflowVariable>,
    values: Record<string, string | boolean>
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const [name, config] of Object.entries(variables)) {
      if (config.required && values[name] === undefined) {
        missing.push(name);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * 获取变量默认值
   */
  static getDefaults(
    variables: Record<string, WorkflowVariable>
  ): Record<string, string | boolean> {
    const defaults: Record<string, string | boolean> = {};
    
    for (const [name, config] of Object.entries(variables)) {
      if (config.default !== undefined) {
        defaults[name] = config.default;
      }
    }
    
    return defaults;
  }

  /**
   * 合并变量值（优先使用提供的值，其次使用默认值）
   */
  static merge(
    variables: Record<string, WorkflowVariable>,
    provided: Record<string, string | boolean>
  ): Record<string, string | boolean> {
    const defaults = this.getDefaults(variables);
    return { ...defaults, ...provided };
  }
}
