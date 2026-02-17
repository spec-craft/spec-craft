---
name: speccraft:quick-prototype
description: Rapid prototyping workflow for quick validation. Use when: (1) User wants to quickly validate an idea, (2) User says "prototype", "build a quick demo", "try this out", or similar, (3) Exploratory development where final solution is uncertain, (4) User prefers code-first over documentation-first.
---

# Quick Prototype Workflow

Rapid prototyping with iterate → test → reflect → refine cycle.

## When to Use

- Quick idea validation
- Exploratory development
- Code-first approach preferred

## Commands

### init

Initialize prototype.

```bash
craft run quick-prototype init --instance <feature-name>
```

### prototype

Build prototype.

```bash
craft run quick-prototype prototype --instance <feature-name>
```

### test

Test prototype.

```bash
craft run quick-prototype test --instance <feature-name>
```

### reflect

Reflect on results.

```bash
craft run quick-prototype reflect --instance <feature-name>
```

### refine

Refine based on reflection.

```bash
craft run quick-prototype refine --instance <feature-name>
```

## Example Triggers

```
"You: Help me prototype this idea"
"Let's quickly build something to test"
"I want to try this approach"
"Build me a quick demo"
```
