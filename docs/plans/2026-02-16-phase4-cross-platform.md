# SpecCraft Phase 4: Cross-Platform & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add config schema validation with clear error messages, more built-in templates (api-design, bug-fix, quick-prototype), cross-platform export framework, and comprehensive error handling. Polish the CLI for production use.

**Architecture:** Add a SchemaValidator using Zod for workflow.yaml validation. Create an Exporter module that transforms marketplace output into platform-specific formats. Improve error handling across all modules with a custom SpecCraftError hierarchy. Add three new built-in templates.

**Tech Stack:** TypeScript, zod (schema validation), vitest (from existing stack)

**Prerequisite:** Phase 3 must be complete and all tests passing.

---

## Task 1: Schema Validation with Zod

**Files:**
- Modify: `package.json` (add zod)
- Create: `src/core/SchemaValidator.ts`
- Create: `src/core/SchemaValidator.test.ts`

**Step 1: Add dependency**

Run: `npm install zod`

**Step 2: Write the failing test**

```typescript
// src/core/SchemaValidator.test.ts
import { describe, it, expect } from 'vitest';
import { SchemaValidator } from './SchemaValidator.js';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  it('should validate a correct minimal workflow', () => {
    const result = validator.validateWorkflow({
      name: 'test',
      version: '1.0.0',
      commands: {
        init: { description: 'Initialize' }
      }
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a full workflow with all fields', () => {
    const result = validator.validateWorkflow({
      name: 'feature-dev',
      version: '1.0.0',
      description: 'Feature development',
      variables: {
        feature: {
          type: 'string',
          required: true,
          description: 'Feature name',
          prompt: 'Enter feature name'
        },
        priority: {
          type: 'select',
          options: ['P0', 'P1', 'P2'],
          default: 'P1'
        }
      },
      contextManagement: {
        tokenThreshold: 8000,
        roundThreshold: 20
      },
      commands: {
        init: {
          type: 'template',
          description: 'Init',
          template: 'templates/init.md',
          output: 'specs/{{feature}}/init.md'
        },
        implement: {
          type: 'execution',
          description: 'Implement',
          dependsOn: ['init'],
          execution: {
            command: 'npm test',
            mode: 'incremental',
            failFast: true
          }
        },
        status: {
          type: 'query',
          description: 'Status',
          checks: ['spec-completeness']
        },
        brainstorm: {
          type: 'interactive',
          description: 'Explore ideas'
        }
      }
    });

    expect(result.valid).toBe(true);
  });

  it('should reject workflow without name', () => {
    const result = validator.validateWorkflow({
      version: '1.0.0',
      commands: { init: { description: 'Init' } }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('name');
  });

  it('should reject workflow without version', () => {
    const result = validator.validateWorkflow({
      name: 'test',
      commands: { init: { description: 'Init' } }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('should reject workflow without commands', () => {
    const result = validator.validateWorkflow({
      name: 'test',
      version: '1.0.0'
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('commands'))).toBe(true);
  });

  it('should reject invalid variable type', () => {
    const result = validator.validateWorkflow({
      name: 'test',
      version: '1.0.0',
      variables: {
        bad: { type: 'invalid_type' }
      },
      commands: { init: { description: 'Init' } }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('type'))).toBe(true);
  });

  it('should reject invalid command type', () => {
    const result = validator.validateWorkflow({
      name: 'test',
      version: '1.0.0',
      commands: {
        init: { description: 'Init', type: 'invalid_type' }
      }
    });

    expect(result.valid).toBe(false);
  });

  it('should provide user-friendly error messages', () => {
    const result = validator.validateWorkflow({});

    expect(result.valid).toBe(false);
    // Should have clear, human-readable messages
    for (const error of result.errors) {
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    }
  });

  it('should validate marketplace.json', () => {
    const result = validator.validateMarketplace({
      name: 'my-marketplace',
      version: '1.0.0',
      description: 'My marketplace',
      workflows: []
    });

    expect(result.valid).toBe(true);
  });

  it('should reject invalid marketplace.json', () => {
    const result = validator.validateMarketplace({});

    expect(result.valid).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- src/core/SchemaValidator.test.ts`
Expected: FAIL - SchemaValidator not defined

**Step 4: Write minimal implementation**

