---
name: speccraft:bug-fix
description: Systematic bug investigation and fixing workflow. Use when: (1) User has a bug to fix, (2) User says "there's a bug", "fix this issue", "debug this", or similar, (3) User needs systematic reproduce → diagnose → fix → verify flow, (4) User needs root cause analysis.
---

# Bug Fix Workflow

Systematic bug investigation and fixing.

## When to Use

- Bug report needs fixing
- Production issues discovered
- Test failures to address

## Commands

### init

Initialize bug report.

```bash
craft run bug-fix init --instance <bug-id>
```

### reproduce

Reproduce the bug.

```bash
craft run bug-fix reproduce --instance <bug-id>
```

### diagnose

Diagnose root cause.

```bash
craft run bug-fix diagnose --instance <bug-id>
```

### fix

Implement fix.

```bash
craft run bug-fix fix --instance <bug-id>
```

### verify

Verify the fix.

```bash
craft run bug-fix verify --instance <bug-id>
```

## Example Triggers

```
"You: There's a bug in the login flow"
"You: Fix this issue"
"You: Debug this problem"
"You: There's something wrong with..."
```
