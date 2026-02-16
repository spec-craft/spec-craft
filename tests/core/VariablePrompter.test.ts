import { describe, test, expect } from "bun:test";
import { VariablePrompter } from "../../src/core/VariablePrompter";
import type { WorkflowVariable } from "../../src/core/types";

describe("VariablePrompter", () => {
  const testVariables: Record<string, WorkflowVariable> = {
    name: {
      type: "string",
      required: true,
      description: "名称"
    },
    priority: {
      type: "select",
      options: ["P0", "P1", "P2", "P3"],
      default: "P2",
      description: "优先级"
    },
    enabled: {
      type: "boolean",
      default: true,
      description: "是否启用"
    }
  };

  describe("validate", () => {
    test("所有必填变量都有值时验证通过", () => {
      const values = { name: "test" };
      const result = VariablePrompter.validate(testVariables, values);
      
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test("缺少必填变量时验证失败", () => {
      const values = { priority: "P0" };
      const result = VariablePrompter.validate(testVariables, values);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("name");
    });

    test("非必填变量缺失不影响验证", () => {
      const variables: Record<string, WorkflowVariable> = {
        optional: {
          type: "string",
          required: false,
          description: "可选字段"
        }
      };
      
      const result = VariablePrompter.validate(variables, {});
      expect(result.valid).toBe(true);
    });
  });

  describe("getDefaults", () => {
    test("获取所有默认值", () => {
      const defaults = VariablePrompter.getDefaults(testVariables);
      
      expect(defaults.priority).toBe("P2");
      expect(defaults.enabled).toBe(true);
      expect(defaults.name).toBeUndefined();
    });

    test("无默认值时返回空对象", () => {
      const variables: Record<string, WorkflowVariable> = {
        noDefault: {
          type: "string",
          description: "无默认值"
        }
      };
      
      const defaults = VariablePrompter.getDefaults(variables);
      expect(defaults).toEqual({});
    });
  });

  describe("merge", () => {
    test("合并提供的值和默认值", () => {
      const provided = { name: "my-feature" };
      const merged = VariablePrompter.merge(testVariables, provided);
      
      expect(merged.name).toBe("my-feature");
      expect(merged.priority).toBe("P2");
      expect(merged.enabled).toBe(true);
    });

    test("提供的值优先于默认值", () => {
      const provided = { name: "my-feature", priority: "P0" };
      const merged = VariablePrompter.merge(testVariables, provided);
      
      expect(merged.priority).toBe("P0");
    });
  });

  // 注意：collect 方法需要交互式输入，在集成测试中测试
});
