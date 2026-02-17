import * as fs from "fs-extra";
import * as path from "path";
import type { WorkflowCommand } from "./types";

/**
 * 命令执行结果
 */
export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * 命令执行器
 * 处理各种类型命令的执行
 */
export class CommandExecutor {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  /**
   * 执行命令
   */
  async execute(
    cmd: WorkflowCommand,
    variables: Record<string, string | boolean>,
    workflowPath: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    switch (cmd.type) {
      case "template":
        return this.executeTemplate(cmd, variables, workflowPath);
      
      case "execution":
        return this.executeCommand(cmd);
      
      case "query":
        return this.executeQuery(cmd);
      
      case "interactive":
        return this.executeInteractive(cmd);
      
      default:
        return { success: false, error: `未知命令类型: ${(cmd as any).type}` };
    }
  }

  /**
   * 执行模板命令
   */
  private async executeTemplate(
    cmd: WorkflowCommand,
    variables: Record<string, string | boolean>,
    workflowPath: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!cmd.template || !cmd.output) {
      return { success: false, error: "模板命令缺少 template 或 output 字段" };
    }

    const templatePath = path.join(workflowPath, cmd.template);
    
    // 检查模板文件存在
    if (!(await fs.pathExists(templatePath))) {
      return { success: false, error: `模板文件不存在: ${templatePath}` };
    }

    // 渲染模板
    const content = await this.renderTemplate(templatePath, variables);
    
    // 渲染输出路径
    const relativeOutput = this.renderPath(cmd.output, variables);
    const absoluteOutput = path.join(this.basePath, relativeOutput);
    
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(absoluteOutput));
    
    // 写入文件
    await fs.writeFile(absoluteOutput, content);
    
    return { success: true, output: relativeOutput };
  }

  /**
   * 执行 shell 命令
   */
  private async executeCommand(
    cmd: WorkflowCommand
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    const config = cmd.execution;
    if (!config?.command) {
      return { success: false, error: "execution 命令缺少 command 字段" };
    }

    try {
      const result = await this.runShellCommand(config.command, {
        cwd: this.basePath,
        timeout: 300000 // 5 分钟超时
      });

      if (result.success) {
        return { 
          success: true, 
          output: `命令执行成功 (退出码: ${result.exitCode})` 
        };
      } else {
        return { 
          success: false, 
          error: `命令执行失败: ${result.stderr || result.stdout}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `命令执行异常: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 执行查询命令
   */
  private async executeQuery(
    cmd: WorkflowCommand
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!cmd.checks || cmd.checks.length === 0) {
      return { success: false, error: "query 命令缺少 checks 字段" };
    }

    // 查询命令通常是只读的，返回检查项列表
    const checks = Array.isArray(cmd.checks) 
      ? cmd.checks.map(c => typeof c === "string" ? c : c.id)
      : [];

    return { 
      success: true, 
      output: `检查项: ${checks.join(", ")}` 
    };
  }

  /**
   * 执行交互命令
   */
  private async executeInteractive(
    _cmd: WorkflowCommand
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    // 交互命令由 Agent 处理，这里只返回提示
    return { 
      success: true, 
      output: "交互命令需要用户输入" 
    };
  }

  /**
   * 渲染模板内容
   */
  private async renderTemplate(
    templatePath: string,
    variables: Record<string, string | boolean>
  ): Promise<string> {
    const content = await fs.readFile(templatePath, "utf-8");
    return this.renderString(content, variables);
  }

  /**
   * 渲染字符串中的变量
   */
  private renderString(
    content: string,
    variables: Record<string, string | boolean>
  ): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replaceAll(placeholder, String(value));
    }
    return result;
  }

  /**
   * 渲染路径
   */
  private renderPath(
    template: string,
    variables: Record<string, string | boolean>
  ): string {
    return this.renderString(template, variables);
  }

  /**
   * 执行 shell 命令
   */
  private async runShellCommand(
    command: string,
    options: { cwd: string; timeout: number }
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // 使用 shell 执行命令
    const process = Bun.spawn(["sh", "-c", command], {
      cwd: options.cwd,
      stdout: "pipe",
      stderr: "pipe"
    });

    // 读取输出
    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();
    
    // 等待进程结束
    await process.exited;
    
    const exitCode = process.exitCode ?? 0;
    
    return {
      success: exitCode === 0,
      stdout,
      stderr,
      exitCode,
      duration: Date.now() - startTime
    };
  }
}
