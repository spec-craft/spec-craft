# SpecCraft Skills System Design

> **Created:** 2026-02-16  
> **Status:** Design Approved  
> **Version:** 1.0.0

## Overview

This document designs a comprehensive skills system for SpecCraft that enables AI agents (particularly Claude Code) to effectively create, manage, and use workflows through natural language interaction.

### Goals

1. **Agent-First Experience** - Make SpecCraft workflows easy to use through AI agents
2. **Flexible Publishing** - Support both local and marketplace-based skill distribution
3. **Standards Compliance** - Follow Claude Code plugin marketplace conventions
4. **Seamless Integration** - Extend existing CLI without breaking changes

### Non-Goals

- MCP Server implementation (future consideration)
- Multi-agent coordination (out of scope)
- Visual workflow editors (CLI/agent-driven only)

---

## Architecture Overview

### Skills Hierarchy

```
SpecCraft Skills Ecosystem
│
├─ Management Skill
│  └─ speccraft-manager
│     └─ Create, update, publish workflows
│
├─ Built-in Workflow Skills (5)
│  ├─ speccraft:brainstorm
│  ├─ speccraft:feature-dev
│  ├─ speccraft:api-design
│  ├─ speccraft:bug-fix
│  └─ speccraft:quick-prototype
│
└─ User-Created Workflow Skills
   ├─ Published Locally (~/.claude/skills/)
   └─ Published to Marketplace (Git repos)
```

### Publishing Modes

#### Mode A: Local Skills
```
~/.claude/skills/
└── speccraft:my-workflow/
    └── SKILL.md
```
- **Use Case:** Personal workflows, rapid iteration
- **Distribution:** Local installation only
- **Discovery:** Claude Code auto-discovers from `~/.claude/skills/`

#### Mode B: Marketplace
```
speccraft-marketplace/              # Git repository
├── .claude-plugin/
│   └── marketplace.json            # Plugin index
└── workflows/
    └── my-workflow/
        ├── .claude-plugin/
        │   └── plugin.json         # Plugin metadata
        ├── workflow.yaml
        ├── templates/
        └── skills/
            └── my-workflow/
                └── SKILL.md
```
- **Use Case:** Team sharing, community distribution
- **Distribution:** Git repository (GitHub, GitLab, etc.)
- **Discovery:** Users add marketplace to Claude Code

---

## Directory Structure

### Project Structure (Implementation)

```
spec-craft/
├── src/
│   ├── commands/
│   │   ├── publish.ts              # NEW: Publish workflow skills
│   │   ├── install-skill.ts        # NEW: Install skills (optional)
│   │   └── ...
│   │
│   ├── core/
│   │   ├── SkillGenerator.ts       # NEW: Generate SKILL.md
│   │   ├── SkillPublisher.ts       # NEW: Publish logic
│   │   ├── MarketplaceManager.ts   # NEW: Marketplace operations
│   │   └── ...
│   │
│   ├── skills/                     # NEW: Built-in skills
│   │   ├── manager/
│   │   │   └── SKILL.md
│   │   ├── brainstorm/
│   │   │   └── SKILL.md
│   │   ├── feature-dev/
│   │   │   └── SKILL.md
│   │   ├── api-design/
│   │   │   └── SKILL.md
│   │   ├── bug-fix/
│   │   │   └── SKILL.md
│   │   └── quick-prototype/
│   │       └── SKILL.md
│   │
│   └── templates/                  # EXISTING: Workflow definitions
│       ├── brainstorm/
│       │   ├── workflow.yaml
│       │   └── templates/
│       └── ...
│
└── tests/
    ├── skills/                     # NEW: Skills tests
    │   ├── SkillGenerator.test.ts
    │   ├── SkillPublisher.test.ts
    │   └── MarketplaceManager.test.ts
    └── integration/
        └── skills.test.ts          # NEW: Integration tests
```

---

## CLI Commands

### craft publish

