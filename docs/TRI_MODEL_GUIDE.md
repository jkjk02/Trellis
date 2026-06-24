# Trellis 三模型协作系统 - 使用指南

## 概览

Trellis 三模型协作系统将 Claude（编排）、Codex（后端实现）、Gemini（前端实现）深度融合，通过交叉测试机制确保代码质量，实时监控展示开发进度。

**核心特性**：
- 🎭 **三模型协作**：Claude 编排，Codex 写后端，Gemini 写前端
- 🔄 **交叉测试**：Codex 测前端，Gemini 测后端，避免同模型自信偏差
- 📡 **实时监控**：终端 + Web 双界面监控 worker 状态
- 🚀 **Trellis 原生**：完全基于 Trellis Channel 系统，无需额外基础设施
- 💾 **自动学习**：失败自动触发 break-loop → update-spec 闭环

## 快速开始

### 前置条件

1. **安装 CLI 工具**：
   ```bash
   # Codex CLI (本地)
   npm install -g @codexlang/cli
   
   # Gemini CLI (本地)
   npm install -g @google/gemini-cli
   
   # Trellis (已安装)
   npm install -g @mindfoldhq/trellis
   ```

2. **配置 API Keys**：
   ```bash
   # Codex
   export CODEX_API_KEY="your-key"
   
   # Gemini
   export GEMINI_API_KEY="your-key"
   ```

3. **验证安装**：
   ```bash
   codex --version  # 应输出版本号
   gemini --version # 应输出版本号
   trellis --version
   ```

### 第一个三模型任务

#### 1. 创建任务

```bash
# 在 Trellis 项目中
cd your-trellis-project

# 创建任务（自动识别需要三模型协作）
trellis task create "用户资料编辑功能" --slug user-profile-edit
```

#### 2. 规划阶段（自动或手动）

Claude 会自动分析任务，将其分解为前端 + 后端：

```markdown
## 任务分解

### 后端部分 (Codex)
- API endpoint: `PUT /api/users/:id`
- 请求验证：email format, password strength
- 数据库更新：users 表
- 响应格式：`{ success, user }`

### 前端部分 (Gemini)
- 组件：`ProfileEditForm.tsx`
- 表单验证：Zod schema
- API 集成：调用 PUT /api/users/:id
- 设计系统：shadcn/ui
```

#### 3. 执行阶段（并行实现）

Claude 自动 spawn 两个 workers：

```bash
# 后端 worker (Codex)
trellis channel spawn user-profile-edit \
  --agent backend-implement \
  --provider codex \
  --as codex-backend \
  "Active task: .trellis/tasks/user-profile-edit

Implement backend according to backend-implement.jsonl"

# 前端 worker (Gemini)
trellis channel spawn user-profile-edit \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-frontend \
  "Active task: .trellis/tasks/user-profile-edit

Implement frontend according to frontend-implement.jsonl"
```

#### 4. 监控进度

**终端监控**：
```bash
# 实时跟踪
python .trellis/scripts/monitor_channel.py user-profile-edit --follow

# 输出示例
📡 Monitoring channel 'user-profile-edit' (Ctrl+C to exit)...

[spawned]  by=main  worker=codex-backend provider=codex  06:50:23
[spawned]  by=main  worker=gemini-frontend provider=gemini  06:50:25
[done]     by=codex-backend  Backend complete. 3 files modified.  06:55:12
[done]     by=gemini-frontend  Frontend complete. 5 components.  06:56:08
```

**Web 监控**：
```bash
# 打开监控界面
open .trellis/tools/monitor-web.html

# 输入 channel 名称: user-profile-edit
# 点击"开始监控"
```

#### 5. 交叉测试阶段

实现完成后，Claude 自动启动交叉测试：

