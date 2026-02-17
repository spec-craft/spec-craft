---
name: speccraft:feature-dev
description: Complete feature development lifecycle from requirements to implementation. Use when: (1) User wants to develop a new feature, (2) User needs complete spec → design → implement → test flow, (3) User says "develop a feature", "implement new functionality", "build a feature", or similar, (4) Team collaboration requires clear task decomposition.
---

# Feature Development Workflow

Complete feature development lifecycle.

## When to Use

- Developing a new feature
- Need complete spec → design → implement → test flow
- Team collaboration requires clear task decomposition

## Commands

### init

Initialize feature specification.

```bash
craft run feature-dev init -i <feature-name>
```

### spec

Write detailed specification.

```bash
craft run feature-dev spec -i <feature-name>
```

### design

Technical design.

```bash
craft run feature-dev design -i <feature-name>
```

### tasks

Generate task list.

```bash
craft run feature-dev tasks -i <feature-name>
```

### implement

Implement code.

```bash
craft run feature-dev implement -i <feature-name>
```

### test

Run tests.

```bash
craft run feature-dev test -i <feature-name>
```

### validate

Validate completeness.

```bash
craft run feature-dev validate -i <feature-name>
```

### fix

Fix issues.

```bash
craft run feature-dev fix -i <feature-name>
```

## Example Triggers

```
"You: Help me develop a new feature"
"You: I need to implement user authentication"
"You: Build a new API endpoint"
```
