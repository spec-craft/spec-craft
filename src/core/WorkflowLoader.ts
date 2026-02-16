import * as fs from "fs-extra";
import * as path from "path";
import * as yaml from "yaml";
import type { Workflow, WorkflowCommand, WorkflowVariable } from "./types";
import { SchemaValidator } from "./SchemaValidator";

export class WorkflowLoader {
  private static validator = new SchemaValidator();
  /**
   * 从文件路径加载工作流
   */
  static async load(filePath: string): Promise<Workflow> {
    const absolutePath = path.resolve(filePath);
    
    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`工作流文件不存在: ${absolutePath}`);
    }
    
    const content = await fs.readFile(absolutePath, "utf-8");
    return this.parse(content);
  }
  
  /**
   * 从目录加载工作流（查找 workflow.yaml）
   */
  static async loadFromDir(dirPath: string): Promise<Workflow> {
    const workflowPath = path.join(dirPath, "workflow.yaml");
    return this.load(workflowPath);
  }
  
  /**
   * 解析 YAML 内容为工作流定义
   */
  static parse(content: string): Workflow {
    const raw = yaml.parse(content);
    
    // Schema 验证
    const validation = this.validator.validateWorkflow(raw);
    if (!validation.valid) {
      throw new Error(
        `工作流配置验证失败:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
      );
    }
    
    // 验证必要字段（后备检查）
    if (!raw.name) {
      throw new Error("工作流缺少必要字段: name");
    }
    if (!raw.version) {
      throw new Error("工作流缺少必要字段: version");
    }
    
    // 构建工作流对象
    const workflow: Workflow = {
      name: raw.name,
      version: raw.version,
      description: raw.description,
      variables: raw.variables || {},
      commands: raw.commands || {}
    };
    
    // 验证命令
    this.validateCommands(workflow);
    
    return workflow;
  }
  
  /**
   * 验证命令定义
   */
  private static validateCommands(workflow: Workflow): void {
    const commandNames = Object.keys(workflow.commands);
    
    for (const [name, cmd] of Object.entries(workflow.commands)) {
      // 验证命令类型
      if (!cmd.type) {
        throw new Error(`命令 "${name}" 缺少 type 字段`);
      }
      
      const validTypes = ["template", "execution", "query", "interactive"];
      if (!validTypes.includes(cmd.type)) {
        throw new Error(`命令 "${name}" 的 type 无效: ${cmd.type}`);
      }
      
      // 验证依赖
      if (cmd.dependsOn) {
        for (const dep of cmd.dependsOn) {
          if (!commandNames.includes(dep)) {
            throw new Error(`命令 "${name}" 依赖的命令 "${dep}" 不存在`);
          }
        }
      }
    }
  }
  
  /**
   * 获取命令的依赖链（拓扑排序）
   */
  static getDependencyOrder(workflow: Workflow, commandName: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      
      const cmd = workflow.commands[name];
      if (!cmd) {
        throw new Error(`命令 "${name}" 不存在`);
      }
      
      if (cmd.dependsOn) {
        for (const dep of cmd.dependsOn) {
          visit(dep);
        }
      }
      
      result.push(name);
    };
    
    visit(commandName);
    return result;
  }
  
  /**
   * 获取所有命令的执行顺序
   */
  static getAllCommandsOrder(workflow: Workflow): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      
      const cmd = workflow.commands[name];
      if (cmd?.dependsOn) {
        for (const dep of cmd.dependsOn) {
          visit(dep);
        }
      }
      
      result.push(name);
    };
    
    for (const name of Object.keys(workflow.commands)) {
      visit(name);
    }
    
    return result;
  }
}
