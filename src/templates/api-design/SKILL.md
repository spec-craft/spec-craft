# API Design 工作流

系统性的 API 设计流程，从需求到规格到评审。

## 何时使用

- 设计新的 REST/GraphQL API
- 重构或扩展现有 API
- 需要团队评审的 API 变更

## 使用方式

使用 `craft run api-design <command>` 执行命令：

### 初始化

```bash
craft run api-design init --instance <api-name>
```

创建 API 设计文档目录。

### 定义 API 规格

```bash
craft run api-design define --instance <api-name>
```

生成详细的 API 规格文档（endpoints, request/response, errors）。

### 审查

```bash
craft run api-design review --instance <api-name>
```

交互式审查 API 设计，检查一致性和最佳实践。

### 完成

```bash
craft run api-design done --instance <api-name>
```

确认 API 设计完成。

## 产出

- `specs/<api>/init.md` — API 概述
- `specs/<api>/api-spec.md` — 完整 API 规格
