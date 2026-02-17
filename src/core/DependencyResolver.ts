import type { Workflow } from "./types";

/**
 * 依赖解析器
 * 处理命令间的依赖关系和拓扑排序
 */
export class DependencyResolver {
  /**
   * 获取命令的完整依赖链（包括传递依赖）
   * 返回按执行顺序排列的命令名列表
   */
  static getDependencyChain(
    workflow: Workflow,
    commandName: string,
    includeSelf = true
  ): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const cmd = workflow.commands[name];
      if (!cmd) {
        throw new Error(`命令 "${name}" 不存在于工作流 "${workflow.name}"`);
      }

      // 先处理依赖
      if (cmd.dependsOn) {
        for (const dep of cmd.dependsOn) {
          visit(dep);
        }
      }

      result.push(name);
    };

    visit(commandName);

    if (!includeSelf) {
      return result.filter(n => n !== commandName);
    }

    return result;
  }

  /**
   * 获取所有命令的执行顺序（拓扑排序）
   */
  static getExecutionOrder(workflow: Workflow): string[] {
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

    // 按命令名排序确保稳定输出
    const commandNames = Object.keys(workflow.commands).sort();
    for (const name of commandNames) {
      visit(name);
    }

    return result;
  }

  /**
   * 检测循环依赖
   * 返回检测到的循环，如果没有则返回 null
   */
  static detectCircularDependency(workflow: Workflow): string[] | null {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const path: string[] = [];

    const visit = (name: string): string[] | null => {
      if (visited.has(name)) return null;
      if (visiting.has(name)) {
        // 找到循环
        const cycleStart = path.indexOf(name);
        return [...path.slice(cycleStart), name];
      }

      visiting.add(name);
      path.push(name);

      const cmd = workflow.commands[name];
      if (cmd?.dependsOn) {
        for (const dep of cmd.dependsOn) {
          const cycle = visit(dep);
          if (cycle) return cycle;
        }
      }

      path.pop();
      visiting.delete(name);
      visited.add(name);

      return null;
    };

    for (const name of Object.keys(workflow.commands)) {
      const cycle = visit(name);
      if (cycle) return cycle;
    }

    return null;
  }

  /**
   * 获取命令的直接依赖
   */
  static getDirectDependencies(workflow: Workflow, commandName: string): string[] {
    const cmd = workflow.commands[commandName];
    return cmd?.dependsOn || [];
  }

  /**
   * 获取依赖于指定命令的所有命令（反向依赖）
   */
  static getDependents(workflow: Workflow, commandName: string): string[] {
    const dependents: string[] = [];

    for (const [name, cmd] of Object.entries(workflow.commands)) {
      if (cmd.dependsOn?.includes(commandName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * 获取所有受影响（需要更新）的命令
   * 当某个命令的状态改变时，所有下游命令都需要更新
   */
  static getAffectedCommands(
    workflow: Workflow,
    changedCommand: string
  ): string[] {
    const affected = new Set<string>();
    
    const collect = (name: string) => {
      const dependents = this.getDependents(workflow, name);
      for (const dep of dependents) {
        if (!affected.has(dep)) {
          affected.add(dep);
          collect(dep);
        }
      }
    };

    collect(changedCommand);
    return Array.from(affected);
  }

  /**
   * 验证工作流的依赖关系是否有效
   */
  static validate(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查循环依赖
    const cycle = this.detectCircularDependency(workflow);
    if (cycle) {
      errors.push(`检测到循环依赖: ${cycle.join(" -> ")}`);
    }

    // 检查依赖的命令是否存在
    for (const [name, cmd] of Object.entries(workflow.commands)) {
      if (cmd.dependsOn) {
        for (const dep of cmd.dependsOn) {
          if (!workflow.commands[dep]) {
            errors.push(`命令 "${name}" 依赖不存在的命令 "${dep}"`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