```typescript
// src/core/SchemaValidator.ts
import { z } from 'zod';

const variableSchema = z.object({
  type: z.enum(['string', 'select', 'boolean', 'computed']),
  required: z.boolean().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  default: z.union([z.string(), z.boolean()]).optional(),
  formula: z.string().optional()
});

const executionConfigSchema = z.object({
  command: z.string().optional(),
  mode: z.enum(['incremental', 'full', 'dry-run', 'interactive']).optional(),
  scope: z.enum(['affected', 'all']).optional(),
  validation: z.boolean().optional(),
  failFast: z.boolean().optional(),
  coverage: z.boolean().optional(),
  fix: z.boolean().optional()
}).optional();

const chapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional()
});

const chapterGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  chapters: z.array(z.string())
});

const knowledgeInjectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  skill: z.string().optional(),
  removeFromOutput: z.boolean().optional()
});

const subAgentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  prompt: z.string(),
  dependsOn: z.array(z.string()).optional()
});

const commandSchema = z.object({
  description: z.string(),
  type: z.enum(['template', 'execution', 'query', 'interactive']).optional(),
  template: z.string().optional(),
  output: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  autoRunDeps: z.boolean().optional(),
  execution: executionConfigSchema,
  checks: z.array(z.string()).optional(),
  chapters: z.array(chapterSchema).optional(),
  chapterGroups: z.array(chapterGroupSchema).optional(),
  injectKnowledge: z.array(knowledgeInjectionSchema).optional(),
  subAgents: z.array(subAgentSchema).optional()
});

const contextManagementSchema = z.object({
  tokenThreshold: z.number().optional(),
  roundThreshold: z.number().optional()
}).optional();

const workflowSchema = z.object({
  name: z.string({ required_error: '"name" is required' }),
  version: z.string({ required_error: '"version" is required' }),
  description: z.string().optional(),
  variables: z.record(variableSchema).optional(),
  contextManagement: contextManagementSchema,
  commands: z.record(commandSchema).refine(
    (cmds) => Object.keys(cmds).length > 0,
    { message: '"commands" must contain at least one command' }
  )
});

const marketplaceSchema = z.object({
  name: z.string({ required_error: '"name" is required' }),
  version: z.string({ required_error: '"version" is required' }),
  description: z.string().optional(),
  workflows: z.array(z.string()).optional()
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class SchemaValidator {
  validateWorkflow(data: unknown): ValidationResult {
    const result = workflowSchema.safeParse(data);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });

    return { valid: false, errors };
  }

  validateMarketplace(data: unknown): ValidationResult {
    const result = marketplaceSchema.safeParse(data);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });

    return { valid: false, errors };
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- src/core/SchemaValidator.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json package-lock.json src/core/SchemaValidator.ts src/core/SchemaValidator.test.ts
git commit -m "feat: add SchemaValidator with Zod for workflow.yaml validation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Integrate Validation into WorkflowLoader

**Files:**
- Modify: `src/core/WorkflowLoader.ts`
- Modify: `src/core/WorkflowLoader.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/core/WorkflowLoader.test.ts

