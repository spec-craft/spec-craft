# Feature-dev 工作流

标准功能开发流程，涵盖从需求规格到代码实现的完整链路。

## 何时使用

- 开发一个新功能
- 需要完整的文档 → 设计 → 实现流程
- 团队协作开发，需要清晰的任务分解

## 使用方式

使用 `craft run feature-dev <command>` 执行命令：

### 初始化

```bash
craft run feature-dev init -i <feature-name>
```

创建功能开发的初始文档，设置基本信息。

### 需求规格

```bash
craft run feature-dev spec -i <feature-name>
```

生成详细的需求规格文档，包括：
- 功能描述
- 用户故事
- 验收标准
- 边界条件

### 技术设计

```bash
craft run feature-dev design -i <feature-name>
```

基于需求规格生成技术设计文档，包括：
- 架构设计
- 接口设计
- 数据模型
- 技术选型

### 任务分解

```bash
craft run feature-dev tasks -i <feature-name>
```

根据技术设计生成可执行的任务列表。

### 实现代码

```bash
craft run feature-dev implement -i <feature-name>
```

根据任务列表实现代码。

### 运行测试

```bash
craft run feature-dev test -i <feature-name>
```

运行测试并生成测试报告。

### 验证完整性

```bash
craft run feature-dev validate -i <feature-name>
```

验证功能是否完整，检查：
- 规格完整性
- 测试覆盖率
- 代码质量

### 修复问题

```bash
craft run feature-dev fix -i <feature-name>
```

根据验证结果修复发现的问题。

### 查看状态

```bash
craft run feature-dev status -i <feature-name>
```

查看当前功能开发的进度和状态。

## 流程建议

1. 先运行 `init` 初始化
2. 运行 `spec` 编写需求规格
3. 运行 `design` 完成技术设计
4. 运行 `tasks` 生成任务列表
5. 运行 `implement` 实现代码
6. 运行 `test` 验证功能
7. 运行 `validate` 检查完整性
8. 如有问题，运行 `fix` 修复
9. 随时用 `status` 查看进度

## 产出

- `specs/<feature>/init.md` — 初始化文档
- `specs/<feature>/spec.md` — 需求规格
- `specs/<feature>/design.md` — 技术设计
- `specs/<feature>/tasks.md` — 任务列表
- 代码实现
- 测试报告

## 特性

- **文档代码无边界**：文档生成和代码实现在同一个工作流中
- **依赖自动执行**：运行某个命令时，自动执行所有前置依赖
- **状态追踪**：记录每个命令的执行状态
- **增量开发**：支持在任意阶段暂停和恢复
