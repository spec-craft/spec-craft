import { describe, test, expect } from "bun:test";
import { DependencyResolver } from "../../src/core/DependencyResolver";
import type { Workflow } from "../../src/core/types";

describe("DependencyResolver", () => {
  const simpleWorkflow: Workflow = {
    name: "test",
    version: "1.0.0",
    commands: {
      init: { type: "template", template: "init.md", output: "init.md" },
      explore: { type: "template", template: "explore.md", output: "explore.md", dependsOn: ["init"] },
      summarize: { type: "template", template: "summarize.md", output: "summarize.md", dependsOn: ["explore"] }
    }
  };

  describe("getDependencyChain", () => {
    test("获取命令的完整依赖链", () => {
      const chain = DependencyResolver.getDependencyChain(simpleWorkflow, "summarize");
      expect(chain).toEqual(["init", "explore", "summarize"]);
    });

    test("不包含自身", () => {
      const chain = DependencyResolver.getDependencyChain(simpleWorkflow, "summarize", false);
      expect(chain).toEqual(["init", "explore"]);
    });

    test("无依赖命令只返回自身", () => {
      const chain = DependencyResolver.getDependencyChain(simpleWorkflow, "init");
      expect(chain).toEqual(["init"]);
    });

    test("命令不存在时抛出错误", () => {
      expect(() => DependencyResolver.getDependencyChain(simpleWorkflow, "nonexistent")).toThrow();
    });
  });

  describe("getExecutionOrder", () => {
    test("获取所有命令的执行顺序", () => {
      const order = DependencyResolver.getExecutionOrder(simpleWorkflow);
      
      // init 应该在 explore 之前
      expect(order.indexOf("init")).toBeLessThan(order.indexOf("explore"));
      // explore 应该在 summarize 之前
      expect(order.indexOf("explore")).toBeLessThan(order.indexOf("summarize"));
    });
  });

  describe("detectCircularDependency", () => {
    test("无循环依赖时返回 null", () => {
      const cycle = DependencyResolver.detectCircularDependency(simpleWorkflow);
      expect(cycle).toBeNull();
    });

    test("检测直接循环依赖", () => {
      const cyclicWorkflow: Workflow = {
        name: "cyclic",
        version: "1.0.0",
        commands: {
          a: { type: "template", template: "a.md", output: "a.md", dependsOn: ["b"] },
          b: { type: "template", template: "b.md", output: "b.md", dependsOn: ["a"] }
        }
      };
      
      const cycle = DependencyResolver.detectCircularDependency(cyclicWorkflow);
      expect(cycle).not.toBeNull();
      expect(cycle!.length).toBeGreaterThan(0);
    });

    test("检测间接循环依赖", () => {
      const cyclicWorkflow: Workflow = {
        name: "cyclic",
        version: "1.0.0",
        commands: {
          a: { type: "template", template: "a.md", output: "a.md", dependsOn: ["b"] },
          b: { type: "template", template: "b.md", output: "b.md", dependsOn: ["c"] },
          c: { type: "template", template: "c.md", output: "c.md", dependsOn: ["a"] }
        }
      };
      
      const cycle = DependencyResolver.detectCircularDependency(cyclicWorkflow);
      expect(cycle).not.toBeNull();
    });
  });

  describe("getDirectDependencies", () => {
    test("获取直接依赖", () => {
      const deps = DependencyResolver.getDirectDependencies(simpleWorkflow, "summarize");
      expect(deps).toEqual(["explore"]);
    });

    test("无依赖返回空数组", () => {
      const deps = DependencyResolver.getDirectDependencies(simpleWorkflow, "init");
      expect(deps).toEqual([]);
    });
  });

  describe("getDependents", () => {
    test("获取依赖于指定命令的命令", () => {
      const dependents = DependencyResolver.getDependents(simpleWorkflow, "init");
      expect(dependents).toEqual(["explore"]);
    });

    test("无依赖者返回空数组", () => {
      const dependents = DependencyResolver.getDependents(simpleWorkflow, "summarize");
      expect(dependents).toEqual([]);
    });
  });

  describe("getAffectedCommands", () => {
    test("获取所有受影响的命令", () => {
      const affected = DependencyResolver.getAffectedCommands(simpleWorkflow, "init");
      expect(affected).toContain("explore");
      expect(affected).toContain("summarize");
    });

    test("中间命令变更只影响下游", () => {
      const affected = DependencyResolver.getAffectedCommands(simpleWorkflow, "explore");
      expect(affected).toContain("summarize");
      expect(affected).not.toContain("init");
    });
  });

  describe("validate", () => {
    test("有效工作流验证通过", () => {
      const result = DependencyResolver.validate(simpleWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("依赖不存在的命令时报错", () => {
      const invalidWorkflow: Workflow = {
        name: "invalid",
        version: "1.0.0",
        commands: {
          a: { type: "template", template: "a.md", output: "a.md", dependsOn: ["nonexistent"] }
        }
      };
      
      const result = DependencyResolver.validate(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("nonexistent");
    });

    test("循环依赖时报错", () => {
      const cyclicWorkflow: Workflow = {
        name: "cyclic",
        version: "1.0.0",
        commands: {
          a: { type: "template", template: "a.md", output: "a.md", dependsOn: ["b"] },
          b: { type: "template", template: "b.md", output: "b.md", dependsOn: ["a"] }
        }
      };
      
      const result = DependencyResolver.validate(cyclicWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("循环依赖"))).toBe(true);
    });
  });
});