describe('WorkflowLoader - Schema Validation', () => {
  const testDir = join(process.cwd(), '.test-wf-validation');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should provide detailed error for invalid variable type', async () => {
    const workflowDir = join(testDir, 'bad-var');
    await mkdir(workflowDir);

    const yaml = `
name: test
version: 1.0.0
variables:
  topic:
    type: invalid_type
commands:
  init:
    description: Init
`;
    await writeFile(join(workflowDir, 'workflow.yaml'), yaml);

    const loader = new WorkflowLoader();
    await expect(loader.load(workflowDir)).rejects.toThrow('type');
  });

  it('should provide detailed error for missing commands', async () => {
    const workflowDir = join(testDir, 'no-cmds');
    await mkdir(workflowDir);

    const yaml = `
name: test
version: 1.0.0
commands: {}
`;
    await writeFile(join(workflowDir, 'workflow.yaml'), yaml);

    const loader = new WorkflowLoader();
    await expect(loader.load(workflowDir)).rejects.toThrow('commands');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/WorkflowLoader.test.ts`
Expected: FAIL - validation not integrated

**Step 3: Update WorkflowLoader to use SchemaValidator**

```typescript
// Update src/core/WorkflowLoader.ts
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { parse } from 'yaml';
import { SchemaValidator } from './SchemaValidator.js';
import type { WorkflowDefinition, LoadedWorkflow } from '../types/workflow.js';

export class WorkflowLoader {
  private validator = new SchemaValidator();

  async load(workflowPath: string): Promise<LoadedWorkflow> {
    const yamlPath = join(workflowPath, 'workflow.yaml');

    try {
      await access(yamlPath);
    } catch {
      throw new Error(`workflow.yaml not found at ${workflowPath}`);
    }

    const content = await readFile(yamlPath, 'utf-8');
    const parsed = parse(content);

    // Schema validation
    const validation = this.validator.validateWorkflow(parsed);
    if (!validation.valid) {
      throw new Error(
        `Invalid workflow.yaml at ${workflowPath}:\n` +
        validation.errors.map(e => `  - ${e}`).join('\n')
      );
    }

    return {
      path: workflowPath,
      definition: parsed as WorkflowDefinition
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/WorkflowLoader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/WorkflowLoader.ts src/core/WorkflowLoader.test.ts
git commit -m "feat: integrate Zod schema validation into WorkflowLoader

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Custom Error Hierarchy

**Files:**
- Create: `src/errors.ts`
- Create: `src/errors.test.ts`

**Step 1: Write the failing test**

```typescript
// src/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  SpecCraftError,
  WorkflowNotFoundError,
  CommandNotFoundError,
  ValidationError,
  DependencyError,
  StateError
} from './errors.js';

describe('Error Hierarchy', () => {
  it('should create WorkflowNotFoundError', () => {
    const err = new WorkflowNotFoundError('brainstorm', '/path/to/wf');
    expect(err).toBeInstanceOf(SpecCraftError);
    expect(err).toBeInstanceOf(WorkflowNotFoundError);
    expect(err.message).toContain('brainstorm');
    expect(err.code).toBe('WORKFLOW_NOT_FOUND');
    expect(err.hint).toBeDefined();
  });

  it('should create CommandNotFoundError', () => {
    const err = new CommandNotFoundError('unknown', 'brainstorm', ['init', 'next', 'done']);
    expect(err).toBeInstanceOf(SpecCraftError);
    expect(err.message).toContain('unknown');
    expect(err.code).toBe('COMMAND_NOT_FOUND');
    expect(err.hint).toContain('init');
  });

  it('should create ValidationError', () => {
    const err = new ValidationError(['name is required', 'commands is empty']);
    expect(err.message).toContain('name is required');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should create DependencyError', () => {
    const err = new DependencyError('tasks', ['init', 'spec', 'design']);
    expect(err.message).toContain('tasks');
    expect(err.code).toBe('DEPENDENCY_ERROR');
    expect(err.hint).toContain('init');
  });

  it('should create StateError', () => {
    const err = new StateError('Instance not found', 'brainstorm', 'my-topic');
    expect(err.code).toBe('STATE_ERROR');
  });

  it('should format user-friendly error output', () => {
    const err = new CommandNotFoundError('xyz', 'brainstorm', ['init', 'next']);
    const formatted = err.format();
    expect(formatted).toContain('Error');
    expect(formatted).toContain('xyz');
    expect(formatted).toContain('Hint');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/errors.test.ts`
Expected: FAIL - error classes not defined

**Step 3: Write minimal implementation**

```typescript
// src/errors.ts
export class SpecCraftError extends Error {
  code: string;
  hint?: string;

  constructor(message: string, code: string, hint?: string) {
    super(message);
    this.name = 'SpecCraftError';
    this.code = code;
    this.hint = hint;
  }

  format(): string {
    const lines = [`Error [${this.code}]: ${this.message}`];
    if (this.hint) {
      lines.push(`Hint: ${this.hint}`);
    }
    return lines.join('\n');
  }
}

export class WorkflowNotFoundError extends SpecCraftError {
  constructor(workflowName: string, searchPath: string) {
    super(
      `Workflow "${workflowName}" not found at ${searchPath}`,
      'WORKFLOW_NOT_FOUND',
      `Make sure the workflow directory exists and contains a workflow.yaml file. ` +
      `Run "craft list" to see available workflows.`
    );
    this.name = 'WorkflowNotFoundError';
  }
}

export class CommandNotFoundError extends SpecCraftError {
  constructor(commandName: string, workflowName: string, availableCommands: string[]) {
    super(
      `Command "${commandName}" not found in workflow "${workflowName}"`,
      'COMMAND_NOT_FOUND',
      `Available commands: ${availableCommands.join(', ')}`
    );
    this.name = 'CommandNotFoundError';
  }
}

export class ValidationError extends SpecCraftError {
  constructor(errors: string[]) {
    super(
      `Workflow validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`,
      'VALIDATION_ERROR',
      'Check your workflow.yaml against the schema specification.'
    );
    this.name = 'ValidationError';
  }
}

export class DependencyError extends SpecCraftError {
  constructor(command: string, unmetDeps: string[]) {
    super(
      `Command "${command}" has unmet dependencies`,
      'DEPENDENCY_ERROR',
      `Run these commands first: ${unmetDeps.join(' -> ')}\n` +
      `Or use --auto to execute them automatically.`
    );
    this.name = 'DependencyError';
  }
}

export class StateError extends SpecCraftError {
  constructor(message: string, workflow: string, instance: string) {
    super(
      `${message} (workflow: ${workflow}, instance: ${instance})`,
      'STATE_ERROR',
      `Check state directory at .craft/state/${workflow}/${instance}.yaml`
    );
    this.name = 'StateError';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/errors.ts src/errors.test.ts
git commit -m "feat: add custom error hierarchy with user-friendly messages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: API-Design Built-in Template

**Files:**
- Create: `templates/api-design/SKILL.md`
- Create: `templates/api-design/workflow.yaml`
- Create: `templates/api-design/templates/init.md`
- Create: `templates/api-design/templates/api-spec.md`

**Step 1: Create workflow.yaml**

```yaml
# templates/api-design/workflow.yaml
name: api-design
version: 1.0.0
description: API 设计流程

variables:
  api:
    type: string
    required: true
    description: API 名称
    prompt: 请输入 API 名称
  outputDir:
    type: string
    default: "specs/{{api}}"

commands:
  init:
    type: template
    description: 初始化 API 设计
    template: templates/init.md
    output: "{{outputDir}}/init.md"

  define:
    type: template
    description: 定义 API 规格
    template: templates/api-spec.md
    output: "{{outputDir}}/api-spec.md"
    dependsOn: [init]

  review:
    type: interactive
    description: 审查 API 设计
    dependsOn: [define]

  done:
    type: query
    description: 完成 API 设计
    dependsOn: [review]
```

**Step 2: Create SKILL.md**

```markdown
# templates/api-design/SKILL.md
# API Design 工作流

系统性的 API 设计流程，从需求到规格到评审。

## 何时使用

- 设计新的 REST/GraphQL API
- 重构或扩展现有 API
- 需要团队评审的 API 变更

## 使用方式

使用 `craft run api-design <command>` 执行命令：

### 初始化

```bash
craft run api-design init <api-name>
```

创建 API 设计文档目录。

### 定义 API 规格

```bash
craft run api-design define
```

生成详细的 API 规格文档（endpoints, request/response, errors）。

### 审查

```bash
craft run api-design review
```

交互式审查 API 设计，检查一致性和最佳实践。

### 完成

```bash
craft run api-design done
```

确认 API 设计完成。

## 产出

- `specs/<api>/init.md` — API 概述
- `specs/<api>/api-spec.md` — 完整 API 规格
```

**Step 3: Create template files**

```markdown
# templates/api-design/templates/init.md
# {{api}} - API 设计

> 创建时间: {{createdAt}}

---

## API 概述

<!-- 一句话描述这个 API 的用途 -->

## 目标用户

<!-- 谁会调用这个 API？前端？移动端？第三方？ -->

## 核心场景

<!-- 列出主要使用场景 -->

## 约束

- 认证方式:
- 限流策略:
- 兼容性要求:
```

```markdown
# templates/api-design/templates/api-spec.md
# {{api}} - API 规格

> 基于: init.md
> 创建时间: {{createdAt}}

---

## Base URL

```
/api/v1/{{api}}
```

## Authentication

<!-- 认证方式说明 -->

## Endpoints

### GET /

**描述:**

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|

**响应:**

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### POST /

**描述:**

**请求体:**

```json
{
}
```

**响应:**

```json
{
  "data": {}
}
```

## Error Codes

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数无效 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器错误 |

## Rate Limiting

<!-- 限流策略 -->

## Versioning

<!-- 版本策略 -->
```

**Step 4: Commit**

```bash
git add templates/api-design/
git commit -m "feat: add api-design built-in template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Bug-Fix Built-in Template

**Files:**
- Create: `templates/bug-fix/SKILL.md`
- Create: `templates/bug-fix/workflow.yaml`
- Create: `templates/bug-fix/templates/init.md`

**Step 1: Create workflow.yaml**

```yaml
# templates/bug-fix/workflow.yaml
name: bug-fix
version: 1.0.0
description: Bug 修复流程

variables:
  bug-id:
    type: string
    required: true
    description: Bug ID
    prompt: 请输入 Bug ID
  outputDir:
    type: string
    default: "specs/bugs/{{bug-id}}"

commands:
  init:
    type: template
    description: 记录 Bug 信息
    template: templates/init.md
    output: "{{outputDir}}/bug-report.md"

  reproduce:
    type: execution
    description: 复现问题
    dependsOn: [init]
    execution:
      mode: interactive

  diagnose:
    type: interactive
    description: 诊断根因
    dependsOn: [reproduce]

  fix:
    type: execution
    description: 修复代码
    dependsOn: [diagnose]
    execution:
      mode: incremental

  verify:
    type: execution
    description: 验证修复
    dependsOn: [fix]
    execution:
      command: npm test

  status:
    type: query
    description: 查看当前状态
```

**Step 2: Create SKILL.md**

```markdown
# templates/bug-fix/SKILL.md
# Bug-Fix 工作流

系统性的 Bug 修复流程：复现 → 诊断 → 修复 → 验证。

## 何时使用

- 收到 Bug 报告需要修复
- 发现生产环境问题
- 测试发现的缺陷

## 使用方式

使用 `craft run bug-fix <command>` 执行命令：

### 初始化

```bash
craft run bug-fix init <bug-id>
```

记录 Bug 的基本信息。

### 复现

```bash
craft run bug-fix reproduce
```

尝试复现问题，记录复现步骤。

### 诊断

```bash
craft run bug-fix diagnose
```

分析根因，交互式讨论可能的原因。

### 修复

```bash
craft run bug-fix fix
```

实现修复代码。

### 验证

```bash
craft run bug-fix verify
```

运行测试验证修复。

### 查看状态

```bash
craft run bug-fix status
```

## 流程

1. `init` → 记录 Bug 信息
2. `reproduce` → 稳定复现
3. `diagnose` → 找到根因
4. `fix` → 编写修复
5. `verify` → 确认修复

## 产出

- `specs/bugs/<bug-id>/bug-report.md` — Bug 报告与修复记录
```

**Step 3: Create template file**

```markdown
# templates/bug-fix/templates/init.md
# Bug Report: {{bug-id}}

> 创建时间: {{createdAt}}

---

## Bug 描述

<!-- 详细描述 Bug 的表现 -->

## 复现步骤

1.
2.
3.

## 期望行为

<!-- 正确的行为应该是什么 -->

## 实际行为

<!-- 实际发生了什么 -->

## 环境信息

- OS:
- Node.js:
- 浏览器:

## 影响范围

- 影响用户数:
- 严重程度: [ ] P0 [ ] P1 [ ] P2 [ ] P3

## 诊断笔记

<!-- 分析过程中的发现 -->

## 根因

<!-- 确定的根本原因 -->

## 修复方案

<!-- 采用的修复方案 -->

## 验证结果

<!-- 修复后的验证结果 -->
```

**Step 4: Commit**

```bash
git add templates/bug-fix/
git commit -m "feat: add bug-fix built-in template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Quick-Prototype Built-in Template

**Files:**
- Create: `templates/quick-prototype/SKILL.md`
- Create: `templates/quick-prototype/workflow.yaml`
- Create: `templates/quick-prototype/templates/init.md`

**Step 1: Create workflow.yaml**

```yaml
# templates/quick-prototype/workflow.yaml
name: quick-prototype
version: 1.0.0
description: 快速原型迭代（代码优先）

variables:
  feature:
    type: string
    required: true
    description: 原型名称
    prompt: 请输入原型名称
  outputDir:
    type: string
    default: "specs/prototypes/{{feature}}"

commands:
  init:
    type: template
    description: 记录原型目标
    template: templates/init.md
    output: "{{outputDir}}/prototype.md"

  prototype:
    type: execution
    description: 快速实现原型
    dependsOn: [init]
    execution:
      mode: full

  test:
    type: execution
    description: 测试原型
    dependsOn: [prototype]
    execution:
      command: npm test
      failFast: true

  reflect:
    type: interactive
    description: 反思测试结果
    dependsOn: [test]

  refine:
    type: execution
    description: 优化实现
    dependsOn: [reflect]
    execution:
      mode: incremental

  status:
    type: query
    description: 查看当前状态
```

**Step 2: Create SKILL.md**

```markdown
# templates/quick-prototype/SKILL.md
# Quick-Prototype 工作流

快速原型迭代：先写代码，再测试，再反思，再优化。

## 何时使用

- 需要快速验证一个想法
- 探索性开发，不确定最终方案
- 想先写代码再补文档

## 使用方式

使用 `craft run quick-prototype <command>` 执行命令：

### 初始化

```bash
craft run quick-prototype init <feature-name>
```

记录原型目标和约束。

### 实现原型

```bash
craft run quick-prototype prototype
```

快速实现原型代码。

### 测试

```bash
craft run quick-prototype test
```

运行测试。

### 反思

```bash
craft run quick-prototype reflect
```

基于测试结果，讨论改进方向。

### 优化

```bash
craft run quick-prototype refine
```

基于反思结果优化代码。

## 流程

1. `init` → 明确目标
2. `prototype` → 快速实现
3. `test` → 验证
4. `reflect` → 反思
5. `refine` → 优化
6. 重复 3-5 直到满意

## 产出

- `specs/prototypes/<feature>/prototype.md` — 原型记录
```

**Step 3: Create template file**

```markdown
# templates/quick-prototype/templates/init.md
# Prototype: {{feature}}

> 创建时间: {{createdAt}}

---

## 目标

<!-- 这个原型要验证什么？ -->

## 约束

- 时间限制:
- 技术栈:
- 可接受的妥协:

## 核心假设

<!-- 需要通过原型验证的假设 -->

## 成功标准

<!-- 什么情况下原型算成功？ -->

## 迭代记录

### 迭代 1

**实现:**

**测试结果:**

**反思:**

**改进计划:**
```

**Step 4: Commit**

```bash
git add templates/quick-prototype/
git commit -m "feat: add quick-prototype built-in template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Cross-Platform Exporter

**Files:**
- Create: `src/core/Exporter.ts`
- Create: `src/core/Exporter.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/Exporter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { Exporter } from './Exporter.js';

describe('Exporter', () => {
  const testDir = join(process.cwd(), '.test-export');
  let exporter: Exporter;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    exporter = new Exporter();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should export SKILL.md as-is (Claude Code format is the standard)', async () => {
    const skillContent = '# Brainstorm\n\nA workflow for brainstorming.';

    const exported = exporter.exportSkill(skillContent, 'claude-code');
    expect(exported).toBe(skillContent);
  });

  it('should generate marketplace manifest', async () => {
    // Create mock workflow dirs
    await mkdir(join(testDir, 'brainstorm'), { recursive: true });
    await writeFile(join(testDir, 'brainstorm', 'workflow.yaml'), `
name: brainstorm
version: 1.0.0
description: Brainstorm ideas
commands:
  init:
    description: Init
`);

    await mkdir(join(testDir, 'feature-dev'), { recursive: true });
    await writeFile(join(testDir, 'feature-dev', 'workflow.yaml'), `
name: feature-dev
version: 1.0.0
description: Feature dev
commands:
  init:
    description: Init
`);

    const manifest = await exporter.generateManifest(testDir);
    expect(manifest.workflows).toHaveLength(2);
    expect(manifest.workflows.map((w: { name: string }) => w.name).sort()).toEqual(['brainstorm', 'feature-dev']);
  });

  it('should export workflow info as JSON', async () => {
    await mkdir(join(testDir, 'test-wf'), { recursive: true });
    await writeFile(join(testDir, 'test-wf', 'workflow.yaml'), `
name: test-wf
version: 1.0.0
description: Test
commands:
  init:
    description: Init
    type: template
  test:
    description: Test
    type: execution
    dependsOn: [init]
`);

    const json = await exporter.exportAsJson(join(testDir, 'test-wf'));
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('test-wf');
    expect(parsed.commands.init.type).toBe('template');
    expect(parsed.commands.test.dependsOn).toEqual(['init']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/Exporter.test.ts`
Expected: FAIL - Exporter not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/Exporter.ts
import { readdir, access } from 'fs/promises';
import { join } from 'path';
import { WorkflowLoader } from './WorkflowLoader.js';

export interface ManifestWorkflow {
  name: string;
  version: string;
  description?: string;
  path: string;
}

export interface Manifest {
  generatedAt: string;
  workflows: ManifestWorkflow[];
}

export class Exporter {
  /**
   * Export SKILL.md content for a target platform.
   * Claude Code format is the standard; other platforms may need transformation.
   */
  exportSkill(skillContent: string, platform: string): string {
    switch (platform) {
      case 'claude-code':
        return skillContent;
      default:
        // Future: add transformations for other platforms
        return skillContent;
    }
  }

  /**
   * Generate a manifest of all workflows in a marketplace directory.
   */
  async generateManifest(marketplacePath: string): Promise<Manifest> {
    const loader = new WorkflowLoader();
    const entries = await readdir(marketplacePath, { withFileTypes: true });
    const workflows: ManifestWorkflow[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const wfPath = join(marketplacePath, entry.name);
      try {
        await access(join(wfPath, 'workflow.yaml'));
        const loaded = await loader.load(wfPath);
        workflows.push({
          name: loaded.definition.name,
          version: loaded.definition.version,
          description: loaded.definition.description,
          path: entry.name
        });
      } catch {
        // Skip non-workflow directories
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      workflows
    };
  }

  /**
   * Export workflow definition as JSON.
   */
  async exportAsJson(workflowPath: string): Promise<string> {
    const loader = new WorkflowLoader();
    const workflow = await loader.load(workflowPath);
    return JSON.stringify(workflow.definition, null, 2);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/Exporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/Exporter.ts src/core/Exporter.test.ts
git commit -m "feat: add Exporter for cross-platform workflow export

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Global Error Handler for CLI

**Files:**
- Modify: `src/bin/craft.ts`
- Create: `src/utils/errorHandler.ts`
- Create: `src/utils/errorHandler.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/errorHandler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { formatError } from './errorHandler.js';
import { SpecCraftError, WorkflowNotFoundError, ValidationError } from '../errors.js';

describe('errorHandler', () => {
  it('should format SpecCraftError with hint', () => {
    const err = new WorkflowNotFoundError('brainstorm', '/tmp/wf');
    const output = formatError(err);

    expect(output).toContain('WORKFLOW_NOT_FOUND');
    expect(output).toContain('brainstorm');
    expect(output).toContain('Hint');
  });

  it('should format ValidationError with multiple errors', () => {
    const err = new ValidationError(['name is required', 'commands is empty']);
    const output = formatError(err);

    expect(output).toContain('VALIDATION_ERROR');
    expect(output).toContain('name is required');
    expect(output).toContain('commands is empty');
  });

  it('should format generic Error', () => {
    const err = new Error('Something went wrong');
    const output = formatError(err);

    expect(output).toContain('Something went wrong');
  });

  it('should format unknown error', () => {
    const output = formatError('string error');
    expect(output).toContain('unexpected error');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/errorHandler.test.ts`
Expected: FAIL - formatError not defined

**Step 3: Write minimal implementation**

```typescript
// src/utils/errorHandler.ts
import { SpecCraftError } from '../errors.js';

export function formatError(error: unknown): string {
  if (error instanceof SpecCraftError) {
    return error.format();
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `An unexpected error occurred: ${String(error)}`;
}

export function handleError(error: unknown): never {
  console.error(formatError(error));
  process.exit(1);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/errorHandler.test.ts`
Expected: PASS

**Step 5: Update CLI entry point with global error handler**

```typescript
// src/bin/craft.ts
#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../commands/init.js';
import { copyCommand } from '../commands/copy.js';
import { createCommand } from '../commands/create.js';
import { runCommand } from '../commands/run.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';
import { handleError } from '../utils/errorHandler.js';

program
  .name('craft')
  .description('Spec Creator - CLI tool for spec-driven workflows')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(copyCommand);
program.addCommand(createCommand);
program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);

// Global error handler
program.parseAsync().catch(handleError);
```

**Step 6: Commit**

```bash
git add src/utils/errorHandler.ts src/utils/errorHandler.test.ts src/bin/craft.ts
git commit -m "feat: add global error handler with user-friendly formatting

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Final Exports and Index Update

**Files:**
- Modify: `src/index.ts`

**Step 1: Update main export**

```typescript
// src/index.ts
// Core
export { WorkflowLoader } from './core/WorkflowLoader.js';
export { CommandExecutor } from './core/CommandExecutor.js';
export { StateManager } from './core/StateManager.js';
export { TemplateRenderer } from './core/TemplateRenderer.js';
export { DependencyResolver } from './core/DependencyResolver.js';
export { VariablePrompter } from './core/VariablePrompter.js';
export { ChapterManager } from './core/ChapterManager.js';
export { KnowledgeInjector } from './core/KnowledgeInjector.js';
export { SubAgentManager } from './core/SubAgentManager.js';
export { ContextManager } from './core/ContextManager.js';
export { SchemaValidator } from './core/SchemaValidator.js';
export { Exporter } from './core/Exporter.js';

// CLI
export { parseArgs, type ParsedArgs } from './cli.js';

// Errors
export {
  SpecCraftError,
  WorkflowNotFoundError,
  CommandNotFoundError,
  ValidationError,
  DependencyError,
  StateError
} from './errors.js';

// Utils
export { formatError } from './utils/errorHandler.js';
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: update index with all Phase 4 exports

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Phase 4 Integration Test

**Files:**
- Create: `tests/integration/phase4.test.ts`

**Step 1: Write integration test**

```typescript
// tests/integration/phase4.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, access, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { SchemaValidator } from '../../src/core/SchemaValidator.js';
import { Exporter } from '../../src/core/Exporter.js';
import { WorkflowLoader } from '../../src/core/WorkflowLoader.js';
import { copyCommandHandler } from '../../src/commands/copy.js';
import { initCommandHandler } from '../../src/commands/init.js';
import { formatError } from '../../src/utils/errorHandler.js';
import { WorkflowNotFoundError } from '../../src/errors.js';

describe('Integration: Phase 4 - Polish & Templates', () => {
  const testDir = join(process.cwd(), '.test-phase4');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should validate all built-in templates', async () => {
    const validator = new SchemaValidator();
    const loader = new WorkflowLoader();
    const templates = ['brainstorm', 'feature-dev', 'api-design', 'bug-fix', 'quick-prototype'];

    await initCommandHandler(testDir);

    for (const tpl of templates) {
      await copyCommandHandler(tpl, testDir);
      const wf = await loader.load(join(testDir, tpl));
      const result = validator.validateWorkflow(wf.definition);
      expect(result.valid, `Template "${tpl}" should be valid: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('should generate manifest for marketplace with all templates', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('brainstorm', testDir);
    await copyCommandHandler('feature-dev', testDir);
    await copyCommandHandler('api-design', testDir);

    const exporter = new Exporter();
    const manifest = await exporter.generateManifest(testDir);

    expect(manifest.workflows.length).toBeGreaterThanOrEqual(3);
    expect(manifest.generatedAt).toBeDefined();
  });

  it('should export workflow as JSON', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('feature-dev', testDir);

    const exporter = new Exporter();
    const json = await exporter.exportAsJson(join(testDir, 'feature-dev'));
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('feature-dev');
    expect(Object.keys(parsed.commands).length).toBeGreaterThan(5);
  });

  it('should provide user-friendly error messages', () => {
    const err = new WorkflowNotFoundError('nonexistent', '/path');
    const formatted = formatError(err);

    expect(formatted).toContain('WORKFLOW_NOT_FOUND');
    expect(formatted).toContain('nonexistent');
    expect(formatted).toContain('Hint');
  });

  it('should reject invalid workflow with detailed errors', async () => {
    const workflowDir = join(testDir, 'bad-workflow');
    await mkdir(workflowDir);
    await writeFile(join(workflowDir, 'workflow.yaml'), `
version: 1.0.0
commands: {}
`);

    const loader = new WorkflowLoader();
    try {
      await loader.load(workflowDir);
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const message = (err as Error).message;
      expect(message).toContain('name');
      expect(message).toContain('commands');
    }
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- tests/integration/phase4.test.ts`
Expected: PASS

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add tests/integration/phase4.test.ts
git commit -m "test: add Phase 4 integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

Phase 4 delivers:

1. **Schema Validation** - Zod-based validation for workflow.yaml and marketplace.json
2. **Loader Integration** - Schema validation integrated into WorkflowLoader
3. **Error Hierarchy** - Custom error classes with codes and user-friendly hints
4. **api-design Template** - API design workflow (init, define, review, done)
5. **bug-fix Template** - Bug fix workflow (init, reproduce, diagnose, fix, verify)
6. **quick-prototype Template** - Rapid prototyping workflow (init, prototype, test, reflect, refine)
7. **Cross-Platform Exporter** - Manifest generation and JSON export
8. **Global Error Handler** - CLI-wide error formatting
9. **Full Exports** - All modules properly exported
10. **Integration Tests** - End-to-end validation of all features

---

## Project Completion Checklist

After completing all 4 phases, the project should have:

- [ ] `craft init` - Create marketplace
- [ ] `craft copy` - Copy from template library (5 templates)
- [ ] `craft create` - Interactive workflow creation
- [ ] `craft run` - Execute commands with auto-dependency and state tracking
- [ ] `craft list` - List workflows
- [ ] `craft show` - Show workflow details
- [ ] 4 command types: template, execution, query, interactive
- [ ] Dependency resolution with topological sort
- [ ] State management with invalidation
- [ ] Variable prompting for missing inputs
- [ ] Chapter-based document generation
- [ ] Knowledge injection
- [ ] SubAgent parallel execution support
- [ ] Context management suggestions
- [ ] Schema validation with Zod
- [ ] Custom error hierarchy
- [ ] Cross-platform export framework
- [ ] 5 built-in templates: brainstorm, feature-dev, api-design, bug-fix, quick-prototype
- [ ] Comprehensive test suite (unit + integration)