**Purpose:** Publish workflow skills locally or to marketplace

```bash
craft publish <workflow-name> [options]

Options:
  -m, --mode <type>           Publishing mode: local | marketplace
  --marketplace <path>        Marketplace path (required for marketplace mode)
  --author-name <name>        Author name
  --author-email <email>      Author email
  --force                     Force overwrite existing
  --dry-run                   Preview without executing
  -h, --help                  Display help
```

**Examples:**
```bash
# Interactive mode (prompts for options)
craft publish my-workflow

# Publish locally
craft publish my-workflow --mode local

# Publish to marketplace
craft publish my-workflow \
  --mode marketplace \
  --marketplace ~/team-workflows \
  --author-name "John Doe" \
  --author-email "john@example.com"

# Preview without publishing
craft publish my-workflow --dry-run
```

### craft install-skill (Optional)

**Purpose:** Install workflow skills from various sources

```bash
craft install-skill <workflow-name> [options]

Options:
  --from <path|url>           Install from path or marketplace
  --force                     Force reinstall
  -h, --help                  Display help
```

**Examples:**
```bash
# Install built-in workflow skill
craft install-skill feature-dev

# Install from local workflow
craft install-skill ./my-workflow

# Install from marketplace
craft install-skill my-workflow --from ~/team-marketplace
```

---

## Core Modules

### SkillGenerator

**Purpose:** Generate SKILL.md files from workflow definitions

**Location:** `src/core/SkillGenerator.ts`

**Interface:**
```typescript
export interface SkillGenerationOptions {
  workflow: Workflow;
  outputPath: string;
  templateType?: 'minimal' | 'standard' | 'detailed';
  customSections?: SkillSection[];
}

export class SkillGenerator {
  /**
   * Generate SKILL.md from workflow definition
   */
  static async generate(options: SkillGenerationOptions): Promise<string>;
  
  /**
   * Validate SKILL.md format
   */
  static validate(content: string): ValidationResult;
  
  /**
   * Generate from template (for built-in workflows)
   */
  static async generateFromTemplate(
    workflow: Workflow,
    templatePath: string
  ): Promise<string>;
}
```

**Generated SKILL.md Structure:**
```markdown
---
name: speccraft:{{workflow-name}}
description: {{workflow-description}}
---

# {{Workflow Name}}

{{Description}}

## When to Use
- Use case 1
- Use case 2

## Commands

### command-name - Description
**Type:** template | execution | query | interactive
**Dependencies:** dep1, dep2

```bash
craft run workflow-name command-name
```

## Variables
- **var-name** (type) - Description

## Usage Examples
...

## Best Practices
...
```

---

### SkillPublisher

**Purpose:** Handle skill publishing to local or marketplace

**Location:** `src/core/SkillPublisher.ts`

**Interface:**
```typescript
export type PublishMode = 'local' | 'marketplace';

export interface PublishOptions {
  workflowPath: string;
  mode: PublishMode;
  marketplacePath?: string;
  author?: AuthorInfo;
  force?: boolean;
  dryRun?: boolean;
}

export interface PublishResult {
  success: boolean;
  mode: PublishMode;
  installedPath: string;
  message: string;
  actions?: string[];
}

export class SkillPublisher {
  /**
   * Publish workflow skill
   */
  static async publish(options: PublishOptions): Promise<PublishResult>;
  
  /**
   * Publish to local ~/.claude/skills/
   */
  private static async publishLocal(
    workflow: Workflow,
    workflowPath: string,
    force: boolean
  ): Promise<PublishResult>;
  
  /**
   * Publish to marketplace
   */
  private static async publishMarketplace(
    workflow: Workflow,
    workflowPath: string,
    marketplacePath: string,
    author: AuthorInfo,
    force: boolean
  ): Promise<PublishResult>;
  
  /**
   * Generate plugin.json
   */
  private static generatePluginJson(
    workflow: Workflow,
    author: AuthorInfo
  ): PluginMetadata;
  
  /**
   * Update marketplace.json index
   */
  private static async updateMarketplaceIndex(
    marketplacePath: string,
    workflow: Workflow,
    author: AuthorInfo
  ): Promise<void>;
}
```

