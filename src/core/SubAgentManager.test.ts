import { describe, it, expect } from "bun:test";
import { SubAgentManager } from "./SubAgentManager";
import type { SubAgentDefinition } from "./types";

describe("SubAgentManager", () => {
  const manager = new SubAgentManager();

  it("should resolve execution order for subagents", () => {
    const subAgents: SubAgentDefinition[] = [
      { id: "owasp-check", prompt: "Check OWASP" },
      { id: "privacy-check", prompt: "Check privacy" },
      {
        id: "report",
        prompt: "Generate report from {{subAgents.owasp-check.output}}",
        dependsOn: ["owasp-check", "privacy-check"],
      },
    ];

    const order = manager.resolveOrder(subAgents);

    // owasp-check and privacy-check should come before report
    expect(order.indexOf("owasp-check")).toBeLessThan(order.indexOf("report"));
    expect(order.indexOf("privacy-check")).toBeLessThan(
      order.indexOf("report")
    );
  });

  it("should identify parallel groups", () => {
    const subAgents: SubAgentDefinition[] = [
      { id: "a", prompt: "Task A" },
      { id: "b", prompt: "Task B" },
      { id: "c", prompt: "Task C", dependsOn: ["a", "b"] },
    ];

    const groups = manager.getParallelGroups(subAgents);
    // Group 1: [a, b] can run in parallel
    // Group 2: [c] runs after
    expect(groups).toHaveLength(2);
    expect(groups[0].sort()).toEqual(["a", "b"]);
    expect(groups[1]).toEqual(["c"]);
  });

  it("should detect circular dependency in subagents", () => {
    const subAgents: SubAgentDefinition[] = [
      { id: "a", prompt: "A", dependsOn: ["b"] },
      { id: "b", prompt: "B", dependsOn: ["a"] },
    ];

    expect(() => manager.resolveOrder(subAgents)).toThrow("Circular");
  });

  it("should render prompt with subagent outputs", () => {
    const prompt =
      "Report based on:\n{{subAgents.scan.output}}\n{{subAgents.check.output}}";
    const outputs: Record<string, string> = {
      scan: "No vulnerabilities found.",
      check: "All checks passed.",
    };

    const rendered = manager.renderPrompt(prompt, outputs);
    expect(rendered).toContain("No vulnerabilities found.");
    expect(rendered).toContain("All checks passed.");
  });
});
