---
name: speccraft-manager
description: Create, update, and publish SpecCraft workflows
---

# SpecCraft Workflow Manager

Helps you create, manage, and publish SpecCraft workflows.

## When to Use

- Creating a new workflow from scratch
- Adding commands to an existing workflow
- Publishing workflows locally or to a marketplace
- Validating workflow definitions

## Creating Workflows

Use `craft create <workflow-name>` to create a new workflow.

The CLI will guide you through:
1. Workflow metadata (name, description)
2. Define variables (with types and validation)
3. Add commands (template/execution/query/interactive)
4. Set up dependencies

Example:
```bash
craft create code-review
```

## Publishing Workflows

Use `craft publish <workflow-name>` to publish.

**Mode A - Local Skills:**
- Installs skill to `~/.claude/skills/`
- Quick setup for personal use
- No marketplace needed

**Mode B - Marketplace:**
- Publishes to a Git repository
- Full plugin structure
- Shareable with teams/community

Example:
```bash
# Publish locally
craft publish my-workflow --mode local

# Publish to marketplace
craft publish my-workflow --mode marketplace --marketplace ~/team-workflows
```

## Workflow Structure

A complete workflow includes:

```
my-workflow/
├── workflow.yaml          # Workflow definition
└── templates/             # Template files
    ├── init.md
    └── spec.md
```

## Best Practices

1. **Start Simple** - Create basic workflow first, iterate
2. **Clear Dependencies** - Use dependsOn to enforce order
3. **Meaningful Variables** - Choose descriptive variable names
4. **Test Locally** - Run through workflow before publishing