**Publishing Flow - Local Mode:**
```
1. Validate workflow
   ├─ Check workflow.yaml exists and valid
   ├─ Verify template files exist
   └─ Check SKILL.md (generate if missing)

2. Install to local
   ├─ Create ~/.claude/skills/speccraft:<workflow-name>/
   ├─ Copy or generate SKILL.md
   └─ Record installation

3. Complete
   └─ Report success with path
```

**Publishing Flow - Marketplace Mode:**
```
1. Validate workflow (same as local)

2. Validate marketplace
   ├─ Check marketplace path exists
   ├─ Verify Git repository
   └─ Validate marketplace.json

3. Generate plugin structure
   ├─ Create workflows/<workflow-name>/
   ├─ Copy workflow.yaml
   ├─ Copy templates/
   ├─ Generate .claude-plugin/plugin.json
   └─ Generate skills/<workflow-name>/SKILL.md

4. Update marketplace index
   ├─ Read .claude-plugin/marketplace.json
   ├─ Add/update plugin entry
   └─ Write back

5. Git operations (optional)
   ├─ Stage changes
   ├─ Create commit
   └─ Suggest push (don't auto-push)

6. Complete
   └─ Report success with next steps
```

---

### MarketplaceManager

**Purpose:** Manage marketplace operations

**Location:** `src/core/MarketplaceManager.ts`

**Interface:**
```typescript
export interface MarketplaceConfig {
  name: string;
  path: string;
  url?: string;
  owner: AuthorInfo;
  isLocal: boolean;
}

export interface MarketplaceIndex {
  $schema: string;
  name: string;
  description: string;
  owner: AuthorInfo;
  plugins: PluginEntry[];
}

export class MarketplaceManager {
  /**
   * Initialize new marketplace
   */
  static async init(
    path: string,
    config: MarketplaceConfig
  ): Promise<void>;
  
  /**
   * Validate marketplace structure
   */
  static async validate(path: string): Promise<ValidationResult>;
  
  /**
   * List all workflows in marketplace
   */
  static async list(path: string): Promise<PluginEntry[]>;
  
  /**
   * Install workflow from marketplace
   */
  static async installWorkflow(
    marketplacePath: string,
    workflowName: string,
    targetPath: string
  ): Promise<void>;
}
```

**Marketplace Structure:**
```
marketplace-repo/
├── .claude-plugin/
│   └── marketplace.json          # Required: Plugin index
├── workflows/                    # Required: Workflow plugins
│   ├── workflow-1/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Plugin metadata
│   │   ├── workflow.yaml
│   │   ├── templates/
│   │   └── skills/
│   │       └── workflow-1/
│   │           └── SKILL.md
│   └── workflow-2/
│       └── ...
├── .git/                         # Recommended: Git repo
└── README.md                     # Recommended: Documentation
```

