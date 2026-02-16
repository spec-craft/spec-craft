# SpecCraft

[中文文档](./README_zh.md) | English

[![npm version](https://img.shields.io/npm/v/@speccraft/cli.svg)](https://www.npmjs.com/package/@speccraft/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-170%20passing-brightgreen.svg)](./tests)

**SpecCraft** is a powerful CLI tool for creating and managing spec-driven development workflows. It helps teams structure their work through customizable workflow templates, ensuring consistency and quality throughout the development lifecycle.

## 🌟 Features

### Core Capabilities
- **📋 Workflow Templates**: Pre-built templates for common development scenarios (brainstorming, feature development, API design, bug fixing, prototyping)
- **🔄 State Management**: Track command execution status with automatic dependency resolution
- **✅ Schema Validation**: Robust YAML validation powered by Zod
- **🎯 Variable System**: Dynamic variable substitution with type checking and prompts
- **📚 Knowledge Injection**: Inject external knowledge and documentation into prompts
- **🤖 SubAgent Support**: Parallel task execution with dependency management
- **📖 Chapter System**: Incremental document generation with chapter groups
- **🎨 Custom Error Handling**: User-friendly error messages with helpful hints

### Command Types
1. **Template Commands**: Generate documents from templates with variable substitution
2. **Execution Commands**: Run shell commands with state tracking
3. **Query Commands**: Check project status with validation rules
4. **Interactive Commands**: User interaction points in workflows

## 📦 Installation

### Prerequisites
- [Bun](https://bun.sh/) >= 1.0.0

Install Bun if you haven't already:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Install SpecCraft
Install globally using Bun:
```bash
bun add -g @speccraft/cli
```

Or using npm:
```bash
npm install -g @speccraft/cli
```

Verify installation:
```bash
craft --version
craft --help
```

## 🚀 Quick Start

### 1. Initialize a Marketplace
Create a marketplace directory to store your workflows:

```bash
craft init my-workflows
cd my-workflows
```

This creates:
```
my-workflows/
├── marketplace.json    # Marketplace configuration
└── workflows/         # Your workflow definitions
```

### 2. Copy a Built-in Template
Start with a pre-built template:

```bash
craft copy feature-dev my-feature
```

Available templates:
- `brainstorm` - Structured brainstorming sessions
- `feature-dev` - Complete feature development lifecycle
- `api-design` - API specification and design
- `bug-fix` - Systematic bug investigation and fixing
- `quick-prototype` - Rapid prototyping workflow

### 3. List Available Workflows
```bash
craft list
```

### 4. View Workflow Details
```bash
craft show my-feature
```

### 5. Run Workflow Commands
```bash
# Run a specific command
craft run my-feature init

# Commands run automatically with dependencies
craft run my-feature spec

# Force re-run a completed command
craft run my-feature spec --force

# Auto-run dependencies
craft run my-feature design --auto-deps
```

### 6. Check Workflow Status
```bash
craft status my-feature
```

## 📚 Workflow Structure

### Basic workflow.yaml
```yaml
name: my-workflow
version: 1.0.0
description: My custom workflow

variables:
  feature:
    type: string
    required: true
    description: Feature name
    prompt: Enter the feature name
  
  priority:
    type: select
    options: [P0, P1, P2, P3]
    default: P2

commands:
  init:
    type: template
    description: Initialize feature
    template: templates/init.md
    output: "specs/{{feature}}/init.md"
  
  spec:
    type: template
    description: Write specification
    template: templates/spec.md
    output: "specs/{{feature}}/spec.md"
    dependsOn: [init]
  
  implement:
    type: execution
    description: Implement the feature
    dependsOn: [spec]
    execution:
      shell: "echo Implementing {{feature}}"
  
  validate:
    type: query
    description: Validate implementation
    dependsOn: [implement]
    checks:
      - test-coverage
      - no-lint-errors
```

### Advanced Features

#### 1. Knowledge Injection
Inject external knowledge into command templates:

```yaml
commands:
  design:
    type: template
    description: Generate design
    template: templates/design.md
    output: "docs/design.md"
    injectKnowledge:
      - id: api-guidelines
        source: docs/api-guidelines.md
        removeFromOutput: true
      - id: architecture
        source: docs/architecture.md
```

#### 2. Chapter System
Generate documents incrementally:

```yaml
commands:
  write-docs:
    type: template
    description: Write documentation
    template: templates/docs.md
    output: "docs/{{feature}}/README.md"
    chapters:
      - id: intro
        title: Introduction
      - id: usage
        title: Usage Guide
      - id: api
        title: API Reference
    chapterGroups:
      - name: basics
        chapters: [intro, usage]
      - name: advanced
        chapters: [api]
```

#### 3. SubAgent Parallel Execution
Define parallel tasks with dependencies:

```yaml
commands:
  analyze:
    type: template
    description: Analyze codebase
    template: templates/analysis.md
    output: "analysis/{{feature}}.md"
    subAgents:
      - id: security
        name: Security Analysis
        prompt: "Analyze security implications"
      
      - id: performance
        name: Performance Analysis
        prompt: "Analyze performance impact"
      
      - id: summary
        name: Combined Summary
        prompt: "Summarize findings from security and performance"
        dependsOn: [security, performance]
```

#### 4. Context Management
Control when command context expires:

```yaml
contextManagement:
  resetAfter: 3        # Reset after 3 commands
  roundThreshold: 5    # Reset after 5 total rounds

commands:
  generate:
    type: template
    description: Generate code
    template: templates/code.md
    output: "src/{{feature}}.ts"
    contextManagement:
      resetAfter: 1    # Override: reset after this command
```

## 🛠️ Creating Custom Workflows

### Use the create command
```bash
craft create my-custom-workflow
```

Follow the interactive prompts to:
1. Enter workflow name and description
2. Define variables
3. Add commands
4. Configure dependencies

### Workflow Directory Structure
```
my-custom-workflow/
├── workflow.yaml           # Main workflow definition
├── SKILL.md               # Claude skill prompt (optional)
└── templates/             # Template files
    ├── init.md
    ├── spec.md
    └── design.md
```

### Template Files
Templates use `{{variable}}` syntax for substitution:

```markdown
# Feature: {{feature}}

Priority: {{priority}}

## Overview
This feature will...

## Requirements
- Requirement 1
- Requirement 2
```

## 📖 Built-in Templates

### 1. brainstorm
Structured brainstorming workflow:
- `init` - Initialize brainstorming session
- `explore` - Explore ideas and directions
- `summarize` - Summarize results

### 2. feature-dev
Complete feature development lifecycle:
- `init` - Initialize feature
- `spec` - Write specification
- `design` - Create technical design
- `tasks` - Break down into tasks
- `implement` - Implement code
- `test` - Run tests
- `validate` - Validate completeness
- `fix` - Fix issues
- `status` - Check status

### 3. api-design
API specification workflow:
- `init` - Initialize API design
- `define` - Define endpoints and schemas
- `review` - Review design
- `done` - Finalize specification

### 4. bug-fix
Systematic bug fixing:
- `init` - Initialize bug investigation
- `reproduce` - Reproduce the bug
- `diagnose` - Diagnose root cause
- `fix` - Implement fix
- `verify` - Verify fix works
- `status` - Check progress

### 5. quick-prototype
Rapid prototyping:
- `init` - Initialize prototype
- `prototype` - Build quick prototype
- `test` - Test prototype
- `reflect` - Reflect on learnings
- `refine` - Refine approach
- `status` - Check status

## 🏗️ Architecture

### Core Components

#### WorkflowLoader
Loads and validates workflow definitions from YAML files.

#### SchemaValidator
Validates workflow schemas using Zod for type safety.

#### StateManager
Tracks command execution state, dependencies, and chapter progress.

#### DependencyResolver
Resolves command dependencies and detects circular dependencies.

#### CommandExecutor
Executes commands with proper context and variable substitution.

#### VariablePrompter
Handles variable validation and user prompts.

#### TemplateRenderer
Renders templates with variable substitution.

#### KnowledgeInjector
Injects external knowledge into command prompts.

#### ChapterManager
Manages incremental document generation with chapter groups.

#### SubAgentManager
Manages parallel subagent execution with dependencies.

### Error Handling

Custom error hierarchy with helpful hints:

```typescript
// Workflow not found
throw new WorkflowNotFoundError('my-workflow', './workflows');
// Error [WORKFLOW_NOT_FOUND]: Workflow "my-workflow" not found at ./workflows
// Hint: Make sure the workflow directory exists and contains a workflow.yaml file.

// Validation error
throw new ValidationError(['name is required', 'version is required']);
// Error [VALIDATION_ERROR]: Validation failed with 2 errors:
//   - name is required
//   - version is required

// Dependency error
throw new DependencyError('spec', 'init');
// Error [DEPENDENCY_ERROR]: Cannot execute command "spec" because dependency "init" is not completed
```

## 🧪 Development

### Run Tests
```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

### Type Checking
```bash
bun run typecheck
```

### Development Mode
```bash
# Auto-reload on changes
bun run dev
```

## 📊 Project Status

### Phase Completion

- ✅ **Phase 1**: Core Infrastructure
  - Workflow parsing and validation
  - Basic template system
  - Command execution
  - CLI commands (init, list, show, run, copy)

- ✅ **Phase 2**: State & Dependencies
  - State persistence
  - Dependency resolution
  - Command invalidation
  - Auto-run dependencies

- ✅ **Phase 3**: Advanced Features
  - Knowledge injection
  - Chapter system
  - SubAgent support
  - Workflow creation (craft create)

- ✅ **Phase 4**: Polish & Templates
  - Schema validation (Zod)
  - Error handling
  - Built-in templates (5 total)
  - Integration tests

### Test Coverage
- **170 tests** passing
- **408 assertions**
- **22 test files**
- **100% pass rate**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup (For Contributors)
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/spec-craft.git`
3. Install dependencies: `bun install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Make your changes
6. Run tests: `bun test`
7. Type check: `bun run typecheck`
8. Commit your changes: `git commit -m 'feat: add amazing feature'`
9. Push to the branch: `git push origin feature/amazing-feature`
10. Open a Pull Request

### Local Development
```bash
# Clone the repository
git clone https://github.com/spec-craft/spec-craft.git
cd spec-craft

# Install dependencies
bun install

# Run in development mode (auto-reload)
bun run dev

# Run tests
bun test

# Type checking
bun run typecheck
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [yaml](https://github.com/eemeli/yaml) - YAML parser

## 📮 Support

For questions and support, please open an issue in the [GitHub repository](https://github.com/spec-craft/spec-craft/issues).

---

Made with ❤️ for spec-driven development
