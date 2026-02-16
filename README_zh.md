# SpecCraft

中文文档 | [English](./README.md)

[![npm version](https://img.shields.io/npm/v/@speccraft/cli.svg)](https://www.npmjs.com/package/@speccraft/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-170%20passing-brightgreen.svg)](./tests)

**SpecCraft** 是一个强大的 CLI 工具，用于创建和管理规范驱动的开发工作流。它通过可定制的工作流模板帮助团队规范工作流程，确保整个开发生命周期的一致性和质量。

## 🌟 特性

### 核心能力
- **📋 工作流模板**: 内置常见开发场景的模板（头脑风暴、功能开发、API 设计、Bug 修复、快速原型）
- **🔄 状态管理**: 自动依赖解析的命令执行状态追踪
- **✅ Schema 验证**: 基于 Zod 的强大 YAML 验证
- **🎯 变量系统**: 支持类型检查和提示的动态变量替换
- **📚 知识注入**: 将外部知识和文档注入到提示中
- **🤖 子代理支持**: 支持依赖管理的并行任务执行
- **📖 章节系统**: 支持章节分组的增量文档生成
- **🎨 自定义错误处理**: 用户友好的错误消息和有用的提示

### 命令类型
1. **模板命令**: 从模板生成文档，支持变量替换
2. **执行命令**: 运行 shell 命令并追踪状态
3. **查询命令**: 使用验证规则检查项目状态
4. **交互命令**: 工作流中的用户交互点

## 📦 安装

### 前置要求
- [Bun](https://bun.sh/) >= 1.0.0

如果还没安装 Bun，先安装它：
```bash
curl -fsSL https://bun.sh/install | bash
```

### 安装 SpecCraft
使用 Bun 全局安装：
```bash
bun add -g @speccraft/cli
```

或使用 npm：
```bash
npm install -g @speccraft/cli
```

验证安装：
```bash
craft --version
craft --help
```

## 🚀 快速开始

### 1. 初始化 Marketplace
创建一个 marketplace 目录来存储你的工作流：

```bash
craft init my-workflows
cd my-workflows
```

这会创建：
```
my-workflows/
├── marketplace.json    # Marketplace 配置
└── workflows/         # 你的工作流定义
```

### 2. 复制内置模板
从预置模板开始：

```bash
craft copy feature-dev my-feature
```

可用模板：
- `brainstorm` - 结构化头脑风暴会议
- `feature-dev` - 完整的功能开发生命周期
- `api-design` - API 规范和设计
- `bug-fix` - 系统化的 Bug 调查和修复
- `quick-prototype` - 快速原型开发工作流

### 3. 列出可用工作流
```bash
craft list
```

### 4. 查看工作流详情
```bash
craft show my-feature
```

### 5. 运行工作流命令
```bash
# 运行特定命令
craft run my-feature init

# 命令会自动运行依赖项
craft run my-feature spec

# 强制重新运行已完成的命令
craft run my-feature spec --force

# 自动运行依赖项
craft run my-feature design --auto-deps
```

### 6. 检查工作流状态
```bash
craft status my-feature
```

## 📚 工作流结构

### 基础 workflow.yaml
```yaml
name: my-workflow
version: 1.0.0
description: 我的自定义工作流

variables:
  feature:
    type: string
    required: true
    description: 功能名称
    prompt: 请输入功能名称
  
  priority:
    type: select
    options: [P0, P1, P2, P3]
    default: P2

commands:
  init:
    type: template
    description: 初始化功能
    template: templates/init.md
    output: "specs/{{feature}}/init.md"
  
  spec:
    type: template
    description: 编写规范
    template: templates/spec.md
    output: "specs/{{feature}}/spec.md"
    dependsOn: [init]
  
  implement:
    type: execution
    description: 实现功能
    dependsOn: [spec]
    execution:
      shell: "echo 正在实现 {{feature}}"
  
  validate:
    type: query
    description: 验证实现
    dependsOn: [implement]
    checks:
      - test-coverage
      - no-lint-errors
```

### 高级特性

#### 1. 知识注入
将外部知识注入到命令模板中：

```yaml
commands:
  design:
    type: template
    description: 生成设计文档
    template: templates/design.md
    output: "docs/design.md"
    injectKnowledge:
      - id: api-guidelines
        source: docs/api-guidelines.md
        removeFromOutput: true
      - id: architecture
        source: docs/architecture.md
```

#### 2. 章节系统
增量生成文档：

```yaml
commands:
  write-docs:
    type: template
    description: 编写文档
    template: templates/docs.md
    output: "docs/{{feature}}/README.md"
    chapters:
      - id: intro
        title: 简介
      - id: usage
        title: 使用指南
      - id: api
        title: API 参考
    chapterGroups:
      - name: basics
        chapters: [intro, usage]
      - name: advanced
        chapters: [api]
```

#### 3. 子代理并行执行
定义带依赖关系的并行任务：

```yaml
commands:
  analyze:
    type: template
    description: 分析代码库
    template: templates/analysis.md
    output: "analysis/{{feature}}.md"
    subAgents:
      - id: security
        name: 安全分析
        prompt: "分析安全影响"
      
      - id: performance
        name: 性能分析
        prompt: "分析性能影响"
      
      - id: summary
        name: 综合总结
        prompt: "总结安全和性能分析的发现"
        dependsOn: [security, performance]
```

#### 4. 上下文管理
控制命令上下文何时过期：

```yaml
contextManagement:
  resetAfter: 3        # 3 个命令后重置
  roundThreshold: 5    # 总共 5 轮后重置

commands:
  generate:
    type: template
    description: 生成代码
    template: templates/code.md
    output: "src/{{feature}}.ts"
    contextManagement:
      resetAfter: 1    # 覆盖：此命令后重置
```

## 🛠️ 创建自定义工作流

### 使用 create 命令
```bash
craft create my-custom-workflow
```

按照交互式提示进行：
1. 输入工作流名称和描述
2. 定义变量
3. 添加命令
4. 配置依赖关系

### 工作流目录结构
```
my-custom-workflow/
├── workflow.yaml           # 主工作流定义
├── SKILL.md               # Claude skill 提示（可选）
└── templates/             # 模板文件
    ├── init.md
    ├── spec.md
    └── design.md
```

### 模板文件
模板使用 `{{variable}}` 语法进行替换：

```markdown
# 功能：{{feature}}

优先级：{{priority}}

## 概述
此功能将...

## 需求
- 需求 1
- 需求 2
```

## 📖 内置模板

### 1. brainstorm（头脑风暴）
结构化头脑风暴工作流：
- `init` - 初始化头脑风暴会议
- `explore` - 探索想法和方向
- `summarize` - 总结结果

### 2. feature-dev（功能开发）
完整的功能开发生命周期：
- `init` - 初始化功能
- `spec` - 编写规范
- `design` - 创建技术设计
- `tasks` - 分解任务
- `implement` - 实现代码
- `test` - 运行测试
- `validate` - 验证完整性
- `fix` - 修复问题
- `status` - 检查状态

### 3. api-design（API 设计）
API 规范工作流：
- `init` - 初始化 API 设计
- `define` - 定义端点和 Schema
- `review` - 审查设计
- `done` - 完成规范

### 4. bug-fix（Bug 修复）
系统化的 Bug 修复：
- `init` - 初始化 Bug 调查
- `reproduce` - 复现 Bug
- `diagnose` - 诊断根本原因
- `fix` - 实现修复
- `verify` - 验证修复有效
- `status` - 检查进度

### 5. quick-prototype（快速原型）
快速原型开发：
- `init` - 初始化原型
- `prototype` - 构建快速原型
- `test` - 测试原型
- `reflect` - 反思学习
- `refine` - 优化方法
- `status` - 检查状态

## 🏗️ 架构

### 核心组件

#### WorkflowLoader（工作流加载器）
从 YAML 文件加载和验证工作流定义。

#### SchemaValidator（Schema 验证器）
使用 Zod 验证工作流 Schema，确保类型安全。

#### StateManager（状态管理器）
追踪命令执行状态、依赖关系和章节进度。

#### DependencyResolver（依赖解析器）
解析命令依赖关系并检测循环依赖。

#### CommandExecutor（命令执行器）
使用正确的上下文和变量替换执行命令。

#### VariablePrompter（变量提示器）
处理变量验证和用户提示。

#### TemplateRenderer（模板渲染器）
使用变量替换渲染模板。

#### KnowledgeInjector（知识注入器）
将外部知识注入到命令提示中。

#### ChapterManager（章节管理器）
管理带章节分组的增量文档生成。

#### SubAgentManager（子代理管理器）
管理带依赖关系的并行子代理执行。

### 错误处理

自定义错误层级，提供有用的提示：

```typescript
// 工作流未找到
throw new WorkflowNotFoundError('my-workflow', './workflows');
// Error [WORKFLOW_NOT_FOUND]: Workflow "my-workflow" not found at ./workflows
// Hint: Make sure the workflow directory exists and contains a workflow.yaml file.

// 验证错误
throw new ValidationError(['name is required', 'version is required']);
// Error [VALIDATION_ERROR]: Validation failed with 2 errors:
//   - name is required
//   - version is required

// 依赖错误
throw new DependencyError('spec', 'init');
// Error [DEPENDENCY_ERROR]: Cannot execute command "spec" because dependency "init" is not completed
```

## 🧪 开发

### 运行测试
```bash
# 运行所有测试
bun test

# 运行覆盖率测试
bun test --coverage

# Watch 模式
bun test --watch
```

### 类型检查
```bash
bun run typecheck
```

### 开发模式
```bash
# 修改后自动重载
bun run dev
```

## 📊 项目状态

### 阶段完成情况

- ✅ **Phase 1**: 核心基础设施
  - 工作流解析和验证
  - 基础模板系统
  - 命令执行
  - CLI 命令（init, list, show, run, copy）

- ✅ **Phase 2**: 状态与依赖
  - 状态持久化
  - 依赖解析
  - 命令失效
  - 自动运行依赖

- ✅ **Phase 3**: 高级特性
  - 知识注入
  - 章节系统
  - 子代理支持
  - 工作流创建（craft create）

- ✅ **Phase 4**: 完善与模板
  - Schema 验证（Zod）
  - 错误处理
  - 内置模板（共 5 个）
  - 集成测试

### 测试覆盖率
- **170 个测试**全部通过
- **408 个断言**
- **22 个测试文件**
- **100% 通过率**

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 开发设置（贡献者）
1. Fork 仓库
2. 克隆你的 fork：`git clone https://github.com/your-username/spec-craft.git`
3. 安装依赖：`bun install`
4. 创建特性分支：`git checkout -b feature/amazing-feature`
5. 进行修改
6. 运行测试：`bun test`
7. 类型检查：`bun run typecheck`
8. 提交修改：`git commit -m 'feat: add amazing feature'`
9. 推送到分支：`git push origin feature/amazing-feature`
10. 打开 Pull Request

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/spec-craft/spec-craft.git
cd spec-craft

# 安装依赖
bun install

# 开发模式运行（自动重载）
bun run dev

# 运行测试
bun test

# 类型检查
bun run typecheck
```

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

构建工具：
- [Bun](https://bun.sh/) - 快速的 JavaScript 运行时
- [Commander.js](https://github.com/tj/commander.js) - CLI 框架
- [Zod](https://github.com/colinhacks/zod) - Schema 验证
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - 交互式提示
- [Chalk](https://github.com/chalk/chalk) - 终端样式
- [yaml](https://github.com/eemeli/yaml) - YAML 解析器

## 📮 支持

如有问题和支持需求，请在 [GitHub 仓库](https://github.com/spec-craft/spec-craft/issues)中提出 issue。

---

用 ❤️ 为规范驱动开发而构建