**marketplace.json Schema:**
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "my-speccraft-marketplace",
  "description": "Custom SpecCraft workflows",
  "owner": {
    "name": "Team Name",
    "email": "team@example.com"
  },
  "plugins": [
    {
      "name": "speccraft:my-workflow",
      "description": "My custom workflow",
      "version": "1.0.0",
      "author": {
        "name": "Author Name",
        "email": "author@example.com"
      },
      "source": "./workflows/my-workflow",
      "category": "workflow",
      "keywords": ["speccraft", "workflow"]
    }
  ]
}
```

**plugin.json Schema:**
```json
{
  "name": "speccraft:my-workflow",
  "description": "My custom workflow",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "homepage": "https://github.com/user/marketplace",
  "license": "MIT",
  "keywords": ["workflow", "speccraft"],
  "speccraft": {
    "workflowVersion": "1.0.0",
    "compatibleWith": "^0.1.0"
  }
}
```

---

## Built-in Skills

### 1. speccraft-manager

**Purpose:** Create, update, and publish workflows

**Key Sections:**
- When to Use
- Creating Workflows
- Updating Workflows
- Publishing Workflows (local vs marketplace)
- Workflow Structure
- Best Practices
- Agent Workflow Guide
- Troubleshooting

**Usage:**
```
User: "Help me create a code review workflow"
Agent: Uses speccraft-manager skill to guide workflow creation
```

---

### 2-6. Built-in Workflow Skills

Each built-in workflow gets a dedicated skill:

**speccraft:brainstorm**
- Structured brainstorming sessions
- 3 commands: init, explore, summarize

**speccraft:feature-dev**
- Complete feature development lifecycle
- 9 commands: init, spec, design, tasks, implement, test, validate, fix, status
- Detailed guidance for each stage

**speccraft:api-design**
- API specification workflow
- 4 commands: init, define, review, done

**speccraft:bug-fix**
- Systematic bug investigation and fixing
- 6 commands: init, reproduce, diagnose, fix, verify, status

**speccraft:quick-prototype**
- Rapid prototyping workflow
- 6 commands: init, prototype, test, reflect, refine, status

**Common Skill Structure:**
```markdown
---
name: speccraft:<workflow-name>
description: <description>
---

# Workflow Name

## When to Use
- Scenario 1
- Scenario 2

## Workflow Overview
Brief description of stages

## Quick Start
```bash
craft run <workflow> init
```

## Detailed Command Guide

### command-1
**Purpose:** ...
**What it does:** ...
**Dependencies:** ...
**Output:** ...
**Best Practices:** ...

### command-2
...

## Agent Guidance
### When User Says: "..."
1. Step 1
2. Step 2

### Best Practices
- Practice 1
- Practice 2

## Variables
Table of variables

## Output Structure
Directory tree

## Common Patterns
### Pattern 1: ...
### Pattern 2: ...

## Tips for Agents
- Tip 1
- Tip 2
```

---

## Type Definitions

### New Types

```typescript
// src/core/types.ts (extensions)

export interface PluginMetadata {
  name: string;
  description: string;
  version: string;
  author: AuthorInfo;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  speccraft?: {
    workflowVersion: string;
    compatibleWith: string;
  };
}

export interface AuthorInfo {
  name: string;
  email: string;
}

export interface InstallationRecord {
  workflow: string;
  installedPath: string;
  installedAt: string;
  mode: 'local' | 'marketplace';
  version: string;
}

export interface SkillSection {
  title: string;
  content: string;
  order?: number;
}

