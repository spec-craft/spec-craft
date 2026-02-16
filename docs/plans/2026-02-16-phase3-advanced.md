# SpecCraft Phase 3: Advanced Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add chapter-based document generation, knowledge injection, SubAgent support, context compression suggestions, and the `craft create` interactive workflow creation command.

**Architecture:** Extend the CommandExecutor with a ChapterManager for incremental document generation, a KnowledgeInjector for loading and cleaning knowledge blocks, and a SubAgentManager for parallel task delegation. Add ContextManager for tracking conversation length. The `craft create` command uses VariablePrompter patterns for interactive workflow scaffolding.

**Tech Stack:** TypeScript, node-fetch (for URL knowledge sources), vitest (from existing stack)

**Prerequisite:** Phase 2 must be complete and all tests passing.

---

## Task 1: Chapter System Types

**Files:**
- Modify: `src/types/workflow.ts`
- Create: `src/types/chapter.ts`

**Step 1: Write the failing test**

```typescript
// src/types/chapter.test.ts
import { describe, it, expect } from 'vitest';
import type { ChapterDefinition, ChapterGroup, ChapterState } from './chapter.js';
import type { WorkflowCommand } from './workflow.js';

describe('Chapter Types', () => {
  it('should define chapter structure', () => {
    const chapter: ChapterDefinition = {
      id: 'background',
      title: 'Background & Goals',
      description: 'Describe the background'
    };
    expect(chapter.id).toBe('background');
  });

  it('should define chapter groups', () => {
    const group: ChapterGroup = {
      name: 'phase-1',
      description: 'Phase 1: Understanding requirements',
      chapters: ['background', 'user-stories']
    };
    expect(group.chapters).toHaveLength(2);
  });

  it('should track chapter state', () => {
    const state: ChapterState = {
      id: 'background',
      status: 'completed',
      completedAt: '2026-02-16T10:00:00Z'
    };
    expect(state.status).toBe('completed');
  });

  it('should support chapters in WorkflowCommand', () => {
    const cmd: WorkflowCommand = {
      description: 'Generate design',
      type: 'template',
      template: 'templates/design.md',
      output: 'specs/design.md',
      chapters: [
        { id: 'background', title: 'Background' },
        { id: 'user-stories', title: 'User Stories' }
      ],
      chapterGroups: [
        { name: 'phase-1', description: 'Phase 1', chapters: ['background', 'user-stories'] }
      ]
    };
    expect(cmd.chapters).toHaveLength(2);
    expect(cmd.chapterGroups).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/types/chapter.test.ts`
Expected: FAIL - chapter types not defined

**Step 3: Create chapter types**

```typescript
// src/types/chapter.ts
export interface ChapterDefinition {
  id: string;
  title: string;
  description?: string;
}

export interface ChapterGroup {
  name: string;
  description?: string;
  chapters: string[];
}

export type ChapterStatus = 'pending' | 'in_progress' | 'completed' | 'needs-update';

export interface ChapterState {
  id: string;
  status: ChapterStatus;
  startedAt?: string;
  completedAt?: string;
}
```

**Step 4: Update workflow types to include chapters**

```typescript
// Add to src/types/workflow.ts - WorkflowCommand interface
import type { ChapterDefinition, ChapterGroup } from './chapter.js';

// Add these fields to WorkflowCommand:
//   chapters?: ChapterDefinition[];
//   chapterGroups?: ChapterGroup[];
//   injectKnowledge?: KnowledgeInjection[];
//   subAgents?: SubAgentDefinition[];
```

Update `WorkflowCommand` in `src/types/workflow.ts`:

```typescript
export interface KnowledgeInjection {
  id: string;
  source: string;
  skill?: string;
  removeFromOutput?: boolean;
}

export interface SubAgentDefinition {
  id: string;
  name?: string;
  prompt: string;
  dependsOn?: string[];
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
  chapters?: ChapterDefinition[];
  chapterGroups?: ChapterGroup[];
  injectKnowledge?: KnowledgeInjection[];
  subAgents?: SubAgentDefinition[];
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- src/types/chapter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types/chapter.ts src/types/chapter.test.ts src/types/workflow.ts
git commit -m "feat: add chapter, knowledge injection, and subagent type definitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Chapter Manager

**Files:**
- Create: `src/core/ChapterManager.ts`
- Create: `src/core/ChapterManager.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/ChapterManager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { ChapterManager } from './ChapterManager.js';
import type { ChapterDefinition, ChapterGroup } from '../types/chapter.js';

