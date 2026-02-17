---
name: speccraft:api-design
description: API design workflow for creating REST/GraphQL APIs. Use when: (1) User needs to design a new API, (2) User says "design an API", "create an endpoint", "API specification", or similar, (3) User wants to document API requirements, (4) User needs API review workflow.
---

# API Design Workflow

Systematic API design from requirements to specification to review.

## When to Use

- Designing new REST/GraphQL APIs
- Refactoring or extending existing APIs
- API changes requiring team review

## Commands

### init

Initialize API design.

```bash
craft run api-design init --instance <api-name>
```

### define

Define API specification.

```bash
craft run api-design define --instance <api-name>
```

### review

Review API design.

```bash
craft run api-design review --instance <api-name>
```

### done

Finalize API design.

```bash
craft run api-design done --instance <api-name>
```

## Example Triggers

```
"You: Help me design an API"
"You: I need to create a new endpoint"
"You: Write an API specification for..."
```