export interface PluginEntry {
  name: string;
  description: string;
  version: string;
  author: AuthorInfo;
  source: string;
  category: string;
  keywords: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

---

## Testing Strategy

### Unit Tests

**SkillGenerator Tests:**
- Generate SKILL.md from workflow
- Generate minimal/standard/detailed templates
- Validate SKILL.md format
- Handle missing sections gracefully

**SkillPublisher Tests:**
- Publish to local successfully
- Detect existing installations
- Overwrite with --force
- Publish to marketplace with full structure
- Update marketplace.json correctly
- Validate marketplace before publishing
- Handle Git operations

**MarketplaceManager Tests:**
- Initialize marketplace structure
- Validate valid marketplace
- Detect invalid marketplace
- List workflows
- Install workflow from marketplace

### Integration Tests

**End-to-End Workflows:**
1. Create → Publish Local → Verify
2. Create → Publish Marketplace → Verify
3. Auto-generate SKILL.md if missing
4. Use existing SKILL.md if present

### Coverage Target

- Minimum: 80% code coverage
- Focus: Core modules (SkillGenerator, SkillPublisher, MarketplaceManager)

---

## Migration Plan

### Phase 1: Preparation (2-3 days)
**No changes to existing functionality**

- [ ] Create `src/skills/` directory structure
- [ ] Write 6 built-in SKILL.md files:
  - manager/SKILL.md
  - brainstorm/SKILL.md
  - feature-dev/SKILL.md
  - api-design/SKILL.md
  - bug-fix/SKILL.md
  - quick-prototype/SKILL.md
- [ ] Implement core modules:
  - SkillGenerator
  - SkillPublisher
  - MarketplaceManager
- [ ] Write unit tests
- [ ] Verify all existing tests pass

**Verification:**
```bash
bun test              # All tests pass
bun run typecheck     # No type errors
```

---

### Phase 2: CLI Integration (1-2 days)

- [ ] Implement `publish` command (`src/commands/publish.ts`)
- [ ] Implement `install-skill` command (optional)
- [ ] Register commands in `bin/craft.ts`
- [ ] Write integration tests
- [ ] Update CLI help text

**Verification:**
```bash
craft --help          # Shows new commands
craft publish --help  # Command help works
bun test             # All tests pass
```

---

### Phase 3: Built-in Migration (0.5 day)

- [ ] Move SKILL.md files:
  ```bash
  mv src/templates/brainstorm/SKILL.md src/skills/brainstorm/SKILL.md
  mv src/templates/feature-dev/SKILL.md src/skills/feature-dev/SKILL.md
  mv src/templates/api-design/SKILL.md src/skills/api-design/SKILL.md
  mv src/templates/bug-fix/SKILL.md src/skills/bug-fix/SKILL.md
  mv src/templates/quick-prototype/SKILL.md src/skills/quick-prototype/SKILL.md
  ```
- [ ] Update any code references
- [ ] Update documentation

**Verification:**
```bash
craft list                    # Lists workflows
craft show feature-dev        # Shows details
craft run brainstorm init     # Runs workflow
```

---

### Phase 4: Publish Built-in Skills (0.5 day)

**Approach: Auto-install on first run**

```typescript
// In CLI entry point
async function ensureBuiltinSkills() {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');
  const builtinSkills = [
    'manager', 'brainstorm', 'feature-dev',
    'api-design', 'bug-fix', 'quick-prototype'
  ];
  
  for (const skill of builtinSkills) {
    const targetPath = path.join(skillsDir, `speccraft:${skill}`);
    if (!await fs.pathExists(targetPath)) {
      const sourcePath = path.join(__dirname, '../src/skills', skill, 'SKILL.md');
      await fs.ensureDir(targetPath);
      await fs.copy(sourcePath, path.join(targetPath, 'SKILL.md'));
    }
  }
}
```

**Verification:**
```bash
ls ~/.claude/skills/                                    # See speccraft:* dirs
cat ~/.claude/skills/speccraft:feature-dev/SKILL.md    # Content correct
```

---

### Phase 5: Documentation (1-2 days)

- [ ] Update README.md:
  - Add Skills section
  - Document `craft publish` command
  - Add marketplace setup guide
- [ ] Create tutorial documents:
  - `docs/guides/creating-workflows.md`
  - `docs/guides/publishing-skills.md`
  - `docs/guides/setting-up-marketplace.md`
- [ ] Update CLAUDE.md (project guide)
- [ ] Create example marketplace repository
- [ ] Prepare release notes

**Verification:**
- Documentation is clear and accurate
- All command examples work
- Links are correct

---

### Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Preparation | 2-3 days | Core modules complete |
| Phase 2: CLI Integration | 1-2 days | `publish` command working |
| Phase 3: Built-in Migration | 0.5 day | Skills directory in place |
| Phase 4: Publish Skills | 0.5 day | Auto-install working |
| Phase 5: Documentation | 1-2 days | Docs complete |
| **Total** | **5-8 days** | **Ready for release** |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skills path conflicts | Installation fails | Use `speccraft:` prefix |
| Marketplace format incompatible | Publish fails | Strict validation, clear errors |
| Existing functionality breaks | User workflows broken | Comprehensive tests, backward compatibility |
| Insufficient documentation | User confusion | Rich examples, templates, wizards |
| Git operations fail | Marketplace publish interrupted | Detailed error messages, `--dry-run` support |

---

## Success Criteria

### Functional
- ✅ All tests pass (including new tests)
- ✅ `craft publish` works in both modes
- ✅ Built-in skills auto-install to `~/.claude/skills/`
- ✅ Marketplace structure complies with Claude Code spec
- ✅ User workflows can be published and used

### Quality
- ✅ Test coverage > 80%
- ✅ No TypeScript type errors
- ✅ All lint checks pass
- ✅ Documentation complete and accurate

### User Experience
- ✅ Publishing workflow < 5 steps
- ✅ Error messages are clear and helpful
- ✅ First-time user guidance available
- ✅ Example marketplace ready to use

---

## Future Enhancements

### Short Term (Next Release)
- Skill versioning and updates
- Skill dependency management
- Marketplace search and discovery
- Workflow templates gallery

### Medium Term (3-6 months)
- MCP Server integration
- Multi-agent workflow coordination
- Visual workflow editor
- Workflow marketplace website

### Long Term (6+ months)
- AI-powered workflow generation
- Workflow analytics and insights
- Enterprise features (private marketplaces, RBAC)
- IDE integrations (VS Code extension)

---

## Appendix

### Example: Publishing Workflow

**User's Terminal:**
```bash
$ craft publish my-workflow

✨ Publishing workflow: my-workflow

📋 Validating workflow...
  ✓ workflow.yaml valid
  ✓ All template files exist
  ✓ SKILL.md generated

🎯 Choose publishing mode:
  1) Local Skill - Install to ~/.claude/skills/
  2) Marketplace - Publish to team/community marketplace

Select (1-2): 2

📁 Marketplace path:
Enter marketplace directory (or leave empty for ~/my-marketplace): 
> ~/projects/team-workflows

🔍 Checking marketplace...
  ✓ Git repository
  ✓ marketplace.json exists

📦 Generating plugin structure...
  ✓ Copied workflow definition
  ✓ Copied templates
  ✓ Generated plugin.json
  ✓ Generated skill

📝 Updating index...
  ✓ marketplace.json updated

🎉 Published successfully!

Next steps:
  cd ~/projects/team-workflows
  git add workflows/my-workflow
  git commit -m "feat: add my-workflow"
  git push origin main

To install this marketplace in Claude Code:
  https://github.com/your-team/workflows
```

### Example: Agent Interaction

**User:** "Help me create a workflow for code reviews"

**Agent (using speccraft-manager skill):**
```
I'll help you create a code review workflow. Let me ask a few questions:

1. What stages do you need in your code review process?
   a) Simple: submit → review → approve
   b) Detailed: submit → automated checks → manual review → discussion → approve
   c) Custom (tell me your stages)

[User selects b]

2. What automated checks do you want to run?
   a) Linting only
   b) Linting + tests
   c) Linting + tests + security scan
   d) Custom

[User selects c]

Great! Let me create this workflow...

[Agent runs: craft create code-review-workflow]
[Agent customizes workflow.yaml based on answers]

Your code review workflow is ready! Would you like to:
1. Publish it locally (just for you)
2. Publish to your team marketplace

[User selects 2]

[Agent runs: craft publish code-review-workflow --mode marketplace --marketplace ~/team-workflows]

Done! Your workflow is published. Team members can now use:
  craft run code-review-workflow submit
```

---

## References

- [Claude Code Plugin Marketplace Documentation](https://anthropic.com/claude-code/marketplace)
- [SpecCraft Current Architecture](../../CLAUDE.md)
- [Superpowers Skills Examples](https://github.com/obra/superpowers)
- [Git Worktrees Guide](https://git-scm.com/docs/git-worktree)

---

**End of Design Document**
