# SpecCraft Phase 2: Command Types & State Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the MVP CLI with full command type system (template/execution/query/interactive), dependency resolution with auto-execution, state invalidation, multi-instance management, variable prompting, and the feature-dev built-in template.

**Architecture:** Build on Phase 1's core modules. Add DependencyResolver for topological sorting, VariablePrompter for interactive input using @inquirer/prompts, and extend CommandExecutor to handle all four command types. State invalidation propagates through dependency chains.

**Tech Stack:** TypeScript, @inquirer/prompts, vitest (from Phase 1 stack)

**Prerequisite:** Phase 1 must be complete and all tests passing.

---

## Task 1: Extended Type Definitions

**Files:**
- Modify: `src/types/workflow.ts`

**Step 1: Write the failing test**

```typescript
// src/types/workflow.test.ts
import { describe, it, expect } from 'vitest';
import type {
  WorkflowCommand,
  ExecutionConfig,
  WorkflowDefinition,
  CommandType
} from './workflow.js';

describe('Workflow Types', () => {
  it('should support all four command types', () => {
    const types: CommandType[] = ['template', 'execution', 'query', 'interactive'];
    expect(types).toHaveLength(4);
  });

  it('should support execution config', () => {
    const cmd: WorkflowCommand = {
      description: 'Run tests',
      type: 'execution',
      execution: {
        command: 'npm test',
        mode: 'full',
        failFast: true,
        coverage: true
      }
    };
    expect(cmd.type).toBe('execution');
    expect(cmd.execution?.command).toBe('npm test');
  });

  it('should support query checks', () => {
    const cmd: WorkflowCommand = {
      description: 'Validate',
      type: 'query',
      checks: ['spec-completeness', 'test-coverage']
    };
    expect(cmd.checks).toHaveLength(2);
  });

  it('should support dependsOn and autoRunDeps', () => {
    const cmd: WorkflowCommand = {
      description: 'Design',
      type: 'template',
      template: 'templates/design.md',
      output: 'specs/design.md',
      dependsOn: ['spec'],
      autoRunDeps: true
    };
    expect(cmd.dependsOn).toEqual(['spec']);
    expect(cmd.autoRunDeps).toBe(true);
  });

  it('should support contextManagement at workflow level', () => {
    const wf: WorkflowDefinition = {
      name: 'test',
      version: '1.0.0',
      commands: { init: { description: 'init' } },
      contextManagement: {
        tokenThreshold: 8000,
        roundThreshold: 20
      }
    };
    expect(wf.contextManagement?.tokenThreshold).toBe(8000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/types/workflow.test.ts`
Expected: FAIL - types don't exist yet

**Step 3: Update type definitions**

```typescript
// src/types/workflow.ts
export type CommandType = 'template' | 'execution' | 'query' | 'interactive';

export interface WorkflowVariable {
  type: 'string' | 'select' | 'boolean' | 'computed';
  required?: boolean;
  description?: string;
  prompt?: string;
  options?: string[];
  default?: string | boolean;
  formula?: string;
}

export interface ExecutionConfig {
  command?: string;
  mode?: 'incremental' | 'full' | 'dry-run' | 'interactive';
  scope?: 'affected' | 'all';
  validation?: boolean;
  failFast?: boolean;
  coverage?: boolean;
  fix?: boolean;
}

export interface WorkflowCommand {
  description: string;
  type?: CommandType;
  template?: string;
  output?: string;
  dependsOn?: string[];
  autoRunDeps?: boolean;
  execution?: ExecutionConfig;
  checks?: string[];
}

export interface ContextManagement {
  tokenThreshold?: number;
  roundThreshold?: number;
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  description?: string;
  variables?: Record<string, WorkflowVariable>;
  contextManagement?: ContextManagement;
  commands: Record<string, WorkflowCommand>;
}

export interface LoadedWorkflow {
  path: string;
  definition: WorkflowDefinition;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/types/workflow.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/workflow.ts src/types/workflow.test.ts
git commit -m "feat: extend type definitions for command types and execution config

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Dependency Resolver

**Files:**
- Create: `src/core/DependencyResolver.ts`
- Create: `src/core/DependencyResolver.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/DependencyResolver.test.ts
import { describe, it, expect } from 'vitest';
import { DependencyResolver } from './DependencyResolver.js';
import type { WorkflowCommand } from '../types/workflow.js';

