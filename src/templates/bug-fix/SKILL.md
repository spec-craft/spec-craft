# Bug-Fix 工作流

系统性的 Bug 修复流程：复现 → 诊断 → 修复 → 验证。

## 何时使用

- 收到 Bug 报告需要修复
- 发现生产环境问题
- 测试发现的缺陷

## 使用方式

使用 `craft run bug-fix <command>` 执行命令：

### 初始化

```bash
craft run bug-fix init --instance <bug-id>
```

记录 Bug 的基本信息。

### 复现

```bash
craft run bug-fix reproduce --instance <bug-id>
```

尝试复现问题，记录复现步骤。

### 诊断

```bash
craft run bug-fix diagnose --instance <bug-id>
```

分析根因，交互式讨论可能的原因。

### 修复

```bash
craft run bug-fix fix --instance <bug-id>
```

实现修复代码。

### 验证

```bash
craft run bug-fix verify --instance <bug-id>
```

运行测试验证修复。

### 查看状态

```bash
craft run bug-fix status --instance <bug-id>
```

## 流程

1. `init` → 记录 Bug 信息
2. `reproduce` → 稳定复现
3. `diagnose` → 找到根因
4. `fix` → 编写修复
5. `verify` → 确认修复

## 产出

- `specs/bugs/<bug-id>/bug-report.md` — Bug 报告与修复记录