```bash
# Codex 测试 Gemini 的前端
trellis channel spawn user-profile-edit-cross \
  --agent backend-implement \
  --provider codex \
  --as codex-test-frontend \
  "Review frontend code: src/components/ProfileEditForm.tsx
  
Check:
- API integration correctness
- Type safety
- Error handling"

# Gemini 测试 Codex 的后端
trellis channel spawn user-profile-edit-cross \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-test-backend \
  "Review backend API: src/api/users.ts
  
Check:
- Endpoint contract compliance
- Response format
- Error codes"
```

#### 6. Claude 最终审核

交叉测试完成后，Claude 审查结果并提示用户：

```
浮浮酱的交叉测试完成了喵～

Codex 测试前端: ⚠️  发现 1 个警告（缺少 email 验证）
Gemini 测试后端: ✅ 全部通过

主人决定？
1. 通过，提交代码 (推荐)
2. 修复前端问题
3. 人工介入审查
```

用户选择"修复前端问题"后，Claude 重新 spawn Gemini worker 修复。

#### 7. 提交变更

```bash
# Claude 自动执行
git add src/api/users.ts src/components/ProfileEditForm.tsx
git commit -m "feat: user profile editing with validation

Backend:
- Add PUT /api/users/:id endpoint
- Email and password validation
- Users table update

Frontend:
- ProfileEditForm component with Zod validation
- API integration with error handling
- shadcn/ui design system

Cross-tested by Codex (frontend) and Gemini (backend).
"
```

## 核心概念

### 1. Agent 卡片

系统包含 3 个 agent 卡片：

- **backend-implement** (Codex)
  - 路径：`.trellis/agents/backend-implement.md`
  - 职责：API、数据库、业务逻辑
  - 输入：`backend-implement.jsonl`
  
- **frontend-implement** (Gemini)
  - 路径：`.trellis/agents/frontend-implement.md`
  - 职责：UI 组件、设计系统、浏览器端代码
  - 输入：`frontend-implement.jsonl`、open-design skill

### 2. Context Manifest

每个 worker 接收专属的 context manifest (`.jsonl` 文件)：

**backend-implement.jsonl**:
```jsonl
{"path": "src/api/users.ts", "purpose": "User API endpoints"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST conventions"}
{"path": "src/db/schema.sql", "purpose": "Database schema"}
```

**frontend-implement.jsonl**:
```jsonl
{"path": "src/components/UserList.tsx", "purpose": "Reference component"}
{"path": ".agents/skills/open-design/SKILL.md", "purpose": "Design system guide"}
{"path": ".trellis/spec/frontend/react.md", "purpose": "React conventions"}
```

### 3. 交叉测试协议

#### Codex 测试前端

检查项：
- ✅ API 调用是否匹配后端 endpoint
- ✅ 请求/响应类型是否对齐
- ✅ 错误处理是否覆盖后端错误码
- ⚠️  硬编码 URL（应使用环境变量）

输出格式：
```markdown
## Frontend Cross-Test Report (Codex)

### Files Reviewed
- src/components/ProfileEditForm.tsx

### Findings
1. ✅ API endpoint correct: PUT /api/users/:id
2. ⚠️  Missing 429 rate limit handling
3. ❌ Hardcoded backend URL in line 42

### Verdict
Blocking issues: 1
Warnings: 1
```

#### Gemini 测试后端

检查项：
- ✅ Endpoints 是否提供前端需要的所有接口
- ✅ 响应 schema 是否包含前端使用的所有字段
- ✅ 错误码是否有文档
- ⚠️  CORS 配置（如果前后端分离）

### 4. 监控系统

#### 终端监控

```bash
# 一次性查看
trellis channel messages <channel-name>

# 实时跟踪（推荐）
python .trellis/scripts/monitor_channel.py <channel-name> --follow
```

#### Web 监控

打开 `.trellis/tools/monitor-web.html`，输入 channel 名称，实时查看：
- Worker 状态（spawned/working/done/error）
- 实时日志输出
- 多 worker 并行进度

