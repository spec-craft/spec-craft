import * as fs from "fs-extra";
import * as path from "path";
import type { CommandStatus, CommandState, WorkflowInstanceState, StateFile } from "./state-types";

const STATE_VERSION = "1.0.0";
const STATE_DIR = ".craft";
const STATE_FILE = "state.json";

export class StateManager {
  private basePath: string;
  private statePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.statePath = path.join(this.basePath, STATE_DIR, STATE_FILE);
  }

  /**
   * 获取状态文件路径
   */
  getStatePath(): string {
    return this.statePath;
  }

  /**
   * 确保状态目录存在
   */
  private async ensureStateDir(): Promise<void> {
    await fs.ensureDir(path.dirname(this.statePath));
  }

  /**
   * 读取状态文件
   */
  private async readStateFile(): Promise<StateFile> {
    if (!(await fs.pathExists(this.statePath))) {
      return {
        version: STATE_VERSION,
        instances: {}
      };
    }
    
    const content = await fs.readFile(this.statePath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * 写入状态文件
   */
  private async writeStateFile(state: StateFile): Promise<void> {
    await this.ensureStateDir();
    await fs.writeJson(this.statePath, state, { spaces: 2 });
  }

  /**
   * 获取工作流实例的 key
   */
  private getInstanceKey(workflowName: string, instanceName: string): string {
    return `${workflowName}:${instanceName}`;
  }

  /**
   * 获取工作流实例状态
   */
  async getInstance(workflowName: string, instanceName: string): Promise<WorkflowInstanceState | null> {
    const state = await this.readStateFile();
    const key = this.getInstanceKey(workflowName, instanceName);
    return state.instances[key] || null;
  }

  /**
   * 创建或更新工作流实例
   */
  async upsertInstance(
    workflowName: string,
    instanceName: string,
    variables: Record<string, string | boolean> = {}
  ): Promise<WorkflowInstanceState> {
    const state = await this.readStateFile();
    const key = this.getInstanceKey(workflowName, instanceName);
    const now = new Date().toISOString();

    let instance = state.instances[key];
    
    if (!instance) {
      // 创建新实例
      instance = {
        instance: instanceName,
        workflow: workflowName,
        createdAt: now,
        updatedAt: now,
        variables,
        commands: {}
      };
    } else {
      // 更新实例
      instance.updatedAt = now;
      instance.variables = { ...instance.variables, ...variables };
    }

    state.instances[key] = instance;
    await this.writeStateFile(state);
    
    return instance;
  }

  /**
   * 获取命令状态
   */
  async getCommandStatus(
    workflowName: string,
    instanceName: string,
    commandName: string
  ): Promise<CommandState | null> {
    const instance = await this.getInstance(workflowName, instanceName);
    if (!instance) return null;
    return instance.commands[commandName] || null;
  }

  /**
   * 设置命令状态
   */
  async setCommandStatus(
    workflowName: string,
    instanceName: string,
    commandName: string,
    status: CommandStatus,
    options: { output?: string; error?: string } = {}
  ): Promise<CommandState> {
    const state = await this.readStateFile();
    const key = this.getInstanceKey(workflowName, instanceName);
    const now = new Date().toISOString();

    const instance = state.instances[key];
    if (!instance) {
      throw new Error(`工作流实例不存在: ${workflowName}:${instanceName}`);
    }

    const commandState: CommandState = {
      status,
      ...options
    };

    if (status === "in_progress") {
      commandState.startedAt = now;
    } else if (status === "completed" || status === "failed") {
      commandState.completedAt = now;
    }

    instance.commands[commandName] = commandState;
    instance.updatedAt = now;

    await this.writeStateFile(state);
    return commandState;
  }

  /**
   * 检查命令是否可以执行（依赖是否满足）
   */
  async canExecuteCommand(
    workflowName: string,
    instanceName: string,
    commandName: string,
    dependencies: string[]
  ): Promise<{ canExecute: boolean; reason?: string }> {
    const instance = await this.getInstance(workflowName, instanceName);
    
    if (!instance) {
      return { canExecute: false, reason: "工作流实例不存在" };
    }

    for (const dep of dependencies) {
      const depState = instance.commands[dep];
      if (!depState || depState.status !== "completed") {
        return { canExecute: false, reason: `依赖命令 "${dep}" 尚未完成` };
      }
    }

    return { canExecute: true };
  }

  /**
   * 列出所有实例
   */
  async listInstances(workflowName?: string): Promise<WorkflowInstanceState[]> {
    const state = await this.readStateFile();
    const instances = Object.values(state.instances);
    
    if (workflowName) {
      return instances.filter(i => i.workflow === workflowName);
    }
    
    return instances;
  }

  /**
   * 删除实例
   */
  async deleteInstance(workflowName: string, instanceName: string): Promise<boolean> {
    const state = await this.readStateFile();
    const key = this.getInstanceKey(workflowName, instanceName);
    
    if (!state.instances[key]) {
      return false;
    }
    
    delete state.instances[key];
    await this.writeStateFile(state);
    return true;
  }
}
