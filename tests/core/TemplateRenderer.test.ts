import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs-extra";
import * as path from "path";
import { TemplateRenderer } from "../../src/core/TemplateRenderer";

describe("TemplateRenderer", () => {
  describe("render", () => {
    test("替换字符串变量", () => {
      const template = "Hello, {{name}}!";
      const result = TemplateRenderer.render(template, { name: "World" });
      expect(result).toBe("Hello, World!");
    });

    test("替换多个变量", () => {
      const template = "{{greeting}}, {{name}}!";
      const result = TemplateRenderer.render(template, { greeting: "Hello", name: "World" });
      expect(result).toBe("Hello, World!");
    });

    test("替换重复变量", () => {
      const template = "{{name}} and {{name}}";
      const result = TemplateRenderer.render(template, { name: "Alice" });
      expect(result).toBe("Alice and Alice");
    });

    test("支持布尔值", () => {
      const template = "Enabled: {{enabled}}";
      const result = TemplateRenderer.render(template, { enabled: true });
      expect(result).toBe("Enabled: true");
    });
  });

  describe("findUnresolvedVariables", () => {
    test("找到未替换的变量", () => {
      const content = "Hello, {{name}}! Your score is {{score}}.";
      const unresolved = TemplateRenderer.findUnresolvedVariables(content);
      expect(unresolved).toEqual(["name", "score"]);
    });

    test("没有未替换变量时返回空数组", () => {
      const content = "Hello, World!";
      const unresolved = TemplateRenderer.findUnresolvedVariables(content);
      expect(unresolved).toEqual([]);
    });

    test("不重复返回相同变量", () => {
      const content = "{{name}} and {{name}}";
      const unresolved = TemplateRenderer.findUnresolvedVariables(content);
      expect(unresolved).toEqual(["name"]);
    });
  });

  describe("renderPath", () => {
    test("渲染路径", () => {
      const template = "output/{{topic}}/init.md";
      const result = TemplateRenderer.renderPath(template, { topic: "my-topic" });
      expect(result).toBe("output/my-topic/init.md");
    });
  });
});
