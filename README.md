# SpecCraft - AI-Powered Workflow Skills for Development

[中文文档](./README_zh.md) | English

[![npm version](https://img.shields.io/npm/v/@speccraft/cli.svg)](https://www.npmjs.com/package/@speccraft/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SpecCraft helps teams create and manage development workflows through **skills** that AI agents (like Claude Code) can understand and use naturally.

## What are SpecCraft Skills?

Skills are **AI-friendly workflow definitions** that let you:

- 🎯 Tell AI agents what your workflow does and when to use it
- 📋 Define structured steps with clear dependencies
- 🔄 Track progress automatically
- 🤖 Enable AI to guide you through complex processes

## 🚀 Quick Start (30 seconds)

### Step 1: Install

```bash
# Install Bun if you haven't
curl -fsSL https://bun.sh/install | bash

# Install SpecCraft
bun add -g @speccraft/cli
```

### Step 2: Use a Built-in Skill

When you first run `craft`, it auto-installs skills to your Claude Code. Just talk to Claude naturally:

```
You: "Help me develop a new feature"
Claude: [Uses speccraft:feature-dev skill]
```

**Available built-in skills:**
- `speccraft:brainstorm` - Structured brainstorming
- `speccraft:feature-dev` - Feature development lifecycle
- `speccraft:api-design` - API specification
- `speccraft:bug-fix` - Bug investigation & fixing
- `speccraft:quick-prototype` - Rapid prototyping

### Step 3: Run a Workflow

```bash
# Copy a workflow to start
craft copy feature-dev my-feature

# Run the first step
craft run my-feature init --instance my-app
```

## 📖 How to Use Built-in Skills

### Talking to Claude Code

After installing SpecCraft, Claude Code discovers your skills automatically. Just describe what you want to do:

```
You: "I need to design an API for user authentication"
Claude: Uses speccraft:api-design skill, asks questions, generates spec

You: "There's a bug in the login flow"
Claude: Uses speccraft:bug-fix skill, guides through diagnosis

You: "Help me brainstorm a new product feature"
Claude: Uses speccraft:brainstorm skill, structures the session
```

### Running from Command Line

```bash
# List available workflows
craft list

# View workflow details
craft show feature-dev

# Run workflow commands
craft run my-feature spec --instance my-app
craft run my-feature design --instance my-app

# Check progress
craft status my-feature
```

## 🔨 Creating Custom Skills

### Quick Start

```bash
# Create a new workflow from template
craft copy feature-dev my-custom-workflow

# Edit the workflow definition
cd my-custom-workflow
vim workflow.yaml
```

### Publishing Your Skill

Share your skill with yourself or your team:

```bash
# Publish locally (for personal use)
craft publish my-custom-workflow --mode local

# Publish to team marketplace
craft publish my-custom-workflow --mode marketplace --marketplace ~/team-workflows
```

Your skill is now available to AI agents!

## 📚 Built-in Skills Reference

### speccraft:brainstorm

**When to use:** Need to explore ideas systematically

**Commands:**
- `init` - Start a brainstorming session
- `explore` - Explore different directions
- `summarize` - Document key insights

### speccraft:feature-dev

**When to use:** Building a new feature from scratch

**Commands:**
- `init` - Initialize feature specification
- `spec` - Write detailed specification
- `design` - Technical design
- `tasks` - Break down into tasks
- `implement` - Implementation phase
- `test` - Testing
- `validate` - Final validation

### speccraft:api-design

**When to use:** Designing APIs

**Commands:**
- `init` - Start API design
- `define` - Define endpoints
- `review` - Review design
- `done` - Finalize

### speccraft:bug-fix

**When to use:** Investigating and fixing bugs

**Commands:**
- `init` - Initialize bug report
- `reproduce` - Reproduce the issue
- `diagnose` - Find root cause
- `fix` - Implement fix
- `verify` - Verify the fix

### speccraft:quick-prototype

**When to use:** Rapid prototyping

**Commands:**
- `init` - Start prototyping
- `prototype` - Build prototype
- `test` - Test quickly
- `reflect` - Review learnings
- `refine` - Improve

## CLI Reference

For advanced usage, here are the CLI commands:

```bash
# Workflow management
craft init <name>           # Create marketplace
craft copy <template> [dest]  # Copy template
craft list                  # List workflows
craft show <workflow>      # Show details

# Run workflows
craft run <workflow> <command> [options]
  --instance <name>        # Instance name
  --force                  # Force re-run
  --auto-deps              # Auto-run dependencies

# Status
craft status <workflow>    # Show progress
craft log <workflow>      # Show logs

# Publishing
craft publish <workflow> [options]
  --mode <local|marketplace>
  --marketplace <path>
  --force
```

## Project Structure

```
my-workflow/
├── workflow.yaml          # Workflow definition
├── templates/            # Template files
└── SKILL.md             # Skill description (auto-generated)
```

## Advanced Features

- **Variables** - Dynamic substitution with types (string, select, boolean)
- **Dependencies** - Automatic ordering with `dependsOn`
- **Knowledge Injection** - Inject docs into prompts
- **Chapter System** - Incremental document generation
- **SubAgent Support** - Parallel AI task execution

See [full documentation](./docs) for details.

## Contributing

Issues and PRs welcome! [GitHub](https://github.com/spec-craft/spec-craft)
