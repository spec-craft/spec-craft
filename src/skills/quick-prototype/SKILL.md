# Quick-Prototype 工作流

快速原型迭代：先写代码，再测试，再反思，再优化。

## 何时使用

- 需要快速验证一个想法
- 探索性开发，不确定最终方案
- 想先写代码再补文档

## 使用方式

使用 `craft run quick-prototype <command>` 执行命令：

### 初始化

```bash
craft run quick-prototype init --instance <feature-name>
```

记录原型目标和约束。

### 实现原型

```bash
craft run quick-prototype prototype --instance <feature-name>
```

快速实现原型代码。

### 测试

```bash
craft run quick-prototype test --instance <feature-name>
```

运行测试。

### 反思

```bash
craft run quick-prototype reflect --instance <feature-name>
```

基于测试结果，讨论改进方向。

### 优化

```bash
craft run quick-prototype refine --instance <feature-name>
```

基于反思结果优化代码。

## 流程

1. `init` → 明确目标
2. `prototype` → 快速实现
3. `test` → 验证
4. `reflect` → 反思
5. `refine` → 优化
6. 重复 3-5 直到满意

## 产出

- `specs/prototypes/<feature>/prototype.md` — 原型记录
