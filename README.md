# SpecCraft

Spec Creator - 帮团队创建和管理 spec-driven 工作流的工具

## 安装

```bash
bun install
```

## 使用

```bash
# 查看帮助
bun run start --help

# 创建 marketplace
bun run start init my-spec-workflows

# 从模板复制
bun run start copy brainstorm ./my-workflow

# 运行工作流
bun run start run brainstorm init
```

## 开发

```bash
# 开发模式（自动重载）
bun run dev

# 类型检查
bun run typecheck

# 测试
bun run test
```

## License

MIT