**注意**：Web 监控是演示界面，实际使用需要配合本地 HTTP 服务包装 `trellis channel messages` 命令。

## 高级用法

### 手动控制工作流

如果不希望 Claude 自动编排，可以手动 spawn workers：

```bash
# 1. 手动创建 context manifests
cat > .trellis/tasks/my-task/backend-implement.jsonl <<EOF
{"path": "src/api/posts.ts", "purpose": "Posts API"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST guide"}
EOF

cat > .trellis/tasks/my-task/frontend-implement.jsonl <<EOF
{"path": "src/components/PostList.tsx", "purpose": "Reference"}
{"path": ".agents/skills/open-design/SKILL.md", "purpose": "Design"}
EOF

# 2. Spawn backend worker
trellis channel spawn my-task \
  --agent backend-implement \
  --provider codex \
  --as codex-backend \
  --jsonl .trellis/tasks/my-task/backend-implement.jsonl \
  "Implement posts API: GET /api/posts, POST /api/posts"

# 3. Spawn frontend worker
trellis channel spawn my-task \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-frontend \
  --jsonl .trellis/tasks/my-task/frontend-implement.jsonl \
  "Implement PostList component with shadcn/ui"

# 4. Monitor progress
python .trellis/scripts/monitor_channel.py my-task --follow

# 5. Manual cross-test (optional)
trellis channel spawn my-task-cross \
  --agent backend-implement \
  --provider codex \
  --as codex-test-frontend \
  "Review frontend in src/components/PostList.tsx for API correctness"
```

### 仅使用单个模型

如果任务只需要后端或前端，直接 spawn 单个 worker：

```bash
# 仅后端（使用 Codex）
trellis channel spawn api-refactor \
  --agent backend-implement \
  --provider codex \
  "Refactor API error handling in src/api/"

# 仅前端（使用 Gemini）
trellis channel spawn ui-redesign \
  --agent frontend-implement \
  --provider gemini \
  "Redesign landing page with Tailwind + shadcn/ui"
```

### 调试 Worker

查看 worker 详细日志：

```bash
# 查看 worker 日志文件
tail -f ~/.trellis/channels/<project>/<channel>/<worker>.log

# 示例
tail -f ~/.trellis/channels/my-project/user-profile-edit/codex-backend.log
```

常见问题：

1. **Handshake timeout**：
   - Codex/Gemini CLI 未正确安装或 PATH 未配置
   - API key 未设置
   - 解决：检查 `codex --version` 和 `gemini --version`

2. **Worker crash**：
   - 查看日志文件中的错误信息
   - 检查 context manifest 路径是否正确
   - 验证 agent 卡片文件存在

3. **交叉测试失败**：
   - 正常！这是发现问题的机制
   - 根据测试报告修复对应代码
   - 重新 spawn 相关 worker

## 与 Trellis 工作流集成

三模型系统完全遵循 Trellis 原有工作流：

### Phase 1: Plan (不变)
- 创建 PRD (`prd.md`)
- 设计技术方案 (`design.md`)
- 编写执行计划 (`implement.md`)

### Phase 2: Execute (增强)
- **传统方式**：Claude 单独实现
- **三模型方式**：Claude 编排 Codex + Gemini 并行实现
- 选择取决于任务复杂度和用户偏好

### Phase 3: Finish (不变)
- 质量检查 (`trellis-check`)
- Spec 更新 (`trellis-update-spec`)
- Git 提交
- 任务归档 (`/trellis:finish-work`)

### 自动学习闭环

无论哪种模式，失败都会触发：
```
Error → trellis-break-loop → 根因分析 → trellis-update-spec → 防止复发
```

## 示例场景

### 场景 1：全栈新功能

**需求**：添加用户评论功能

**工作流**：
1. Claude 分析：需要后端 API + 前端组件
2. 分解任务：
   - 后端：`POST /api/comments`, `GET /api/posts/:id/comments`
   - 前端：`CommentList` + `CommentForm` 组件
