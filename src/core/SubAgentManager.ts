import type { SubAgentDefinition } from "./types";

export class SubAgentManager {
  /**
   * Resolve execution order of subagents using topological sort.
   */
  resolveOrder(subAgents: SubAgentDefinition[]): string[] {
    const byId = new Map(subAgents.map((sa) => [sa.id, sa]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(
          `Circular dependency detected in subagents involving "${id}"`
        );
      }

      const sa = byId.get(id);
      if (!sa) throw new Error(`SubAgent "${id}" not found`);

      visiting.add(id);
      for (const dep of sa.dependsOn ?? []) {
        visit(dep);
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const sa of subAgents) {
      visit(sa.id);
    }

    return order;
  }

  /**
   * Group subagents into parallel execution batches.
   * SubAgents in the same group have no inter-dependencies.
   */
  getParallelGroups(subAgents: SubAgentDefinition[]): string[][] {
    const order = this.resolveOrder(subAgents);
    const byId = new Map(subAgents.map((sa) => [sa.id, sa]));
    const groups: string[][] = [];
    const assigned = new Set<string>();

    while (assigned.size < order.length) {
      const group: string[] = [];

      for (const id of order) {
        if (assigned.has(id)) continue;

        const sa = byId.get(id)!;
        const deps = sa.dependsOn ?? [];
        const allDepsSatisfied = deps.every((dep) => assigned.has(dep));

        if (allDepsSatisfied) {
          group.push(id);
        }
      }

      for (const id of group) {
        assigned.add(id);
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Render a subagent prompt, replacing {{subAgents.<id>.output}} placeholders.
   */
  renderPrompt(prompt: string, outputs: Record<string, string>): string {
    let result = prompt;
    for (const [id, output] of Object.entries(outputs)) {
      result = result.replace(
        new RegExp(`\\{\\{subAgents\\.${id}\\.output\\}\\}`, "g"),
        output
      );
    }
    return result;
  }
}
