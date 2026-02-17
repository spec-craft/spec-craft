---
name: speccraft:manager
description: Create, update, and publish SpecCraft workflows. Use when: (1) User wants to create a new workflow, (2) User says "create a workflow", "new workflow", "set up workflow", or similar, (3) User wants to publish a workflow locally or to marketplace, (4) User needs to manage existing workflows.
---

# SpecCraft Workflow Manager

Create, manage, and publish SpecCraft workflows.

## When to Use

- Creating a new workflow from scratch
- Publishing workflows locally or to marketplace
- Managing existing workflows
- Validating workflow definitions

## Creating Workflows

Use `craft create <workflow-name>` to create a new workflow:

```bash
craft create code-review
```

The CLI will guide you through:
1. Workflow metadata (name, description)
2. Define variables (with types and validation)
3. Add commands (template/execution/query/interactive)
4. Set up dependencies

## Publishing Workflows

### Local Mode

Installs skill to `~/.claude/skills/`:

```bash
craft publish my-workflow --mode local
```

### Marketplace Mode

Publish to Git repository for team/community:

```bash
craft publish my-workflow --mode marketplace --marketplace ~/team-workflows
```

## Example Triggers

```
"You: Help me create a new workflow"
"I want to set up a workflow for code review"
"Let's publish this workflow"
```