3. 并行实现：Codex（后端）|| Gemini（前端）
4. 交叉测试：互相验证 API 契约
5. Claude 审核：集成测试通过
6. 提交：完整功能交付

### 场景 2：API 重构（仅后端）

**需求**：重构认证中间件

**工作流**：
1. Claude 识别：仅后端任务
2. 单 worker：spawn Codex worker
3. 跳过交叉测试（无前端变更）
4. Claude 审核：单元测试通过
5. 提交

### 场景 3：UI 改版（仅前端）

**需求**：重新设计用户仪表盘

**工作流**：
1. Claude 识别：仅前端任务
2. 单 worker：spawn Gemini worker (auto-load open-design)
3. 跳过交叉测试（无后端变更）
4. Claude 审核：视觉验证 + 类型检查
5. 提交

## 故障排查

### Codex Worker 问题

1. **命令未找到**：
   ```bash
   # 检查安装
   which codex
   # 应输出: /usr/local/bin/codex 或类似路径
   
   # 未安装则安装
   npm install -g @codexlang/cli
   ```

2. **API Key 错误**：
   ```bash
   # 检查环境变量
   echo $CODEX_API_KEY
   # 应输出你的 API key
   
   # 设置 key
   export CODEX_API_KEY="sk-..."
   ```

3. **Spawn 超时**：
   - Codex 启动慢（~10-15 秒）
   - 检查网络连接（需要访问 Codex API）
   - 查看日志：`~/.trellis/channels/.../codex-backend.log`

### Gemini Worker 问题

1. **Handshake timeout**：
   - Gemini 启动非常慢（~40-45 秒）
   - 已配置 45 秒 timeout，耐心等待
   - 确保 MCP 服务器正常（Gemini 依赖 MCP）

2. **MCP 加载失败**：
   ```bash
   # 检查 Gemini 配置
   gemini --list-mcp-servers
   
   # 重新配置 MCP
   gemini config --reset-mcp
   ```

3. **窗口弹出**（Windows）：
   - 已修复：添加了 `windowsHide: true`
   - 如果仍弹出，检查 Trellis 版本是否最新

### 通用问题

1. **Channel 不存在**：
   ```bash
   # 列出所有 channels
   trellis channel list
   
   # 创建 channel
   trellis channel create my-channel
   ```

2. **Worker 无响应**：
   ```bash
   # 检查 worker 是否存活
   trellis channel messages <channel-name>
   
   # 查看最近事件
   trellis channel messages <channel-name> --last 10
   
   # 强制停止
   trellis channel kill <channel-name> <worker-name>
   ```

3. **交叉测试报告丢失**：
   - 交叉测试结果在 channel messages 中
   - 查看 `~/.trellis/channels/.../codex-test-frontend.log`
   - Claude 会自动读取并总结

## 性能优化

### 并行度

- **默认**：2 workers（Codex + Gemini）并行
- **交叉测试**：2 test workers 并行
- **总并发**：最多 4 workers 同时运行

### 启动时间

- **Codex**：~10-15 秒（handshake + 首次响应）
- **Gemini**：~40-45 秒（MCP 加载慢）
- **优化**：使用 context manifest 减少 system prompt 大小

### 监控开销

- **终端监控**：每 2 秒轮询一次，开销极小
- **Web 监控**：每 3 秒轮询，适合长时间任务

## 下一步

1. **体验完整工作流**：尝试一个全栈功能开发
2. **自定义 agent**：修改 `.trellis/agents/*.md` 调整 worker 行为
3. **优化 context**：精简 `.jsonl` manifest 提高响应速度
4. **贡献改进**：在 GitHub 提交 issue 或 PR

---

**文档版本**：v1.0.0  
**最后更新**：2026-06-24  
**维护者**：幽浮喵 ฅ'ω'ฅ
