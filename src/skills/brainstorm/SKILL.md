---
name: speccraft:brainstorm
description: Structured brainstorming workflow for exploring ideas and defining requirements. Use when: (1) User wants to explore ideas or solve a problem, (2) User needs to define requirements for a new feature, (3) User says "brainstorm", "think through", "explore options", or similar, (4) User needs to structure unstructured thoughts into actionable items.
---

# Brainstorm Workflow

Structured brainstorming sessions to explore ideas and define requirements.

## When to Use

- Exploring new ideas or solving problems
- Defining requirements for new features
- Structuring unstructured thoughts

## Commands

### init

Initialize the brainstorming session.

```bash
craft run brainstorm init --instance <topic>
```

### explore

Explore different directions and aspects.

```bash
craft run brainstorm explore --instance <topic>
```

### summarize

Document key insights and recommendations.

```bash
craft run brainstorm summarize --instance <topic>
```

## Output

All outputs saved in `brainstorms/<topic>/`

## Example Triggers

```
"You: Help me brainstorm a new feature"
"You: I need to think through this problem"
"You: Let's explore some ideas for..."
```
