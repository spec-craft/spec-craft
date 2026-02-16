# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpecCraft is a CLI tool for creating and managing spec-driven development workflows. It helps teams structure work through customizable workflow templates with state tracking, dependency resolution, and incremental document generation.

## Commands

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Watch mode for tests
bun test --watch

# Type checking
bun run typecheck

# Development mode (auto-reload)
bun run dev

# Lint code
bun run lint

# Format code
bun run format
```

## Architecture

### Directory Structure

- `bin/craft.ts` - CLI entry point using Commander.js
- `src/commands/` - CLI command implementations (init, copy, create, run, list, show)
- `src/core/` - Core business logic
- `src/types/` - Type definitions
- `src/utils/` - Utilities (error handling)
- `src/templates/` - Built-in workflow templates (brainstorm, feature-dev, api-design, bug-fix, quick-prototype)
- `tests/` - Test files mirroring src structure

### Core Modules

| Module | Purpose |
|--------|---------|
| `WorkflowLoader` | Loads and validates workflow YAML definitions |
| `SchemaValidator` | Zod-based schema validation |
| `StateManager` | Tracks command execution state and persistence |
| `DependencyResolver` | Resolves command dependencies, detects circular deps |
| `CommandExecutor` | Executes commands with context and variable substitution |
| `VariablePrompter` | Handles variable validation and user prompts |
| `TemplateRenderer` | Renders templates with `{{variable}}` substitution |
| `KnowledgeInjector` | Injects external knowledge into command prompts |
| `ChapterManager` | Manages incremental document generation with chapter groups |
| `SubAgentManager` | Manages parallel subagent execution with dependencies |

### Key Types (`src/core/types.ts`)

- `Workflow` - Root workflow definition with variables and commands
- `WorkflowCommand` - Command definitions with type: template | execution | query | interactive
- `WorkflowVariable` - Variable definitions with type: string | select | boolean
- `KnowledgeInjection` - Knowledge injection config for commands
- `SubAgentDefinition` - Parallel task definitions with dependencies

### Error Handling

Custom error hierarchy in `src/errors.ts`:
- `WorkflowNotFoundError`
- `CommandNotFoundError`
- `ValidationError`
- `DependencyError`
- `StateError`

All errors include helpful hints for users.

## Testing

Tests use Bun's built-in test runner. Test files are co-located with implementation in `src/` (`.test.ts` suffix) plus integration tests in `tests/` directory.