describe('DependencyResolver', () => {
  const resolver = new DependencyResolver();

  it('should return command with no dependencies as-is', () => {
    const commands: Record<string, WorkflowCommand> = {
      init: { description: 'Initialize' }
    };
    const order = resolver.resolve(commands, 'init');
    expect(order).toEqual(['init']);
  });

  it('should resolve linear dependency chain', () => {
    const commands: Record<string, WorkflowCommand> = {
      init: { description: 'Initialize' },
      spec: { description: 'Spec', dependsOn: ['init'] },
      design: { description: 'Design', dependsOn: ['spec'] },
      tasks: { description: 'Tasks', dependsOn: ['design'] }
    };
    const order = resolver.resolve(commands, 'tasks');
    expect(order).toEqual(['init', 'spec', 'design', 'tasks']);
  });

  it('should resolve diamond dependency', () => {
    const commands: Record<string, WorkflowCommand> = {
      init: { description: 'Init' },
      a: { description: 'A', dependsOn: ['init'] },
      b: { description: 'B', dependsOn: ['init'] },
      final: { description: 'Final', dependsOn: ['a', 'b'] }
    };
    const order = resolver.resolve(commands, 'final');
    // init should appear before a and b, a and b before final
    expect(order.indexOf('init')).toBeLessThan(order.indexOf('a'));
    expect(order.indexOf('init')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('final'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('final'));
  });

  it('should detect circular dependency', () => {
    const commands: Record<string, WorkflowCommand> = {
      a: { description: 'A', dependsOn: ['b'] },
      b: { description: 'B', dependsOn: ['a'] }
    };
    expect(() => resolver.resolve(commands, 'a')).toThrow('Circular dependency');
  });

  it('should throw for unknown dependency', () => {
    const commands: Record<string, WorkflowCommand> = {
      a: { description: 'A', dependsOn: ['nonexistent'] }
    };
    expect(() => resolver.resolve(commands, 'a')).toThrow('not found');
  });

  it('should get direct dependents of a command', () => {
    const commands: Record<string, WorkflowCommand> = {
      init: { description: 'Init' },
      spec: { description: 'Spec', dependsOn: ['init'] },
      design: { description: 'Design', dependsOn: ['spec'] },
      review: { description: 'Review', dependsOn: ['spec'] }
    };
    const dependents = resolver.getDependents(commands, 'spec');
    expect(dependents.sort()).toEqual(['design', 'review']);
  });

  it('should get all transitive dependents', () => {
    const commands: Record<string, WorkflowCommand> = {
      init: { description: 'Init' },
      spec: { description: 'Spec', dependsOn: ['init'] },
      design: { description: 'Design', dependsOn: ['spec'] },
      tasks: { description: 'Tasks', dependsOn: ['design'] }
    };
    const dependents = resolver.getAllDependents(commands, 'spec');
    expect(dependents.sort()).toEqual(['design', 'tasks']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/DependencyResolver.test.ts`
Expected: FAIL - DependencyResolver not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/DependencyResolver.ts
import type { WorkflowCommand } from '../types/workflow.js';

export class DependencyResolver {
  /**
   * Resolve execution order for a target command, including all dependencies.
   * Returns commands in topological order (dependencies first).
   */
  resolve(commands: Record<string, WorkflowCommand>, target: string): string[] {
    if (!commands[target]) {
      throw new Error(`Command "${target}" not found`);
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving "${name}"`);
      }

      const cmd = commands[name];
      if (!cmd) {
        throw new Error(`Dependency "${name}" not found`);
      }

      visiting.add(name);

      for (const dep of cmd.dependsOn ?? []) {
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    visit(target);
    return order;
  }

  /**
   * Get direct dependents of a command (commands that have it in dependsOn).
   */
  getDependents(commands: Record<string, WorkflowCommand>, source: string): string[] {
    const dependents: string[] = [];
    for (const [name, cmd] of Object.entries(commands)) {
      if (cmd.dependsOn?.includes(source)) {
        dependents.push(name);
      }
    }
    return dependents;
  }

  /**
   * Get all transitive dependents of a command.
   */
  getAllDependents(commands: Record<string, WorkflowCommand>, source: string): string[] {
    const all = new Set<string>();
    const queue = this.getDependents(commands, source);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (all.has(current)) continue;
      all.add(current);
      queue.push(...this.getDependents(commands, current));
    }

    return [...all];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/DependencyResolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/DependencyResolver.ts src/core/DependencyResolver.test.ts
git commit -m "feat: add DependencyResolver with topological sort

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Variable Prompter

**Files:**
- Modify: `package.json` (add @inquirer/prompts)
- Create: `src/core/VariablePrompter.ts`
- Create: `src/core/VariablePrompter.test.ts`

**Step 1: Add dependency**

Run: `npm install @inquirer/prompts`

**Step 2: Write the failing test**

```typescript
// src/core/VariablePrompter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { VariablePrompter } from './VariablePrompter.js';
import type { WorkflowVariable } from '../types/workflow.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn()
}));

import { input, select, confirm } from '@inquirer/prompts';

describe('VariablePrompter', () => {
  const prompter = new VariablePrompter();

  it('should return provided variables without prompting', async () => {
    const variables: Record<string, WorkflowVariable> = {
      topic: { type: 'string', required: true, prompt: 'Enter topic' }
    };
    const provided = { topic: 'my-topic' };

    const result = await prompter.resolveVariables(variables, provided);
    expect(result.topic).toBe('my-topic');
    expect(input).not.toHaveBeenCalled();
  });

  it('should prompt for missing required string variable', async () => {
    vi.mocked(input).mockResolvedValueOnce('user-auth');

    const variables: Record<string, WorkflowVariable> = {
      feature: { type: 'string', required: true, prompt: 'Enter feature name' }
    };

    const result = await prompter.resolveVariables(variables, {});
    expect(input).toHaveBeenCalledWith({ message: 'Enter feature name' });
    expect(result.feature).toBe('user-auth');
  });

  it('should prompt for missing required select variable', async () => {
    vi.mocked(select).mockResolvedValueOnce('P0');

    const variables: Record<string, WorkflowVariable> = {
      priority: {
        type: 'select',
        required: true,
        options: ['P0', 'P1', 'P2', 'P3'],
        prompt: 'Select priority'
      }
    };

    const result = await prompter.resolveVariables(variables, {});
    expect(select).toHaveBeenCalled();
    expect(result.priority).toBe('P0');
  });

  it('should use default value when not required and not provided', async () => {
    const variables: Record<string, WorkflowVariable> = {
      outputDir: { type: 'string', default: 'specs/default' }
    };

    const result = await prompter.resolveVariables(variables, {});
    expect(result.outputDir).toBe('specs/default');
  });

  it('should identify missing required variables', () => {
    const variables: Record<string, WorkflowVariable> = {
      feature: { type: 'string', required: true },
      priority: { type: 'select', required: true, options: ['P0', 'P1'] },
      outputDir: { type: 'string', default: 'specs' }
    };

    const missing = prompter.getMissingRequired(variables, { feature: 'auth' });
    expect(missing).toEqual(['priority']);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- src/core/VariablePrompter.test.ts`
Expected: FAIL - VariablePrompter not defined

**Step 4: Write minimal implementation**

```typescript
// src/core/VariablePrompter.ts
import { input, select, confirm } from '@inquirer/prompts';
import type { WorkflowVariable } from '../types/workflow.js';

export type ResolvedVariables = Record<string, string | number | boolean>;

export class VariablePrompter {
  /**
   * Resolve all variables, prompting for missing required ones.
   */
  async resolveVariables(
    definitions: Record<string, WorkflowVariable>,
    provided: ResolvedVariables
  ): Promise<ResolvedVariables> {
    const resolved: ResolvedVariables = { ...provided };

    for (const [name, def] of Object.entries(definitions)) {
      // Already provided
      if (resolved[name] !== undefined) continue;

      // Has default
      if (def.default !== undefined && !def.required) {
        resolved[name] = def.default;
        continue;
      }

      // Need to prompt
      if (def.required || def.prompt) {
        resolved[name] = await this.promptForVariable(name, def);
      } else if (def.default !== undefined) {
        resolved[name] = def.default;
      }
    }

    return resolved;
  }

  /**
   * Get list of required variable names that are missing from provided values.
   */
  getMissingRequired(
    definitions: Record<string, WorkflowVariable>,
    provided: ResolvedVariables
  ): string[] {
    const missing: string[] = [];
    for (const [name, def] of Object.entries(definitions)) {
      if (def.required && provided[name] === undefined) {
        missing.push(name);
      }
    }
    return missing;
  }

  private async promptForVariable(
    name: string,
    def: WorkflowVariable
  ): Promise<string | boolean> {
    const message = def.prompt ?? `Enter ${name}${def.description ? ` (${def.description})` : ''}`;

    switch (def.type) {
      case 'string':
        return input({
          message,
          default: typeof def.default === 'string' ? def.default : undefined
        });

      case 'select':
        return select({
          message,
          choices: (def.options ?? []).map(opt => ({ name: opt, value: opt }))
        });

      case 'boolean':
        return confirm({
          message,
          default: typeof def.default === 'boolean' ? def.default : false
        });

      case 'computed':
        // Computed variables are resolved later by TemplateRenderer
        return '';

      default:
        return input({ message });
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- src/core/VariablePrompter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json package-lock.json src/core/VariablePrompter.ts src/core/VariablePrompter.test.ts
git commit -m "feat: add VariablePrompter for interactive variable input

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Enhanced CommandExecutor - Execution Type

**Files:**
- Modify: `src/core/CommandExecutor.ts`
- Create: `src/core/CommandExecutor.test.ts` (new comprehensive test)

**Step 1: Write the failing test**

```typescript
// src/core/CommandExecutor.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { CommandExecutor } from './CommandExecutor.js';
import type { WorkflowDefinition } from '../types/workflow.js';

describe('CommandExecutor', () => {
  const testDir = join(process.cwd(), '.test-executor');
  const stateDir = join(testDir, '.craft', 'state');
  let executor: CommandExecutor;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    executor = new CommandExecutor(stateDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('execution type', () => {
    it('should execute shell command and capture result', async () => {
      const workflowDir = join(testDir, 'test-wf');
      await mkdir(workflowDir, { recursive: true });

      const definition: WorkflowDefinition = {
        name: 'test-wf',
        version: '1.0.0',
        commands: {
          test: {
            description: 'Run echo',
            type: 'execution',
            execution: {
              command: 'echo "hello world"'
            }
          }
        }
      };

      const result = await executor.execute({
        workflowPath: workflowDir,
        definition,
        command: 'test',
        variables: { topic: 'test-exec' },
        stateDir
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello world');
    });

    it('should handle execution failure', async () => {
      const workflowDir = join(testDir, 'test-wf');
      await mkdir(workflowDir, { recursive: true });

      const definition: WorkflowDefinition = {
        name: 'test-wf',
        version: '1.0.0',
        commands: {
          lint: {
            description: 'Run failing command',
            type: 'execution',
            execution: {
              command: 'exit 1',
              failFast: true
            }
          }
        }
      };

      const result = await executor.execute({
        workflowPath: workflowDir,
        definition,
        command: 'lint',
        variables: { topic: 'test-fail' },
        stateDir
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('query type', () => {
    it('should return status information', async () => {
      const workflowDir = join(testDir, 'test-wf');
      await mkdir(workflowDir, { recursive: true });

      const definition: WorkflowDefinition = {
        name: 'test-wf',
        version: '1.0.0',
        commands: {
          status: {
            description: 'Show status',
            type: 'query'
          }
        }
      };

      const result = await executor.execute({
        workflowPath: workflowDir,
        definition,
        command: 'status',
        variables: { topic: 'test-query' },
        stateDir
      });

      expect(result.type).toBe('query');
    });
  });

  describe('interactive type', () => {
    it('should return instructions for agent', async () => {
      const workflowDir = join(testDir, 'test-wf');
      await mkdir(workflowDir, { recursive: true });

      const definition: WorkflowDefinition = {
        name: 'test-wf',
        version: '1.0.0',
        commands: {
          brainstorm: {
            description: 'Explore ideas',
            type: 'interactive'
          }
        }
      };

      const result = await executor.execute({
        workflowPath: workflowDir,
        definition,
        command: 'brainstorm',
        variables: { topic: 'test-interactive' },
        stateDir
      });

      expect(result.type).toBe('interactive');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/CommandExecutor.test.ts`
Expected: FAIL - new execute return type fields missing

**Step 3: Update CommandExecutor implementation**

```typescript
// src/core/CommandExecutor.ts
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import type { WorkflowDefinition, CommandType } from '../types/workflow.js';
import { TemplateRenderer, type TemplateVariables } from './TemplateRenderer.js';
import { StateManager } from './StateManager.js';

export interface ExecuteOptions {
  workflowPath: string;
  definition: WorkflowDefinition;
  command: string;
  variables: TemplateVariables;
  stateDir: string;
  force?: boolean;
}

export interface ExecuteResult {
  output?: string;
  type: CommandType;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export class CommandExecutor {
  private renderer: TemplateRenderer;
  private stateManager: StateManager;

  constructor(stateDir: string) {
    this.renderer = new TemplateRenderer();
    this.stateManager = new StateManager(stateDir);
  }

  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    const { workflowPath, definition, command, variables, force } = options;
    const workflowName = definition.name;
    const instanceName = String(variables.topic || variables.feature || 'default');

    // Get command definition
    const cmdDef = definition.commands[command];
    if (!cmdDef) {
      throw new Error(`Command "${command}" not found in workflow "${workflowName}"`);
    }

    const cmdType: CommandType = cmdDef.type ?? (cmdDef.template ? 'template' : 'interactive');

    // Create or load state
    let state = await this.stateManager.loadInstance(workflowName, instanceName);
    if (!state) {
      state = await this.stateManager.createInstance(workflowName, instanceName, variables);
    }

    // Check if already completed
    const cmdState = state.commands[command];
    if (cmdState?.status === 'completed' && !force) {
      console.log(`Command "${command}" already completed. Use --force to re-run.`);
      return { output: cmdState.output, type: cmdType };
    }

    // Update status to in_progress
    await this.stateManager.updateCommandStatus(workflowName, instanceName, command, 'in_progress');

    try {
      let result: ExecuteResult;

      switch (cmdType) {
        case 'template':
          result = await this.executeTemplate(options, cmdDef);
          break;
        case 'execution':
          result = await this.executeExecution(options, cmdDef);
          break;
        case 'query':
          result = await this.executeQuery(options, cmdDef);
          break;
        case 'interactive':
          result = await this.executeInteractive(options, cmdDef);
          break;
        default:
          result = await this.executeTemplate(options, cmdDef);
      }

      // Mark as completed (unless execution failed)
      const status = (result.exitCode !== undefined && result.exitCode !== 0) ? 'failed' : 'completed';
      await this.stateManager.updateCommandStatus(workflowName, instanceName, command, status, {
        output: result.output
      });

      return result;
    } catch (error) {
      await this.stateManager.updateCommandStatus(workflowName, instanceName, command, 'failed');
      throw error;
    }
  }

  private async executeTemplate(
    options: ExecuteOptions,
    cmdDef: { template?: string; output?: string }
  ): Promise<ExecuteResult> {
    const { workflowPath, variables } = options;

    if (!cmdDef.template || !cmdDef.output) {
      return { type: 'template', message: 'No template configured' };
    }

    const templatePath = join(workflowPath, cmdDef.template);
    const renderedOutput = await this.renderer.render(templatePath, {
      ...variables,
      createdAt: new Date().toISOString()
    });

    const outputPath = this.renderer.renderString(cmdDef.output, variables);
    const fullOutputPath = join(process.cwd(), outputPath);

    await mkdir(dirname(fullOutputPath), { recursive: true });
    await writeFile(fullOutputPath, renderedOutput, 'utf-8');

    console.log(`Generated: ${outputPath}`);
    return { output: outputPath, type: 'template' };
  }

  private async executeExecution(
    options: ExecuteOptions,
    cmdDef: { execution?: { command?: string; failFast?: boolean } }
  ): Promise<ExecuteResult> {
    const shellCmd = cmdDef.execution?.command;

    if (!shellCmd) {
      // No explicit command — this is an Agent-directed execution
      return {
        type: 'execution',
        message: 'Agent-directed execution. No shell command configured.',
        exitCode: 0
      };
    }

    try {
      const stdout = execSync(shellCmd, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      console.log(`Executed: ${shellCmd}`);
      return { type: 'execution', exitCode: 0, stdout: stdout.trim() };
    } catch (error: unknown) {
      const err = error as { status?: number; stdout?: string; stderr?: string };
      const exitCode = err.status ?? 1;
      const stdout = typeof err.stdout === 'string' ? err.stdout : '';
      const stderr = typeof err.stderr === 'string' ? err.stderr : '';

      if (cmdDef.execution?.failFast) {
        console.error(`Command failed: ${shellCmd}`);
      }

      return { type: 'execution', exitCode, stdout, stderr };
    }
  }

  private async executeQuery(
    options: ExecuteOptions,
    cmdDef: { checks?: string[] }
  ): Promise<ExecuteResult> {
    const { definition, variables, stateDir } = options;
    const workflowName = definition.name;
    const instanceName = String(variables.topic || variables.feature || 'default');

    const state = await this.stateManager.loadInstance(workflowName, instanceName);
    if (!state) {
      return { type: 'query', message: 'No instance state found' };
    }

    // Build status report
    const lines: string[] = [`Workflow: ${workflowName} (${instanceName})`];

    for (const [cmdName, cmdState] of Object.entries(state.commands)) {
      const statusIcon = {
        pending: '  ',
        in_progress: '  ',
        completed: '  ',
        'needs-update': '  ',
        failed: '  ',
        skipped: '  '
      }[cmdState.status] ?? '  ';
      lines.push(`${statusIcon} ${cmdName}: ${cmdState.status}`);
    }

    const message = lines.join('\n');
    console.log(message);

    return { type: 'query', message };
  }

  private async executeInteractive(
    options: ExecuteOptions,
    _cmdDef: Record<string, unknown>
  ): Promise<ExecuteResult> {
    // Interactive commands are Agent-driven; CLI just marks state
    return {
      type: 'interactive',
      message: 'Interactive command ready. Agent should drive the conversation.'
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/CommandExecutor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/CommandExecutor.ts src/core/CommandExecutor.test.ts
git commit -m "feat: extend CommandExecutor with execution/query/interactive types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: State Invalidation

**Files:**
- Modify: `src/core/StateManager.ts`
- Modify: `src/core/StateManager.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/core/StateManager.test.ts

describe('StateManager - Invalidation', () => {
  const stateDir = join(process.cwd(), '.test-state-inv');
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(stateDir, { recursive: true });
    manager = new StateManager(stateDir);
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('should invalidate all transitive dependents', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    // Simulate completed chain: init -> spec -> design -> tasks
    await manager.updateCommandStatus('wf', 'inst', 'init', 'completed');
    await manager.updateCommandStatus('wf', 'inst', 'spec', 'completed');
    await manager.updateCommandStatus('wf', 'inst', 'design', 'completed');
    await manager.updateCommandStatus('wf', 'inst', 'tasks', 'completed');

    // Invalidate all dependents of spec
    await manager.invalidateDependents('wf', 'inst', 'spec', ['design', 'tasks']);

    const state = await manager.loadInstance('wf', 'inst');
    expect(state?.commands.init.status).toBe('completed'); // upstream unchanged
    expect(state?.commands.spec.status).toBe('completed'); // source unchanged
    expect(state?.commands.design.status).toBe('needs-update');
    expect(state?.commands.design.invalidatedBy).toBe('spec');
    expect(state?.commands.tasks.status).toBe('needs-update');
    expect(state?.commands.tasks.invalidatedBy).toBe('spec');
  });

  it('should not invalidate pending commands', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    await manager.updateCommandStatus('wf', 'inst', 'init', 'completed');
    // tasks is still pending

    await manager.invalidateDependents('wf', 'inst', 'init', ['tasks']);

    const state = await manager.loadInstance('wf', 'inst');
    // pending stays pending, not needs-update
    expect(state?.commands.tasks).toBeUndefined();
  });

  it('should preserve output path when invalidated', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    await manager.updateCommandStatus('wf', 'inst', 'spec', 'completed', {
      output: 'specs/inst/spec.md'
    });

    await manager.invalidateDependents('wf', 'inst', 'init', ['spec']);

    const state = await manager.loadInstance('wf', 'inst');
    expect(state?.commands.spec.status).toBe('needs-update');
    expect(state?.commands.spec.output).toBe('specs/inst/spec.md'); // preserved
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/StateManager.test.ts`
Expected: FAIL - new invalidation tests fail

**Step 3: The existing `invalidateDependents` already handles the core logic. Verify that the tests pass with the existing implementation. If they don't, adjust the implementation to skip commands that don't exist in state (pending commands that were never started).**

The existing implementation in Phase 1 only invalidates commands with status `completed`. We need to extend it to also invalidate `in_progress` and `needs-update` commands, but skip commands that have no state entry (never started = truly pending).

```typescript
// Update invalidateDependents in src/core/StateManager.ts
async invalidateDependents(
  workflow: string,
  instance: string,
  sourceCommand: string,
  dependents: string[]
): Promise<void> {
  const state = await this.loadInstance(workflow, instance);
  if (!state) return;

  const now = new Date().toISOString();

  for (const dep of dependents) {
    const cmdState = state.commands[dep];
    // Only invalidate commands that have state and are completed or in_progress
    if (cmdState && (cmdState.status === 'completed' || cmdState.status === 'in_progress')) {
      state.commands[dep] = {
        ...cmdState,
        previousStatus: cmdState.status,
        status: 'needs-update',
        invalidatedBy: sourceCommand,
        invalidatedAt: now
      };
    }
  }

  state.updatedAt = now;
  await this.saveState(this.getStatePath(workflow, instance), state);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/StateManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/StateManager.ts src/core/StateManager.test.ts
git commit -m "feat: enhance state invalidation with transitive dependent support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Auto-Dependency Execution in Run Command

**Files:**
- Modify: `src/commands/run.ts`
- Modify: `src/commands/run.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/commands/run.test.ts

describe('run command - auto dependency', () => {
  const testDir = join(process.cwd(), '.test-run-deps');
  const stateDir = join(testDir, '.craft', 'state');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should auto-execute dependencies before target command', async () => {
    const workflowDir = join(testDir, 'dep-wf');
    await mkdir(join(workflowDir, 'templates'), { recursive: true });

    const workflowYaml = `
name: dep-wf
version: 1.0.0
variables:
  topic:
    type: string
    required: true
commands:
  init:
    description: Initialize
    type: template
    template: templates/init.md
    output: "specs/{{topic}}/init.md"
  spec:
    description: Spec
    type: template
    template: templates/spec.md
    output: "specs/{{topic}}/spec.md"
    dependsOn: [init]
`;

    await writeFile(join(workflowDir, 'workflow.yaml'), workflowYaml);
    await writeFile(join(workflowDir, 'templates', 'init.md'), '# Init: {{topic}}');
    await writeFile(join(workflowDir, 'templates', 'spec.md'), '# Spec: {{topic}}');

    // Run spec directly — should auto-run init first
    await runCommandHandler({
      workflowPath: workflowDir,
      command: 'spec',
      variables: { topic: 'auto-test' },
      stateDir,
      auto: true
    });

    // Both outputs should exist
    const initPath = join(testDir, 'specs', 'auto-test', 'init.md');
    const specPath = join(testDir, 'specs', 'auto-test', 'spec.md');
    await expect(access(initPath)).resolves.toBeUndefined();
    await expect(access(specPath)).resolves.toBeUndefined();
  });

  it('should throw when dependency not met and auto is disabled', async () => {
    const workflowDir = join(testDir, 'dep-wf');
    await mkdir(join(workflowDir, 'templates'), { recursive: true });

    const workflowYaml = `
name: dep-wf
version: 1.0.0
variables:
  topic:
    type: string
    required: true
commands:
  init:
    description: Initialize
    type: template
    template: templates/init.md
    output: "specs/{{topic}}/init.md"
  spec:
    description: Spec
    dependsOn: [init]
`;

    await writeFile(join(workflowDir, 'workflow.yaml'), workflowYaml);
    await writeFile(join(workflowDir, 'templates', 'init.md'), '# Init');

    await expect(runCommandHandler({
      workflowPath: workflowDir,
      command: 'spec',
      variables: { topic: 'no-auto' },
      stateDir,
      auto: false
    })).rejects.toThrow('depends on');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/commands/run.test.ts`
Expected: FAIL - auto dependency logic not implemented

**Step 3: Update run command**

```typescript
// src/commands/run.ts
import { Command } from 'commander';
import { WorkflowLoader } from '../core/WorkflowLoader.js';
import { CommandExecutor } from '../core/CommandExecutor.js';
import { DependencyResolver } from '../core/DependencyResolver.js';
import { StateManager } from '../core/StateManager.js';
import { join } from 'path';

export interface RunOptions {
  workflowPath: string;
  command: string;
  variables: Record<string, string | number | boolean>;
  stateDir: string;
  force?: boolean;
  auto?: boolean;
}

export const runCommand = new Command('run')
  .description('Run a workflow command')
  .argument('<workflow>', 'Workflow name')
  .argument('<command>', 'Command to run')
  .argument('[args...]', 'Command arguments')
  .option('-f, --force', 'Force re-execution')
  .option('--no-auto', 'Skip automatic dependency execution')
  .option('--state-dir <dir>', 'State directory', '.craft/state')
  .action(async (workflow: string, command: string, args: string[], options: {
    force?: boolean;
    auto: boolean;
    stateDir: string;
  }) => {
    const workflowPath = join(process.cwd(), workflow);

    await runCommandHandler({
      workflowPath,
      command,
      variables: { topic: args[0] || 'default' },
      stateDir: options.stateDir,
      force: options.force,
      auto: options.auto
    });
  });

export async function runCommandHandler(options: RunOptions): Promise<{ output?: string }> {
  const { workflowPath, command, variables, stateDir, force, auto = true } = options;

  // Load workflow
  const loader = new WorkflowLoader();
  const workflow = await loader.load(workflowPath);
  const definition = workflow.definition;

  // Resolve dependency chain
  const resolver = new DependencyResolver();
  const executionOrder = resolver.resolve(definition.commands, command);

  // Check which dependencies need to run
  const stateManager = new StateManager(stateDir);
  const instanceName = String(variables.topic || variables.feature || 'default');
  const state = await stateManager.loadInstance(definition.name, instanceName);

  const needsExecution: string[] = [];
  for (const cmd of executionOrder) {
    const cmdState = state?.commands[cmd];
    const isTarget = cmd === command;
    const isCompleted = cmdState?.status === 'completed';

    if (isTarget) {
      needsExecution.push(cmd);
    } else if (!isCompleted) {
      needsExecution.push(cmd);
    }
  }

  // Check if we have unmet dependencies
  const depsToRun = needsExecution.filter(cmd => cmd !== command);
  if (depsToRun.length > 0 && !auto) {
    throw new Error(
      `Command "${command}" depends on: ${depsToRun.join(', ')}. ` +
      `Run them first or use --auto.`
    );
  }

  // Execute in order
  const executor = new CommandExecutor(stateDir);
  let lastResult: { output?: string } = {};

  for (const cmd of needsExecution) {
    const isForced = cmd === command && force;
    lastResult = await executor.execute({
      workflowPath,
      definition,
      command: cmd,
      variables,
      stateDir,
      force: isForced
    });
  }

  // If force re-executed target, invalidate dependents
  if (force) {
    const allDependents = resolver.getAllDependents(definition.commands, command);
    if (allDependents.length > 0) {
      await stateManager.invalidateDependents(
        definition.name,
        instanceName,
        command,
        allDependents
      );
      console.log(`Marked as needs-update: ${allDependents.join(', ')}`);
    }
  }

  return lastResult;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/commands/run.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/run.ts src/commands/run.test.ts
git commit -m "feat: add auto-dependency execution and state invalidation to run command

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: craft list Command

**Files:**
- Create: `src/commands/list.ts`
- Create: `src/commands/list.test.ts`

**Step 1: Write the failing test**

```typescript
// src/commands/list.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { listCommandHandler } from './list.js';

describe('list command', () => {
  const testDir = join(process.cwd(), '.test-list');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should list all workflows in marketplace', async () => {
    // Create two workflows
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
description: Feature development
commands:
  init:
    description: Init
`);

    const workflows = await listCommandHandler(testDir);
    expect(workflows).toHaveLength(2);
    expect(workflows.map(w => w.name).sort()).toEqual(['brainstorm', 'feature-dev']);
  });

  it('should return empty list for empty marketplace', async () => {
    const workflows = await listCommandHandler(testDir);
    expect(workflows).toHaveLength(0);
  });

  it('should skip directories without workflow.yaml', async () => {
    await mkdir(join(testDir, 'random-dir'), { recursive: true });
    await writeFile(join(testDir, 'random-dir', 'README.md'), 'Not a workflow');

    const workflows = await listCommandHandler(testDir);
    expect(workflows).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/commands/list.test.ts`
Expected: FAIL - listCommandHandler not defined

**Step 3: Write minimal implementation**

```typescript
// src/commands/list.ts
import { readdir, access } from 'fs/promises';
import { join } from 'path';
import { Command } from 'commander';
import { WorkflowLoader } from '../core/WorkflowLoader.js';

export interface WorkflowSummary {
  name: string;
  version: string;
  description?: string;
  commands: string[];
  path: string;
}

export const listCommand = new Command('list')
  .description('List all workflows in marketplace')
  .option('-d, --directory <dir>', 'Marketplace directory', '.')
  .action(async (options: { directory: string }) => {
    const workflows = await listCommandHandler(options.directory);

    if (workflows.length === 0) {
      console.log('No workflows found.');
      return;
    }

    console.log('Workflows:\n');
    for (const wf of workflows) {
      console.log(`  ${wf.name} (v${wf.version})`);
      if (wf.description) {
        console.log(`    ${wf.description}`);
      }
      console.log(`    Commands: ${wf.commands.join(', ')}`);
      console.log();
    }
  });

export async function listCommandHandler(marketplacePath: string): Promise<WorkflowSummary[]> {
  const entries = await readdir(marketplacePath, { withFileTypes: true });
  const loader = new WorkflowLoader();
  const workflows: WorkflowSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const workflowPath = join(marketplacePath, entry.name);
    const yamlPath = join(workflowPath, 'workflow.yaml');

    try {
      await access(yamlPath);
    } catch {
      continue; // Skip directories without workflow.yaml
    }

    try {
      const loaded = await loader.load(workflowPath);
      workflows.push({
        name: loaded.definition.name,
        version: loaded.definition.version,
        description: loaded.definition.description,
        commands: Object.keys(loaded.definition.commands),
        path: workflowPath
      });
    } catch {
      // Skip invalid workflows
    }
  }

  return workflows;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/commands/list.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/list.ts src/commands/list.test.ts
git commit -m "feat: add craft list command to show marketplace workflows

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: craft show Command

**Files:**
- Create: `src/commands/show.ts`
- Create: `src/commands/show.test.ts`

**Step 1: Write the failing test**

```typescript
// src/commands/show.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { showCommandHandler } from './show.js';

describe('show command', () => {
  const testDir = join(process.cwd(), '.test-show');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should show workflow details', async () => {
    await mkdir(join(testDir, 'brainstorm'), { recursive: true });
    await writeFile(join(testDir, 'brainstorm', 'workflow.yaml'), `
name: brainstorm
version: 1.0.0
description: Brainstorm ideas
variables:
  topic:
    type: string
    required: true
    description: Topic name
commands:
  init:
    description: Initialize
    type: template
    template: templates/init.md
    output: "specs/{{topic}}/init.md"
  next:
    description: Continue
    type: interactive
    dependsOn: [init]
  done:
    description: Finish
    dependsOn: [init]
`);

    const detail = await showCommandHandler(join(testDir, 'brainstorm'));
    expect(detail.name).toBe('brainstorm');
    expect(detail.commands).toHaveLength(3);
    expect(detail.variables).toHaveLength(1);
    expect(detail.variables[0].name).toBe('topic');
    expect(detail.commands[0].name).toBe('init');
    expect(detail.commands[1].dependsOn).toEqual(['init']);
  });

  it('should throw for invalid workflow path', async () => {
    await expect(showCommandHandler('/nonexistent/path')).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/commands/show.test.ts`
Expected: FAIL - showCommandHandler not defined

**Step 3: Write minimal implementation**

```typescript
// src/commands/show.ts
import { Command } from 'commander';
import { join } from 'path';
import { WorkflowLoader } from '../core/WorkflowLoader.js';

export interface WorkflowDetail {
  name: string;
  version: string;
  description?: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  commands: Array<{
    name: string;
    description: string;
    type: string;
    dependsOn?: string[];
  }>;
}

export const showCommand = new Command('show')
  .description('Show workflow details')
  .argument('<workflow>', 'Workflow name or path')
  .action(async (workflow: string) => {
    const workflowPath = join(process.cwd(), workflow);
    const detail = await showCommandHandler(workflowPath);

    console.log(`\n${detail.name} v${detail.version}`);
    if (detail.description) console.log(`  ${detail.description}`);

    if (detail.variables.length > 0) {
      console.log('\nVariables:');
      for (const v of detail.variables) {
        const req = v.required ? ' (required)' : '';
        console.log(`  ${v.name}: ${v.type}${req}`);
        if (v.description) console.log(`    ${v.description}`);
      }
    }

    console.log('\nCommands:');
    for (const cmd of detail.commands) {
      const deps = cmd.dependsOn?.length ? ` [depends: ${cmd.dependsOn.join(', ')}]` : '';
      console.log(`  ${cmd.name} (${cmd.type}) - ${cmd.description}${deps}`);
    }
    console.log();
  });

export async function showCommandHandler(workflowPath: string): Promise<WorkflowDetail> {
  const loader = new WorkflowLoader();
  const workflow = await loader.load(workflowPath);
  const def = workflow.definition;

  const variables = Object.entries(def.variables ?? {}).map(([name, v]) => ({
    name,
    type: v.type,
    required: v.required ?? false,
    description: v.description
  }));

  const commands = Object.entries(def.commands).map(([name, cmd]) => ({
    name,
    description: cmd.description,
    type: cmd.type ?? (cmd.template ? 'template' : 'interactive'),
    dependsOn: cmd.dependsOn
  }));

  return {
    name: def.name,
    version: def.version,
    description: def.description,
    variables,
    commands
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/commands/show.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/show.ts src/commands/show.test.ts
git commit -m "feat: add craft show command for workflow details

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Feature-dev Built-in Template

**Files:**
- Create: `templates/feature-dev/SKILL.md`
- Create: `templates/feature-dev/workflow.yaml`
- Create: `templates/feature-dev/templates/init.md`
- Create: `templates/feature-dev/templates/spec.md`
- Create: `templates/feature-dev/templates/design.md`
- Create: `templates/feature-dev/templates/tasks.md`

**Step 1: Create workflow.yaml**

```yaml
# templates/feature-dev/workflow.yaml
name: feature-dev
version: 1.0.0
description: 标准功能开发流程（文档 + 代码混合）

variables:
  feature:
    type: string
    required: true
    description: 功能名称
    prompt: 请输入功能名称
  priority:
    type: select
    options: [P0, P1, P2, P3]
    default: P2
    description: 优先级
    prompt: 请选择优先级
  outputDir:
    type: string
    default: "specs/{{feature}}"

commands:
  init:
    type: template
    description: 初始化功能开发
    template: templates/init.md
    output: "{{outputDir}}/init.md"

  spec:
    type: template
    description: 生成需求规格
    template: templates/spec.md
    output: "{{outputDir}}/spec.md"
    dependsOn: [init]

  design:
    type: template
    description: 生成技术设计
    template: templates/design.md
    output: "{{outputDir}}/design.md"
    dependsOn: [spec]

  tasks:
    type: template
    description: 生成任务列表
    template: templates/tasks.md
    output: "{{outputDir}}/tasks.md"
    dependsOn: [design]

  implement:
    type: execution
    description: 实现代码
    dependsOn: [tasks]
    execution:
      mode: incremental

  test:
    type: execution
    description: 运行测试
    dependsOn: [implement]
    execution:
      command: npm test
      coverage: true

  validate:
    type: query
    description: 验证完整性
    dependsOn: [test]
    checks:
      - spec-completeness
      - test-coverage
      - no-todo-comments

  fix:
    type: execution
    description: 修复问题
    dependsOn: [validate]
    execution:
      mode: interactive

  status:
    type: query
    description: 查看当前状态
```

**Step 2: Create SKILL.md**

```markdown
# templates/feature-dev/SKILL.md
# Feature-dev 工作流

标准功能开发流程，涵盖从需求规格到代码实现的完整链路。

## 何时使用

- 开发一个新功能
- 需要系统性地从需求到实现
- 希望有清晰的文档和代码关联

## 使用方式

使用 `craft run feature-dev <command>` 执行命令：

### 初始化

```bash
craft run feature-dev init <feature-name>
```

创建功能开发目录，记录基本信息。

### 需求规格

```bash
craft run feature-dev spec
```

生成详细的需求规格文档。

### 技术设计

```bash
craft run feature-dev design
```

基于需求规格，生成技术设计文档。

### 任务列表

```bash
craft run feature-dev tasks
```

将技术设计拆解为可执行的任务列表。

### 实现代码

```bash
craft run feature-dev implement
```

按照任务列表实现代码。

### 运行测试

```bash
craft run feature-dev test
```

运行测试验证实现。

### 验证

```bash
craft run feature-dev validate
```

检查需求覆盖度、测试覆盖率等。

### 修复

```bash
craft run feature-dev fix
```

根据验证结果修复问题。

### 查看状态

```bash
craft run feature-dev status
```

查看当前开发进度。

## 流程建议

1. `init` → 记录功能名称和优先级
2. `spec` → 编写需求规格
3. `design` → 完成技术设计
4. `tasks` → 拆分任务
5. `implement` → 实现代码
6. `test` → 运行测试
7. `validate` → 验证完整性
8. 如有问题 → `fix` → 重新 `test`

## 产出

- `specs/<feature>/init.md` — 功能概述
- `specs/<feature>/spec.md` — 需求规格
- `specs/<feature>/design.md` — 技术设计
- `specs/<feature>/tasks.md` — 任务列表
```

**Step 3: Create template files**

```markdown
# templates/feature-dev/templates/init.md
# {{feature}} - 功能开发

> 创建时间: {{createdAt}}
> 优先级: {{priority}}

---

## 功能概述

<!-- 一句话描述这个功能 -->

## 背景与动机

<!-- 为什么需要这个功能？ -->

## 目标用户

<!-- 谁会使用这个功能？ -->

## 成功指标

<!-- 如何衡量这个功能是否成功？ -->

## 约束与限制

<!-- 有哪些技术或业务约束？ -->
```

```markdown
# templates/feature-dev/templates/spec.md
# {{feature}} - 需求规格

> 基于: init.md
> 创建时间: {{createdAt}}

---

## 用户故事

<!-- 以"作为...我想要...以便..."格式描述 -->

## 功能需求

### 核心功能

<!-- 必须实现的功能点 -->

### 扩展功能

<!-- 可选的增强功能 -->

## 非功能需求

- 性能:
- 安全:
- 兼容性:

## 边界情况

<!-- 列出需要处理的边界情况 -->

## 验收标准

<!-- 明确的、可测试的验收条件 -->
```

```markdown
# templates/feature-dev/templates/design.md
# {{feature}} - 技术设计

> 基于: spec.md
> 创建时间: {{createdAt}}

---

## 架构概述

<!-- 高层架构描述 -->

## 数据模型

<!-- 数据结构和存储设计 -->

## 接口设计

<!-- API/接口定义 -->

## 技术方案

<!-- 详细的技术实现方案 -->

## 依赖分析

<!-- 外部依赖和内部依赖 -->

## 风险与缓解

<!-- 技术风险和缓解策略 -->
```

```markdown
# templates/feature-dev/templates/tasks.md
# {{feature}} - 任务列表

> 基于: design.md
> 创建时间: {{createdAt}}

---

## 任务拆分原则

- 每个任务可独立完成和测试
- 任务粒度: 2-4 小时
- 按依赖关系排序

## 任务列表

### Phase 1: 基础设施

- [ ] Task 1.1:
- [ ] Task 1.2:

### Phase 2: 核心实现

- [ ] Task 2.1:
- [ ] Task 2.2:

### Phase 3: 测试与完善

- [ ] Task 3.1: 编写单元测试
- [ ] Task 3.2: 编写集成测试
- [ ] Task 3.3: 代码审查和优化
```

**Step 4: Commit**

```bash
git add templates/feature-dev/
git commit -m "feat: add feature-dev built-in template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Wire Up New Commands to CLI Entry Point

**Files:**
- Modify: `src/bin/craft.ts`
- Modify: `src/index.ts`

**Step 1: Update bin entry point**

```typescript
// src/bin/craft.ts
#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../commands/init.js';
import { copyCommand } from '../commands/copy.js';
import { runCommand } from '../commands/run.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';

program
  .name('craft')
  .description('Spec Creator - CLI tool for spec-driven workflows')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(copyCommand);
program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);

program.parse();
```

**Step 2: Update main export**

```typescript
// src/index.ts
export { parseArgs, type ParsedArgs } from './cli.js';
export { WorkflowLoader } from './core/WorkflowLoader.js';
export { CommandExecutor } from './core/CommandExecutor.js';
export { StateManager } from './core/StateManager.js';
export { TemplateRenderer } from './core/TemplateRenderer.js';
export { DependencyResolver } from './core/DependencyResolver.js';
export { VariablePrompter } from './core/VariablePrompter.js';
```

**Step 3: Commit**

```bash
git add src/bin/craft.ts src/index.ts
git commit -m "feat: wire up list, show commands and new exports

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Phase 2 Integration Test

**Files:**
- Create: `tests/integration/phase2.test.ts`

**Step 1: Write integration test**

```typescript
// tests/integration/phase2.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, access, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { initCommandHandler } from '../../src/commands/init.js';
import { copyCommandHandler } from '../../src/commands/copy.js';
import { runCommandHandler } from '../../src/commands/run.js';
import { listCommandHandler } from '../../src/commands/list.js';
import { showCommandHandler } from '../../src/commands/show.js';
import { StateManager } from '../../src/core/StateManager.js';

describe('Integration: Phase 2 - Command Types & State', () => {
  const testDir = join(process.cwd(), '.test-phase2');
  const stateDir = join(testDir, '.craft', 'state');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should list workflows after copy', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('brainstorm', testDir);
    await copyCommandHandler('feature-dev', testDir);

    const workflows = await listCommandHandler(testDir);
    expect(workflows).toHaveLength(2);
  });

  it('should show workflow details', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('feature-dev', testDir);

    const detail = await showCommandHandler(join(testDir, 'feature-dev'));
    expect(detail.name).toBe('feature-dev');
    expect(detail.commands.length).toBeGreaterThan(5);
  });

  it('should auto-execute dependency chain for feature-dev', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('feature-dev', testDir);

    const workflowPath = join(testDir, 'feature-dev');

    // Run spec directly — should auto-run init first
    await runCommandHandler({
      workflowPath,
      command: 'spec',
      variables: { feature: 'auth', priority: 'P0' },
      stateDir,
      auto: true
    });

    // Both init and spec outputs should exist
    const initPath = join(testDir, 'specs', 'auth', 'init.md');
    const specPath = join(testDir, 'specs', 'auth', 'spec.md');
    await expect(access(initPath)).resolves.toBeUndefined();
    await expect(access(specPath)).resolves.toBeUndefined();
  });

  it('should invalidate dependents on force re-execution', async () => {
    await initCommandHandler(testDir);
    await copyCommandHandler('feature-dev', testDir);

    const workflowPath = join(testDir, 'feature-dev');
    const vars = { feature: 'inv-test', priority: 'P1' };

    // Run init, spec, design in sequence
    await runCommandHandler({ workflowPath, command: 'init', variables: vars, stateDir });
    await runCommandHandler({ workflowPath, command: 'spec', variables: vars, stateDir });
    await runCommandHandler({ workflowPath, command: 'design', variables: vars, stateDir });

    // Force re-run spec
    await runCommandHandler({ workflowPath, command: 'spec', variables: vars, stateDir, force: true });

    // design should be needs-update
    const sm = new StateManager(stateDir);
    const state = await sm.loadInstance('feature-dev', 'inv-test');
    expect(state?.commands.design.status).toBe('needs-update');
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- tests/integration/phase2.test.ts`
Expected: PASS

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add tests/integration/phase2.test.ts
git commit -m "test: add Phase 2 integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

Phase 2 delivers:

1. **Extended Types** - Full command type system (template/execution/query/interactive)
2. **Dependency Resolver** - Topological sort with circular dependency detection
3. **Variable Prompter** - Interactive prompting for missing required variables
4. **Enhanced CommandExecutor** - Handles all four command types
5. **State Invalidation** - Transitive dependent invalidation on force re-execution
6. **Auto-Dependency Execution** - Run command auto-executes unmet dependencies
7. **craft list** - List all workflows in marketplace
8. **craft show** - Show workflow details
9. **Feature-dev Template** - Full feature development workflow template
10. **CLI Integration** - All new commands wired up
11. **Integration Tests** - End-to-end verification

**Next Phase:** Chapter-based document generation, knowledge injection, SubAgent support, context management, craft create.
