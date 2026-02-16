# 任务列表: {{feature}}

> 创建时间: {{createdAt}}

## 任务概览

根据技术设计，将功能实现拆解为可执行的任务。

## 前端任务

### UI 组件

- [ ] **Task-FE-1**: 创建主界面组件
  - 文件：`src/components/{{feature}}/MainView.tsx`
  - 工作量：2h
  - 依赖：无

- [ ] **Task-FE-2**: 创建表单组件
  - 文件：`src/components/{{feature}}/Form.tsx`
  - 工作量：3h
  - 依赖：Task-FE-1

### 状态管理

- [ ] **Task-FE-3**: 实现状态管理
  - 文件：`src/store/{{feature}}.ts`
  - 工作量：2h
  - 依赖：无

### API 集成

- [ ] **Task-FE-4**: 实现 API 调用
  - 文件：`src/api/{{feature}}.ts`
  - 工作量：2h
  - 依赖：Task-BE-1

## 后端任务

### API 接口

- [ ] **Task-BE-1**: 实现主接口
  - 文件：`src/controllers/{{feature}}.controller.ts`
  - 工作量：3h
  - 依赖：Task-BE-3

- [ ] **Task-BE-2**: 实现查询接口
  - 文件：`src/controllers/{{feature}}.controller.ts`
  - 工作量：2h
  - 依赖：Task-BE-3

### 业务逻辑

- [ ] **Task-BE-3**: 实现核心业务逻辑
  - 文件：`src/services/{{feature}}.service.ts`
  - 工作量：4h
  - 依赖：Task-BE-5

- [ ] **Task-BE-4**: 实现数据验证
  - 文件：`src/validators/{{feature}}.validator.ts`
  - 工作量：2h
  - 依赖：无

### 数据访问

- [ ] **Task-BE-5**: 实现数据模型
  - 文件：`src/models/{{feature}}.model.ts`
  - 工作量：2h
  - 依赖：无

- [ ] **Task-BE-6**: 实现数据访问层
  - 文件：`src/repositories/{{feature}}.repository.ts`
  - 工作量：3h
  - 依赖：Task-BE-5

### 数据库

- [ ] **Task-DB-1**: 创建数据库迁移
  - 文件：`migrations/xxx_create_{{feature}}_table.sql`
  - 工作量：1h
  - 依赖：无

## 测试任务

### 单元测试

- [ ] **Task-TEST-1**: 编写前端单元测试
  - 文件：`tests/components/{{feature}}/*.test.tsx`
  - 工作量：3h
  - 依赖：Task-FE-1, Task-FE-2

- [ ] **Task-TEST-2**: 编写后端单元测试
  - 文件：`tests/services/{{feature}}.test.ts`
  - 工作量：4h
  - 依赖：Task-BE-3

### 集成测试

- [ ] **Task-TEST-3**: 编写 API 集成测试
  - 文件：`tests/integration/{{feature}}.test.ts`
  - 工作量：3h
  - 依赖：Task-BE-1, Task-BE-2

### E2E 测试

- [ ] **Task-TEST-4**: 编写端到端测试
  - 文件：`e2e/{{feature}}.spec.ts`
  - 工作量：4h
  - 依赖：所有开发任务

## 文档任务

- [ ] **Task-DOC-1**: 更新 API 文档
  - 文件：`docs/api/{{feature}}.md`
  - 工作量：1h
  - 依赖：Task-BE-1, Task-BE-2

- [ ] **Task-DOC-2**: 编写用户指南
  - 文件：`docs/user-guide/{{feature}}.md`
  - 工作量：2h
  - 依赖：所有 UI 任务

## 部署任务

- [ ] **Task-OPS-1**: 配置环境变量
  - 文件：`.env.example`
  - 工作量：0.5h
  - 依赖：无

- [ ] **Task-OPS-2**: 更新部署脚本
  - 文件：`deploy/{{feature}}.sh`
  - 工作量：1h
  - 依赖：无

## 任务依赖关系

```
Task-DB-1
    ↓
Task-BE-5 → Task-BE-6 → Task-BE-3 → Task-BE-1
                                  ↓
Task-BE-4                    Task-BE-2
    ↓                             ↓
Task-FE-3                    Task-FE-4
    ↓                             ↓
Task-FE-1 → Task-FE-2
```

## 工作量估算

- **前端**: 9h
- **后端**: 16h
- **测试**: 14h
- **文档**: 3h
- **部署**: 1.5h
- **总计**: 43.5h (约 5-6 人天)

## 里程碑

1. **M1: 数据层完成** (Day 1)
   - Task-DB-1, Task-BE-5, Task-BE-6

2. **M2: API 完成** (Day 2)
   - Task-BE-3, Task-BE-4, Task-BE-1, Task-BE-2

3. **M3: 前端完成** (Day 3)
   - Task-FE-1, Task-FE-2, Task-FE-3, Task-FE-4

4. **M4: 测试完成** (Day 4-5)
   - Task-TEST-1, Task-TEST-2, Task-TEST-3, Task-TEST-4

5. **M5: 文档和部署** (Day 5-6)
   - Task-DOC-1, Task-DOC-2, Task-OPS-1, Task-OPS-2

## 下一步

运行 `craft run feature-dev implement -i {{feature}}` 开始实现代码。
