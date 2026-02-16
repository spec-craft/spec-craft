# {{api}} - API 规格

> 基于: init.md
> 创建时间: {{createdAt}}

---

## Base URL

```
/api/v1/{{api}}
```

## Authentication

<!-- 认证方式说明 -->

## Endpoints

### GET /

**描述:**

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|

**响应:**

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### POST /

**描述:**

**请求体:**

```json
{
}
```

**响应:**

```json
{
  "data": {}
}
```

## Error Codes

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_REQUEST | 请求参数无效 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器错误 |

## Rate Limiting

<!-- 限流策略 -->

## Versioning

<!-- 版本策略 -->
