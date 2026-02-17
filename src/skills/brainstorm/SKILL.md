# 头脑风暴工作流

帮助用户进行头脑风暴，探索和定义需求。

## 使用方法

```bash
# 初始化头脑风暴
craft run brainstorm init --instance <topic>

# 探索问题和方向
craft run brainstorm explore --instance <topic>

# 总结头脑风暴结果
craft run brainstorm summarize --instance <topic>
```

## 变量

| 变量 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `topic` | string | 是 | 头脑风暴的主题 |

## 命令流程

1. **init** - 初始化头脑风暴，理解主题背景
2. **explore** - 深入探索各个方向
3. **summarize** - 总结结果，提出建议

## 输出

所有输出保存在 `brainstorms/<topic>/` 目录下。
