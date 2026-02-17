# Publishing SpecCraft Skills

This guide explains how to publish your custom workflows as skills that AI agents can use.

## Overview

SpecCraft supports two publishing modes:
- **Local** - Install to your personal `~/.claude/skills/` directory
- **Marketplace** - Publish to a Git repository for team/community sharing

## Publishing Locally

For personal workflows or quick testing:

```bash
craft publish my-workflow --mode local
```

This will:
1. Validate your workflow
2. Generate SKILL.md (if not present)
3. Install to `~/.claude/skills/speccraft:my-workflow/`
4. Claude Code auto-discovers it

## Publishing to Marketplace

For team sharing or public distribution:

### Step 1: Create a Marketplace Repository

```bash
# Create and initialize marketplace
mkdir team-workflows
cd team-workflows
git init

# Create structure
mkdir -p .claude-plugin workflows
cat > .claude-plugin/marketplace.json << EOF
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "team-workflows",
  "description": "Our team's SpecCraft workflows",
  "owner": {
    "name": "Your Team",
    "email": "team@example.com"
  },
  "plugins": []
}
EOF

git add .
git commit -m "chore: initialize marketplace"
```

### Step 2: Publish Workflow

```bash
cd /path/to/my-workflow
craft publish my-workflow \
  --mode marketplace \
  --marketplace ~/team-workflows \
  --author-name "Your Name" \
  --author-email "you@example.com"
```

This will:
1. Validate workflow
2. Create plugin structure in marketplace
3. Generate `plugin.json` and `SKILL.md`
4. Update `marketplace.json` index
5. Stage changes (you need to commit/push)

### Step 3: Commit and Push

```bash
cd ~/team-workflows
git add workflows/my-workflow
git commit -m "feat: add my-workflow"
git push origin main
```

### Step 4: Share Marketplace

Team members can add your marketplace to Claude Code:
1. Open Claude Code settings
2. Add marketplace URL: `https://github.com/your-team/workflows`

## Marketplace Structure

After publishing, your marketplace looks like:

```
team-workflows/
├── .claude-plugin/
│   └── marketplace.json          # Updated with new plugin
├── workflows/
│   └── my-workflow/
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin metadata
│       ├── workflow.yaml         # Workflow definition
│       ├── templates/            # Template files
│       └── skills/
│           └── my-workflow/
│               └── SKILL.md      # Skill content
└── README.md
```

## Customizing SKILL.md

By default, `craft publish` auto-generates SKILL.md. To customize:

1. Create `SKILL.md` in your workflow directory
2. Follow this structure:

```markdown
---
name: speccraft:my-workflow
description: Brief description
---

# My Workflow

Detailed description of what this workflow does.

## When to Use
- Use case 1
- Use case 2

## Commands

### command-name - Description
**Type:** template | execution | query | interactive
**Dependencies:** other-command

```bash
craft run my-workflow command-name
```

## Best Practices
- Tip 1
- Tip 2
```

3. Publish - it will use your custom SKILL.md

## Tips

- **Test Locally First** - Use `--mode local` to test before marketplace publishing
- **Use --dry-run** - Preview changes: `craft publish my-workflow --dry-run`
- **Clear Descriptions** - Help agents understand when to use your workflow
- **Document Dependencies** - Specify command dependencies clearly
- **Version Your Workflows** - Update version in workflow.yaml when changing

## Troubleshooting

**Skill Already Exists:**
```bash
# Use --force to overwrite
craft publish my-workflow --mode local --force
```

**Marketplace Not Valid:**
```bash
# Check marketplace structure
ls -la ~/team-workflows/.claude-plugin/
cat ~/team-workflows/.claude-plugin/marketplace.json
```

**Workflow Not Found:**
```bash
# Ensure you're in the workflow directory or provide full path
craft publish ./my-workflow --mode local
```