describe('ChapterManager', () => {
  const testDir = join(process.cwd(), '.test-chapters');
  let manager: ChapterManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new ChapterManager();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should get next chapter group to generate', () => {
    const chapters: ChapterDefinition[] = [
      { id: 'background', title: 'Background' },
      { id: 'user-stories', title: 'User Stories' },
      { id: 'requirements', title: 'Requirements' },
      { id: 'acceptance', title: 'Acceptance Criteria' }
    ];
    const groups: ChapterGroup[] = [
      { name: 'phase-1', chapters: ['background', 'user-stories'] },
      { name: 'phase-2', chapters: ['requirements', 'acceptance'] }
    ];
    const completedChapters: string[] = [];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next?.name).toBe('phase-1');
    expect(next?.chapters).toEqual(['background', 'user-stories']);
  });

  it('should return next group when first is completed', () => {
    const chapters: ChapterDefinition[] = [
      { id: 'background', title: 'Background' },
      { id: 'user-stories', title: 'User Stories' },
      { id: 'requirements', title: 'Requirements' }
    ];
    const groups: ChapterGroup[] = [
      { name: 'phase-1', chapters: ['background', 'user-stories'] },
      { name: 'phase-2', chapters: ['requirements'] }
    ];
    const completedChapters = ['background', 'user-stories'];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next?.name).toBe('phase-2');
  });

  it('should return null when all groups are completed', () => {
    const chapters: ChapterDefinition[] = [
      { id: 'background', title: 'Background' }
    ];
    const groups: ChapterGroup[] = [
      { name: 'phase-1', chapters: ['background'] }
    ];
    const completedChapters = ['background'];

    const next = manager.getNextGroup(chapters, groups, completedChapters);
    expect(next).toBeNull();
  });

  it('should get specific chapters by ids', () => {
    const chapters: ChapterDefinition[] = [
      { id: 'background', title: 'Background' },
      { id: 'user-stories', title: 'User Stories' },
      { id: 'requirements', title: 'Requirements' }
    ];

    const selected = manager.getChaptersByIds(chapters, ['background', 'requirements']);
    expect(selected).toHaveLength(2);
    expect(selected[0].id).toBe('background');
    expect(selected[1].id).toBe('requirements');
  });

  it('should merge chapter content into existing document', async () => {
    const existingPath = join(testDir, 'design.md');
    await writeFile(existingPath, `# Design

## Background

Existing background content.

## User Stories

<!-- pending -->
`);

    const newChapterContent = `## User Stories

As a user, I want to login.`;

    const merged = await manager.mergeChapter(existingPath, 'User Stories', newChapterContent);
    expect(merged).toContain('Existing background content');
    expect(merged).toContain('As a user, I want to login');
    expect(merged).not.toContain('<!-- pending -->');
  });

  it('should append chapter if section not found', async () => {
    const existingPath = join(testDir, 'design.md');
    await writeFile(existingPath, '# Design\n\n## Background\n\nSome content.\n');

    const newChapter = '## New Section\n\nNew content here.';

    const merged = await manager.mergeChapter(existingPath, 'New Section', newChapter);
    expect(merged).toContain('Some content.');
    expect(merged).toContain('New content here.');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/ChapterManager.test.ts`
Expected: FAIL - ChapterManager not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/ChapterManager.ts
import { readFile } from 'fs/promises';
import type { ChapterDefinition, ChapterGroup } from '../types/chapter.js';

export class ChapterManager {
  /**
   * Get the next chapter group that hasn't been fully completed.
   */
  getNextGroup(
    chapters: ChapterDefinition[],
    groups: ChapterGroup[],
    completedChapterIds: string[]
  ): ChapterGroup | null {
    for (const group of groups) {
      const allCompleted = group.chapters.every(id => completedChapterIds.includes(id));
      if (!allCompleted) {
        return group;
      }
    }
    return null;
  }

  /**
   * Get chapter definitions by their IDs.
   */
  getChaptersByIds(
    chapters: ChapterDefinition[],
    ids: string[]
  ): ChapterDefinition[] {
    return ids
      .map(id => chapters.find(c => c.id === id))
      .filter((c): c is ChapterDefinition => c !== undefined);
  }

  /**
   * Merge new chapter content into an existing document.
   * Replaces the section if found, appends if not.
   */
  async mergeChapter(
    filePath: string,
    sectionTitle: string,
    newContent: string
  ): Promise<string> {
    const existing = await readFile(filePath, 'utf-8');
    const sectionPattern = new RegExp(
      `(## ${this.escapeRegex(sectionTitle)})\\n[\\s\\S]*?(?=\\n## |$)`,
      'g'
    );

    if (sectionPattern.test(existing)) {
      // Replace existing section
      return existing.replace(sectionPattern, newContent.trim());
    } else {
      // Append new section
      return existing.trimEnd() + '\n\n' + newContent.trim() + '\n';
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/ChapterManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/ChapterManager.ts src/core/ChapterManager.test.ts
git commit -m "feat: add ChapterManager for incremental document generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Chapter State Integration

**Files:**
- Modify: `src/types/state.ts`
- Modify: `src/core/StateManager.ts`
- Modify: `src/core/StateManager.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/core/StateManager.test.ts

describe('StateManager - Chapter State', () => {
  const stateDir = join(process.cwd(), '.test-state-ch');
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(stateDir, { recursive: true });
    manager = new StateManager(stateDir);
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('should track chapter states within a command', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    await manager.updateChapterStatus('wf', 'inst', 'design', 'background', 'completed');
    await manager.updateChapterStatus('wf', 'inst', 'design', 'user-stories', 'completed');

    const state = await manager.loadInstance('wf', 'inst');
    expect(state?.commands.design.chapters?.background).toBe('completed');
    expect(state?.commands.design.chapters?.['user-stories']).toBe('completed');
  });

  it('should track current chapter group', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    await manager.updateCurrentGroup('wf', 'inst', 'design', 'phase-2');

    const state = await manager.loadInstance('wf', 'inst');
    expect(state?.commands.design.currentGroup).toBe('phase-2');
  });

  it('should get completed chapter ids', async () => {
    await manager.createInstance('wf', 'inst', { topic: 'inst' });

    await manager.updateChapterStatus('wf', 'inst', 'design', 'background', 'completed');
    await manager.updateChapterStatus('wf', 'inst', 'design', 'user-stories', 'completed');
    await manager.updateChapterStatus('wf', 'inst', 'design', 'requirements', 'pending');

    const completed = await manager.getCompletedChapters('wf', 'inst', 'design');
    expect(completed).toEqual(['background', 'user-stories']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/StateManager.test.ts`
Expected: FAIL - chapter methods don't exist

**Step 3: Update state types**

```typescript
// Update src/types/state.ts - add chapters to CommandState
export interface CommandState {
  status: CommandStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  invalidatedBy?: string;
  invalidatedAt?: string;
  previousStatus?: CommandStatus;
  chapters?: Record<string, string>;  // chapter_id -> status
  currentGroup?: string;
}
```

**Step 4: Add chapter methods to StateManager**

```typescript
// Add to src/core/StateManager.ts

async updateChapterStatus(
  workflow: string,
  instance: string,
  command: string,
  chapterId: string,
  status: string
): Promise<void> {
  const state = await this.loadInstance(workflow, instance);
  if (!state) throw new Error(`Instance ${instance} not found`);

  if (!state.commands[command]) {
    state.commands[command] = { status: 'in_progress' };
  }
  if (!state.commands[command].chapters) {
    state.commands[command].chapters = {};
  }

  state.commands[command].chapters![chapterId] = status;
  state.updatedAt = new Date().toISOString();
  await this.saveState(this.getStatePath(workflow, instance), state);
}

async updateCurrentGroup(
  workflow: string,
  instance: string,
  command: string,
  groupName: string
): Promise<void> {
  const state = await this.loadInstance(workflow, instance);
  if (!state) throw new Error(`Instance ${instance} not found`);

  if (!state.commands[command]) {
    state.commands[command] = { status: 'in_progress' };
  }
  state.commands[command].currentGroup = groupName;
  state.updatedAt = new Date().toISOString();
  await this.saveState(this.getStatePath(workflow, instance), state);
}

async getCompletedChapters(
  workflow: string,
  instance: string,
  command: string
): Promise<string[]> {
  const state = await this.loadInstance(workflow, instance);
  if (!state) return [];

  const chapters = state.commands[command]?.chapters;
  if (!chapters) return [];

  return Object.entries(chapters)
    .filter(([, status]) => status === 'completed')
    .map(([id]) => id);
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- src/core/StateManager.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types/state.ts src/core/StateManager.ts src/core/StateManager.test.ts
git commit -m "feat: add chapter state tracking to StateManager

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Knowledge Injector

**Files:**
- Create: `src/core/KnowledgeInjector.ts`
- Create: `src/core/KnowledgeInjector.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/KnowledgeInjector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { KnowledgeInjector } from './KnowledgeInjector.js';
import type { KnowledgeInjection } from '../types/workflow.js';

describe('KnowledgeInjector', () => {
  const testDir = join(process.cwd(), '.test-knowledge');
  let injector: KnowledgeInjector;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    injector = new KnowledgeInjector(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load knowledge from local file', async () => {
    await writeFile(join(testDir, 'knowledge', 'testing.md'), '# Testing Guidelines\n\nAlways write tests first.');
    await mkdir(join(testDir, 'knowledge'), { recursive: true });
    await writeFile(join(testDir, 'knowledge', 'testing.md'), '# Testing Guidelines\n\nAlways write tests first.');

    const injections: KnowledgeInjection[] = [
      { id: 'testing', source: 'knowledge/testing.md', removeFromOutput: true }
    ];

    const loaded = await injector.loadKnowledge(injections);
    expect(loaded['testing']).toContain('Testing Guidelines');
  });

  it('should inject knowledge into template content', () => {
    const template = `# Design

<knowledge id="standards">
{{knowledge.standards}}
</knowledge>

Please follow the standards above.`;

    const knowledge = {
      standards: '## Code Standards\n\nUse TypeScript strict mode.'
    };

    const injected = injector.inject(template, knowledge);
    expect(injected).toContain('Code Standards');
    expect(injected).toContain('Use TypeScript strict mode');
  });

  it('should remove knowledge blocks from output', () => {
    const content = `# Design

<knowledge id="standards">
## Code Standards

Use TypeScript strict mode.
</knowledge>

Please follow the standards above.

## My Design

Some design content here.`;

    const injections: KnowledgeInjection[] = [
      { id: 'standards', source: 'knowledge/standards.md', removeFromOutput: true }
    ];

    const cleaned = injector.removeKnowledgeBlocks(content, injections);
    expect(cleaned).not.toContain('<knowledge');
    expect(cleaned).not.toContain('Code Standards');
    expect(cleaned).toContain('Please follow the standards above');
    expect(cleaned).toContain('Some design content here');
  });

  it('should keep knowledge blocks when removeFromOutput is false', () => {
    const content = `# Design

<knowledge id="ref">
## Reference

Keep this.
</knowledge>

More content.`;

    const injections: KnowledgeInjection[] = [
      { id: 'ref', source: 'knowledge/ref.md', removeFromOutput: false }
    ];

    const cleaned = injector.removeKnowledgeBlocks(content, injections);
    expect(cleaned).toContain('Keep this');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/KnowledgeInjector.test.ts`
Expected: FAIL - KnowledgeInjector not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/KnowledgeInjector.ts
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { KnowledgeInjection } from '../types/workflow.js';

export class KnowledgeInjector {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Load knowledge content from configured sources.
   */
  async loadKnowledge(
    injections: KnowledgeInjection[]
  ): Promise<Record<string, string>> {
    const knowledge: Record<string, string> = {};

    for (const injection of injections) {
      if (injection.source.startsWith('http://') || injection.source.startsWith('https://')) {
        knowledge[injection.id] = await this.loadFromUrl(injection.source);
      } else {
        knowledge[injection.id] = await this.loadFromFile(injection.source);
      }
    }

    return knowledge;
  }

  /**
   * Inject knowledge values into template content.
   * Replaces {{knowledge.<id>}} placeholders.
   */
  inject(template: string, knowledge: Record<string, string>): string {
    let result = template;
    for (const [id, content] of Object.entries(knowledge)) {
      result = result.replace(
        new RegExp(`\\{\\{knowledge\\.${this.escapeRegex(id)}\\}\\}`, 'g'),
        content
      );
    }
    return result;
  }

  /**
   * Remove knowledge blocks from output content.
   * Only removes blocks where removeFromOutput is true.
   */
  removeKnowledgeBlocks(
    content: string,
    injections: KnowledgeInjection[]
  ): string {
    let result = content;

    for (const injection of injections) {
      if (!injection.removeFromOutput) continue;

      const pattern = new RegExp(
        `<knowledge id="${this.escapeRegex(injection.id)}">[\\s\\S]*?</knowledge>\\n?`,
        'g'
      );
      result = result.replace(pattern, '');
    }

    // Clean up extra blank lines
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
  }

  private async loadFromFile(relativePath: string): Promise<string> {
    const fullPath = join(this.basePath, relativePath);
    return readFile(fullPath, 'utf-8');
  }

  private async loadFromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge from ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/KnowledgeInjector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/KnowledgeInjector.ts src/core/KnowledgeInjector.test.ts
git commit -m "feat: add KnowledgeInjector for loading and managing knowledge blocks

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: SubAgent Manager

**Files:**
- Create: `src/core/SubAgentManager.ts`
- Create: `src/core/SubAgentManager.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/SubAgentManager.test.ts
import { describe, it, expect } from 'vitest';
import { SubAgentManager } from './SubAgentManager.js';
import type { SubAgentDefinition } from '../types/workflow.js';

describe('SubAgentManager', () => {
  const manager = new SubAgentManager();

  it('should resolve execution order for subagents', () => {
    const subAgents: SubAgentDefinition[] = [
      { id: 'owasp-check', prompt: 'Check OWASP' },
      { id: 'privacy-check', prompt: 'Check privacy' },
      {
        id: 'report',
        prompt: 'Generate report from {{subAgents.owasp-check.output}}',
        dependsOn: ['owasp-check', 'privacy-check']
      }
    ];

    const order = manager.resolveOrder(subAgents);

    // owasp-check and privacy-check should come before report
    expect(order.indexOf('owasp-check')).toBeLessThan(order.indexOf('report'));
    expect(order.indexOf('privacy-check')).toBeLessThan(order.indexOf('report'));
  });

  it('should identify parallel groups', () => {
    const subAgents: SubAgentDefinition[] = [
      { id: 'a', prompt: 'Task A' },
      { id: 'b', prompt: 'Task B' },
      { id: 'c', prompt: 'Task C', dependsOn: ['a', 'b'] }
    ];

    const groups = manager.getParallelGroups(subAgents);
    // Group 1: [a, b] can run in parallel
    // Group 2: [c] runs after
    expect(groups).toHaveLength(2);
    expect(groups[0].sort()).toEqual(['a', 'b']);
    expect(groups[1]).toEqual(['c']);
  });

  it('should detect circular dependency in subagents', () => {
    const subAgents: SubAgentDefinition[] = [
      { id: 'a', prompt: 'A', dependsOn: ['b'] },
      { id: 'b', prompt: 'B', dependsOn: ['a'] }
    ];

    expect(() => manager.resolveOrder(subAgents)).toThrow('Circular');
  });

  it('should render prompt with subagent outputs', () => {
    const prompt = 'Report based on:\n{{subAgents.scan.output}}\n{{subAgents.check.output}}';
    const outputs: Record<string, string> = {
      scan: 'No vulnerabilities found.',
      check: 'All checks passed.'
    };

    const rendered = manager.renderPrompt(prompt, outputs);
    expect(rendered).toContain('No vulnerabilities found.');
    expect(rendered).toContain('All checks passed.');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/SubAgentManager.test.ts`
Expected: FAIL - SubAgentManager not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/SubAgentManager.ts
import type { SubAgentDefinition } from '../types/workflow.js';

export class SubAgentManager {
  /**
   * Resolve execution order of subagents using topological sort.
   */
  resolveOrder(subAgents: SubAgentDefinition[]): string[] {
    const byId = new Map(subAgents.map(sa => [sa.id, sa]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected in subagents involving "${id}"`);
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
    const byId = new Map(subAgents.map(sa => [sa.id, sa]));
    const groups: string[][] = [];
    const assigned = new Set<string>();

    while (assigned.size < order.length) {
      const group: string[] = [];

      for (const id of order) {
        if (assigned.has(id)) continue;

        const sa = byId.get(id)!;
        const deps = sa.dependsOn ?? [];
        const allDepsSatisfied = deps.every(dep => assigned.has(dep));

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
        new RegExp(`\\{\\{subAgents\\.${id}\\.output\\}\\}`, 'g'),
        output
      );
    }
    return result;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/SubAgentManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/SubAgentManager.ts src/core/SubAgentManager.test.ts
git commit -m "feat: add SubAgentManager for parallel task delegation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Context Manager

**Files:**
- Create: `src/core/ContextManager.ts`
- Create: `src/core/ContextManager.test.ts`

**Step 1: Write the failing test**

```typescript
// src/core/ContextManager.test.ts
import { describe, it, expect } from 'vitest';
import { ContextManager } from './ContextManager.js';
import type { ContextManagement } from '../types/workflow.js';

describe('ContextManager', () => {
  it('should not suggest action when under thresholds', () => {
    const config: ContextManagement = {
      tokenThreshold: 8000,
      roundThreshold: 20
    };
    const manager = new ContextManager(config);

    const suggestion = manager.checkAndSuggest({
      estimatedTokens: 3000,
      rounds: 5
    });

    expect(suggestion).toBeNull();
  });

  it('should suggest compress when tokens exceed threshold', () => {
    const config: ContextManagement = {
      tokenThreshold: 8000,
      roundThreshold: 20
    };
    const manager = new ContextManager(config);

    const suggestion = manager.checkAndSuggest({
      estimatedTokens: 9000,
      rounds: 10
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion!.type).toBe('compress');
  });

  it('should suggest subagent when rounds exceed threshold', () => {
    const config: ContextManagement = {
      tokenThreshold: 8000,
      roundThreshold: 20
    };
    const manager = new ContextManager(config);

    const suggestion = manager.checkAndSuggest({
      estimatedTokens: 5000,
      rounds: 25
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion!.type).toBe('subagent');
  });

  it('should suggest subagent when both thresholds exceeded', () => {
    const config: ContextManagement = {
      tokenThreshold: 8000,
      roundThreshold: 20
    };
    const manager = new ContextManager(config);

    const suggestion = manager.checkAndSuggest({
      estimatedTokens: 10000,
      rounds: 30
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion!.type).toBe('subagent');
  });

  it('should estimate tokens from text', () => {
    const config: ContextManagement = { tokenThreshold: 100 };
    const manager = new ContextManager(config);

    // Rough estimate: ~4 chars per token
    const tokens = manager.estimateTokens('Hello world, this is a test string.');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(100);
  });

  it('should handle missing config gracefully', () => {
    const manager = new ContextManager(undefined);

    const suggestion = manager.checkAndSuggest({
      estimatedTokens: 100000,
      rounds: 100
    });

    // No config = no suggestions
    expect(suggestion).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/ContextManager.test.ts`
Expected: FAIL - ContextManager not defined

**Step 3: Write minimal implementation**

```typescript
// src/core/ContextManager.ts
import type { ContextManagement } from '../types/workflow.js';

export interface ContextMetrics {
  estimatedTokens: number;
  rounds: number;
}

export interface ContextSuggestion {
  type: 'compress' | 'subagent';
  message: string;
}

export class ContextManager {
  private config?: ContextManagement;

  constructor(config?: ContextManagement) {
    this.config = config;
  }

  /**
   * Check context metrics and return a suggestion if thresholds exceeded.
   */
  checkAndSuggest(metrics: ContextMetrics): ContextSuggestion | null {
    if (!this.config) return null;

    const tokenExceeded = this.config.tokenThreshold !== undefined
      && metrics.estimatedTokens > this.config.tokenThreshold;
    const roundExceeded = this.config.roundThreshold !== undefined
      && metrics.rounds > this.config.roundThreshold;

    if (roundExceeded) {
      return {
        type: 'subagent',
        message: `Context is long (${metrics.rounds} rounds). Consider starting a SubAgent for the current task.`
      };
    }

    if (tokenExceeded) {
      return {
        type: 'compress',
        message: `Context is large (~${metrics.estimatedTokens} tokens). Consider compressing conversation history.`
      };
    }

    return null;
  }

  /**
   * Rough token estimation (~4 characters per token for English/code).
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/ContextManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/ContextManager.ts src/core/ContextManager.test.ts
git commit -m "feat: add ContextManager for context length monitoring

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: craft create Command

**Files:**
- Create: `src/commands/create.ts`
- Create: `src/commands/create.test.ts`

**Step 1: Write the failing test**

```typescript
// src/commands/create.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, access, readFile } from 'fs/promises';
import { join } from 'path';
import { createCommandHandler, type CreateOptions } from './create.js';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn()
}));

import { input, confirm } from '@inquirer/prompts';

describe('create command', () => {
  const testDir = join(process.cwd(), '.test-create');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create workflow from options (non-interactive)', async () => {
    const options: CreateOptions = {
      name: 'bug-triage',
      description: 'Bug triage workflow',
      variables: [
        { name: 'bugId', type: 'string', required: true, description: 'Bug ID' }
      ],
      commands: [
        { name: 'init', description: 'Initialize', type: 'template' },
        { name: 'triage', description: 'Triage bug', type: 'interactive' },
        { name: 'fix', description: 'Fix bug', type: 'execution' }
      ]
    };

    await createCommandHandler(options, testDir);

    // Check files exist
    const workflowDir = join(testDir, 'bug-triage');
    await expect(access(join(workflowDir, 'workflow.yaml'))).resolves.toBeUndefined();
    await expect(access(join(workflowDir, 'SKILL.md'))).resolves.toBeUndefined();
    await expect(access(join(workflowDir, 'templates'))).resolves.toBeUndefined();

    // Check workflow.yaml content
    const yamlContent = await readFile(join(workflowDir, 'workflow.yaml'), 'utf-8');
    expect(yamlContent).toContain('name: bug-triage');
    expect(yamlContent).toContain('bugId');
    expect(yamlContent).toContain('init:');
    expect(yamlContent).toContain('triage:');
    expect(yamlContent).toContain('fix:');
  });

  it('should create SKILL.md with correct content', async () => {
    const options: CreateOptions = {
      name: 'my-workflow',
      description: 'A custom workflow',
      variables: [],
      commands: [
        { name: 'start', description: 'Start the workflow', type: 'template' }
      ]
    };

    await createCommandHandler(options, testDir);

    const skillContent = await readFile(join(testDir, 'my-workflow', 'SKILL.md'), 'utf-8');
    expect(skillContent).toContain('# my-workflow');
    expect(skillContent).toContain('A custom workflow');
    expect(skillContent).toContain('craft run my-workflow start');
  });

  it('should throw if workflow already exists', async () => {
    await mkdir(join(testDir, 'existing'), { recursive: true });

    const options: CreateOptions = {
      name: 'existing',
      description: 'Existing',
      variables: [],
      commands: [{ name: 'init', description: 'Init', type: 'template' }]
    };

    await expect(createCommandHandler(options, testDir)).rejects.toThrow('already exists');
  });

  it('should create template files for template commands', async () => {
    const options: CreateOptions = {
      name: 'with-templates',
      description: 'Workflow with templates',
      variables: [{ name: 'topic', type: 'string', required: true }],
      commands: [
        {
          name: 'init',
          description: 'Initialize',
          type: 'template'
        },
        {
          name: 'review',
          description: 'Review',
          type: 'interactive'
        }
      ]
    };

    await createCommandHandler(options, testDir);

    // Template command should have a template file
    const templatePath = join(testDir, 'with-templates', 'templates', 'init.md');
    await expect(access(templatePath)).resolves.toBeUndefined();

    const templateContent = await readFile(templatePath, 'utf-8');
    expect(templateContent).toContain('{{topic}}');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/commands/create.test.ts`
Expected: FAIL - createCommandHandler not defined

**Step 3: Write minimal implementation**

```typescript
// src/commands/create.ts
import { mkdir, access, writeFile } from 'fs/promises';
import { join } from 'path';
import { Command } from 'commander';
import { stringify } from 'yaml';
import { input, select } from '@inquirer/prompts';
import type { CommandType } from '../types/workflow.js';

export interface CreateVariableOption {
  name: string;
  type: 'string' | 'select' | 'boolean' | 'computed';
  required?: boolean;
  description?: string;
  options?: string[];
}

export interface CreateCommandOption {
  name: string;
  description: string;
  type: CommandType;
  dependsOn?: string[];
}

export interface CreateOptions {
  name: string;
  description: string;
  variables: CreateVariableOption[];
  commands: CreateCommandOption[];
}

export const createCommand = new Command('create')
  .description('Create a new custom workflow')
  .argument('<name>', 'Workflow name')
  .action(async (name: string) => {
    const options = await interactiveCreate(name);
    await createCommandHandler(options, process.cwd());
    console.log(`Created workflow "${name}"`);
  });

async function interactiveCreate(name: string): Promise<CreateOptions> {
  const description = await input({ message: 'Workflow description:' });

  // For now, create a basic workflow with init command
  // Interactive creation can be extended later
  return {
    name,
    description,
    variables: [
      { name: 'topic', type: 'string', required: true, description: 'Topic name' }
    ],
    commands: [
      { name: 'init', description: 'Initialize', type: 'template' },
      { name: 'status', description: 'Show status', type: 'query' },
      { name: 'done', description: 'Complete', type: 'template' }
    ]
  };
}

export async function createCommandHandler(
  options: CreateOptions,
  targetDir: string
): Promise<void> {
  const workflowDir = join(targetDir, options.name);

  // Check if exists
  try {
    await access(workflowDir);
    throw new Error(`Workflow "${options.name}" already exists in ${targetDir}`);
  } catch (err: unknown) {
    if ((err as Error).message.includes('already exists')) throw err;
  }

  // Create directory structure
  await mkdir(join(workflowDir, 'templates'), { recursive: true });

  // Build workflow.yaml
  const workflowDef: Record<string, unknown> = {
    name: options.name,
    version: '1.0.0',
    description: options.description
  };

  // Variables
  if (options.variables.length > 0) {
    const variables: Record<string, Record<string, unknown>> = {};
    for (const v of options.variables) {
      const varDef: Record<string, unknown> = { type: v.type };
      if (v.required) varDef.required = true;
      if (v.description) varDef.description = v.description;
      if (v.options) varDef.options = v.options;
      variables[v.name] = varDef;
    }
    workflowDef.variables = variables;
  }

  // Commands
  const commands: Record<string, Record<string, unknown>> = {};
  for (const cmd of options.commands) {
    const cmdDef: Record<string, unknown> = {
      type: cmd.type,
      description: cmd.description
    };

    if (cmd.type === 'template') {
      cmdDef.template = `templates/${cmd.name}.md`;
      cmdDef.output = `specs/{{${options.variables[0]?.name ?? 'topic'}}}/${cmd.name}.md`;
    }

    if (cmd.dependsOn?.length) {
      cmdDef.dependsOn = cmd.dependsOn;
    }

    commands[cmd.name] = cmdDef;
  }
  workflowDef.commands = commands;

  await writeFile(
    join(workflowDir, 'workflow.yaml'),
    stringify(workflowDef),
    'utf-8'
  );

  // Generate SKILL.md
  const skillContent = generateSkillMd(options);
  await writeFile(join(workflowDir, 'SKILL.md'), skillContent, 'utf-8');

  // Generate template files for template commands
  for (const cmd of options.commands) {
    if (cmd.type === 'template') {
      const varRef = options.variables[0]?.name ?? 'topic';
      const templateContent = `# {{${varRef}}} - ${cmd.description}\n\n> Created: {{createdAt}}\n\n---\n\n<!-- Add content here -->\n`;
      await writeFile(
        join(workflowDir, 'templates', `${cmd.name}.md`),
        templateContent,
        'utf-8'
      );
    }
  }
}

function generateSkillMd(options: CreateOptions): string {
  const lines: string[] = [
    `# ${options.name}`,
    '',
    options.description,
    '',
    '## Usage',
    '',
    `Use \`craft run ${options.name} <command>\` to execute commands:`,
    ''
  ];

  for (const cmd of options.commands) {
    lines.push(`### ${cmd.name}`);
    lines.push('');
    lines.push('```bash');
    lines.push(`craft run ${options.name} ${cmd.name}`);
    lines.push('```');
    lines.push('');
    lines.push(cmd.description);
    lines.push('');
  }

  lines.push('## Commands');
  lines.push('');
  lines.push(`Commands: ${options.commands.map(c => `\`${c.name}\``).join(', ')}`);
  lines.push('');

  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/commands/create.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/create.ts src/commands/create.test.ts
git commit -m "feat: add craft create command for interactive workflow creation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Wire Up New Modules and Update Exports

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
import { createCommand } from '../commands/create.js';
import { runCommand } from '../commands/run.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';

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
export { ChapterManager } from './core/ChapterManager.js';
export { KnowledgeInjector } from './core/KnowledgeInjector.js';
export { SubAgentManager } from './core/SubAgentManager.js';
export { ContextManager } from './core/ContextManager.js';
```

**Step 3: Commit**

```bash
git add src/bin/craft.ts src/index.ts
git commit -m "feat: wire up create command and export all Phase 3 modules

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Phase 3 Integration Test

**Files:**
- Create: `tests/integration/phase3.test.ts`

**Step 1: Write integration test**

```typescript
// tests/integration/phase3.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, access, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ChapterManager } from '../../src/core/ChapterManager.js';
import { KnowledgeInjector } from '../../src/core/KnowledgeInjector.js';
import { SubAgentManager } from '../../src/core/SubAgentManager.js';
import { ContextManager } from '../../src/core/ContextManager.js';
import { createCommandHandler } from '../../src/commands/create.js';

describe('Integration: Phase 3 - Advanced Features', () => {
  const testDir = join(process.cwd(), '.test-phase3');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create custom workflow and verify structure', async () => {
    await createCommandHandler({
      name: 'code-review',
      description: 'Code review workflow',
      variables: [
        { name: 'pr', type: 'string', required: true, description: 'PR number' }
      ],
      commands: [
        { name: 'init', description: 'Prepare review', type: 'template' },
        { name: 'review', description: 'Perform review', type: 'interactive' },
        { name: 'status', description: 'Check status', type: 'query' },
        { name: 'done', description: 'Complete review', type: 'template' }
      ]
    }, testDir);

    const wfDir = join(testDir, 'code-review');
    await expect(access(join(wfDir, 'workflow.yaml'))).resolves.toBeUndefined();
    await expect(access(join(wfDir, 'SKILL.md'))).resolves.toBeUndefined();
    await expect(access(join(wfDir, 'templates', 'init.md'))).resolves.toBeUndefined();
    await expect(access(join(wfDir, 'templates', 'done.md'))).resolves.toBeUndefined();

    const yaml = await readFile(join(wfDir, 'workflow.yaml'), 'utf-8');
    expect(yaml).toContain('code-review');
    expect(yaml).toContain('pr');
  });

  it('should handle knowledge injection end-to-end', async () => {
    await mkdir(join(testDir, 'knowledge'), { recursive: true });
    await writeFile(
      join(testDir, 'knowledge', 'standards.md'),
      '## Code Standards\n\nUse strict TypeScript.'
    );

    const injector = new KnowledgeInjector(testDir);

    // Load
    const knowledge = await injector.loadKnowledge([
      { id: 'standards', source: 'knowledge/standards.md', removeFromOutput: true }
    ]);

    // Inject
    const template = `# Design\n\n<knowledge id="standards">\n{{knowledge.standards}}\n</knowledge>\n\nFollow the above.\n\n## Implementation\n\nCode here.`;
    const injected = injector.inject(template, knowledge);
    expect(injected).toContain('Use strict TypeScript');

    // Clean
    const cleaned = injector.removeKnowledgeBlocks(injected, [
      { id: 'standards', source: 'knowledge/standards.md', removeFromOutput: true }
    ]);
    expect(cleaned).not.toContain('Use strict TypeScript');
    expect(cleaned).toContain('Follow the above');
    expect(cleaned).toContain('Code here');
  });

  it('should manage chapter groups incrementally', () => {
    const manager = new ChapterManager();

    const chapters = [
      { id: 'bg', title: 'Background' },
      { id: 'us', title: 'User Stories' },
      { id: 'req', title: 'Requirements' }
    ];
    const groups = [
      { name: 'p1', chapters: ['bg', 'us'] },
      { name: 'p2', chapters: ['req'] }
    ];

    // First call: phase 1
    const g1 = manager.getNextGroup(chapters, groups, []);
    expect(g1?.name).toBe('p1');

    // After completing phase 1: phase 2
    const g2 = manager.getNextGroup(chapters, groups, ['bg', 'us']);
    expect(g2?.name).toBe('p2');

    // After completing all: null
    const g3 = manager.getNextGroup(chapters, groups, ['bg', 'us', 'req']);
    expect(g3).toBeNull();
  });

  it('should plan subagent execution in parallel groups', () => {
    const manager = new SubAgentManager();

    const groups = manager.getParallelGroups([
      { id: 'scan-a', prompt: 'Scan A' },
      { id: 'scan-b', prompt: 'Scan B' },
      { id: 'merge', prompt: 'Merge results', dependsOn: ['scan-a', 'scan-b'] },
      { id: 'report', prompt: 'Final report', dependsOn: ['merge'] }
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0].sort()).toEqual(['scan-a', 'scan-b']);
    expect(groups[1]).toEqual(['merge']);
    expect(groups[2]).toEqual(['report']);
  });

  it('should suggest context management actions', () => {
    const ctx = new ContextManager({ tokenThreshold: 5000, roundThreshold: 15 });

    expect(ctx.checkAndSuggest({ estimatedTokens: 2000, rounds: 5 })).toBeNull();
    expect(ctx.checkAndSuggest({ estimatedTokens: 6000, rounds: 5 })?.type).toBe('compress');
    expect(ctx.checkAndSuggest({ estimatedTokens: 3000, rounds: 20 })?.type).toBe('subagent');
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- tests/integration/phase3.test.ts`
Expected: PASS

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add tests/integration/phase3.test.ts
git commit -m "test: add Phase 3 integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

Phase 3 delivers:

1. **Chapter Types** - ChapterDefinition, ChapterGroup, ChapterState types
2. **Chapter Manager** - Incremental document generation with group tracking
3. **Chapter State** - StateManager extended with chapter progress tracking
4. **Knowledge Injector** - Load, inject, and clean knowledge blocks
5. **SubAgent Manager** - Parallel group resolution and prompt rendering
6. **Context Manager** - Token/round monitoring with suggestions
7. **craft create** - Interactive workflow creation command
8. **CLI Integration** - All new modules wired up
9. **Integration Tests** - End-to-end verification

**Next Phase:** Cross-platform export, config validation, more templates, documentation.
