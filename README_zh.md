# SpecCraft - AI 驱动的开发工作流 Skills

中文文档 | [English](./README.md)

[![npm version](https://img.shields.io/npm/v/@speccraft/cli.svg)](https://www.npmjs.com/package/@speccraft/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SpecCraft 帮助团队通过 **Skills**（技能）创建和管理开发工作流，让 AI 代理（如 Claude Code）能够自然地理解和使用这些工作流。

## 什么是 SpecCraft Skills？

Skills 是 **AI 友好型工作流定义**，让你能够：

- 🎯 告诉 AI 代理你的工作流是什么，什么时候使用
- 📋 定义结构化的步骤和清晰的依赖关系
- 🔄 自动追踪进度
- 🤖 让 AI 引导你完成复杂流程

## 🚀 快速开始（30 秒）

### 步骤 1: 安装

```bash
# 如果还没安装 Bun
curl -fsSL https://bun.sh/install | bash

# 安装 SpecCraft
bun add -g @speccraft/cli
```

### 步骤 2: 使用内置 Skill

首次运行 `craft` 时，它会自动将 skills 安装到你的 Claude Code。只需自然地和 Claude 对话：

```
你："帮我开发一个新功能"
Claude：[使用 speccraft:feature-dev skill]
```

**内置可用 Skills：**
- `speccraft:brainstorm` - 结构化头脑风暴
- `speccraft:feature-dev` - 功能开发周期
- `speccraft:api-design` - API 设计规范
- `speccraft:bug-fix` - Bug 调查与修复
- `speccraft:quick-prototype` - 快速原型

### 步骤 3: 运行工作流

```bash
# 复制一个工作流开始
craft copy feature-dev my-feature

# 运行第一步
craft run my-feature init --instance my-app
```

## 📖 如何使用内置 Skills

### 与 Claude Code 对话

安装 SpecCraft 后，Claude Code 会自动发现你的 Skills。只需描述你想要做什么：

```
你："我需要设计一个用户认证的 API"
Claude：使用 speccraft:api-design skill，提问问题，生成规范

你："登录流程有个 bug"
Claude：使用 speccraft:bug-fix skill，引导你诊断问题

你："帮我头脑风暴一个新产品功能"
Claude：使用 speccraft:brainstorm skill，构建头脑风暴会议
```

### 通过命令行运行

```bash
# 列出可用工作流
craft list

# 查看工作流详情
craft show feature-dev

# 运行工作流命令
craft run my-feature spec --instance my-app
craft run my-feature design --instance my-app

# 查看进度
craft status my-feature
```

## 🔨 创建自定义 Skills

### 快速开始

```bash
# 从模板创建新工作流
craft copy feature-dev my-custom-workflow

# 编辑工作流定义
cd my-custom-workflow
vim workflow.yaml
```

### 发布你的 Skill

与你或你的团队分享你的 Skill：

```bash
# 本地发布（个人使用）
craft publish my-custom-workflow --mode local

# 发布到团队市场
craft publish my-custom-workflow --mode marketplace --marketplace ~/team-workflows
```

你的 Skill 现在对 AI 代理可用了！

## 📚 内置 Skills 参考

### speccraft:brainstorm

**使用场景：** 需要系统化地探索想法

**命令：**
- `init` - 开始头脑风暴会议
- `explore` - 探索不同方向
- `summarize` - 记录关键洞察

### speccraft:feature-dev

**使用场景：** 从零开始构建新功能

**命令：**
- `init` - 初始化功能规范
- `spec` - 编写详细规范
- `design` - 技术设计
- `tasks` - 分解为任务
- `implement` - 实现阶段
- `test` - 测试
- `validate` - 最终验证

### speccraft:api-design

**使用场景：** 设计 APIs

**命令：**
- `init` - 开始 API 设计
- `define` - 定义端点
- `review` - 审查设计
- `done` - 完成

### speccraft:bug-fix

**使用场景：** 调查和修复 Bug

**命令：**
- `init` - 初始化 Bug 报告
- `reproduce` - 复现问题
- `diagnose` - 寻找根本原因
- `fix` - 实现修复
- `verify` - 验证修复

### speccraft:quick-prototype

**使用场景：** 快速原型

**命令：**
- `init` - 开始原型
- `prototype` - 构建原型
- `test` - 快速测试
- `reflect` - 回顾学习
- `refine` - 改进

## CLI 参考

以下是高级用法的 CLI 命令：

```bash
# 工作流管理
craft init <name>           # 创建市场
craft copy <template> [dest]  # 复制模板
craft list                  # 列出工作流
craft show <workflow>      # 显示详情

# 运行工作流
craft run <workflow> <command> [options]
  --instance <name>        # 实例名称
  --force                  # 强制重新运行
  --auto-deps              # 自动运行依赖

# 状态
craft status <workflow>    # 显示进度
craft log <workflow>      # 显示日志

# 发布
craft publish <workflow> [options]
  --mode <local|marketplace>
  --marketplace <路径>
  --force
```

## 项目结构

```
my-workflow/
├── workflow.yaml          # 工作流定义
├── templates/            # 模板文件
└── SKILL.md             # Skill 描述（自动生成）
```

## 高级特性

- **变量** - 动态替换，支持类型（string, select, boolean）
- **依赖** - 使用 `dependsOn` 自动排序
- **知识注入** - 将文档注入到提示中
- **章节系统** - 增量文档生成
- **子代理支持** - 并行 AI 任务执行

详见[完整文档](./docs)。

## 贡献

欢迎提交 Issue 和 PR！[GitHub](https://github.com/spec-craft/spec-craft)
