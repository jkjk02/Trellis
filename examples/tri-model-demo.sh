#!/bin/bash
# Trellis 三模型协作 - 示例工作流演示
# 演示如何使用 Claude + Codex + Gemini 协作开发一个用户资料编辑功能

set -e

echo "🎭 Trellis 三模型协作系统 - 示例演示"
echo "================================================"
echo ""
echo "本脚本演示如何使用三模型系统开发一个完整的用户资料编辑功能。"
echo ""
echo "前置条件检查..."

# 检查工具是否安装
command -v trellis >/dev/null 2>&1 || { echo "❌ Trellis 未安装"; exit 1; }
command -v codex >/dev/null 2>&1 || { echo "❌ Codex CLI 未安装"; exit 1; }
command -v gemini >/dev/null 2>&1 || { echo "❌ Gemini CLI 未安装"; exit 1; }

echo "✅ 所有工具已安装"
echo ""

# 检查 API keys
if [ -z "$CODEX_API_KEY" ]; then
    echo "⚠️  CODEX_API_KEY 未设置，某些功能可能无法使用"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY 未设置，某些功能可能无法使用"
fi

echo ""
echo "================================================"
echo "第 1 步：创建任务"
echo "================================================"
echo ""

TASK_NAME="user-profile-edit-demo"
TASK_PATH=".trellis/tasks/$TASK_NAME"

# 创建任务目录
mkdir -p "$TASK_PATH"

# 创建 PRD
cat > "$TASK_PATH/prd.md" <<'EOF'
# 用户资料编辑功能

## Goal
实现用户资料编辑功能，包括后端 API 和前端 UI。

## Requirements

### 后端 (Codex)
- API endpoint: `PUT /api/users/:id`
- 验证规则：
  - Email 格式验证
  - 密码强度验证（可选字段）
  - 昵称长度限制（2-50 字符）
- 数据库更新：users 表
- 响应格式：`{ success: true, user: {...} }`
- 错误处理：400 (验证失败), 404 (用户不存在), 500 (服务器错误)

### 前端 (Gemini)
- 组件：`ProfileEditForm.tsx`
- 表单字段：email, nickname, password (可选)
- 客户端验证：Zod schema
- API 集成：调用 PUT /api/users/:id
- 设计系统：shadcn/ui
- 错误提示：Toast 通知

## Acceptance Criteria
- [ ] 后端 API 通过单元测试
- [ ] 前端组件类型安全
- [ ] 交叉测试通过（Codex 测前端 + Gemini 测后端）
- [ ] 集成测试通过
EOF

echo "✅ PRD 已创建: $TASK_PATH/prd.md"
echo ""

# 创建 backend context manifest
cat > "$TASK_PATH/backend-implement.jsonl" <<'EOF'
{"path": "src/api/users.ts", "purpose": "用户 API 端点定义"}
{"path": "src/db/schema.sql", "purpose": "数据库 schema"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST API 规范"}
EOF

echo "✅ Backend context manifest 已创建"

# 创建 frontend context manifest
cat > "$TASK_PATH/frontend-implement.jsonl" <<'EOF'
{"path": "src/components/UserList.tsx", "purpose": "参考组件"}
{"path": ".agents/skills/open-design/SKILL.md", "purpose": "设计系统指南"}
{"path": ".trellis/spec/frontend/react.md", "purpose": "React 规范"}
EOF

echo "✅ Frontend context manifest 已创建"
echo ""

echo "================================================"
echo "第 2 步：并行启动 Workers"
echo "================================================"
echo ""

echo "📦 启动后端 worker (Codex)..."
trellis channel spawn "$TASK_NAME" \
  --agent backend-implement \
  --provider codex \
  --as codex-backend \
  --jsonl "$TASK_PATH/backend-implement.jsonl" \
  "Active task: $TASK_PATH

实现用户资料编辑 API:
- Endpoint: PUT /api/users/:id
- 验证: email, nickname, password (optional)
- 数据库: 更新 users 表
- 错误处理: 400/404/500

参考 backend-implement.jsonl 中的文件。" &

CODEX_PID=$!
echo "✅ Codex worker 已启动 (PID: $CODEX_PID)"
echo ""

echo "📦 启动前端 worker (Gemini)..."
trellis channel spawn "$TASK_NAME" \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-frontend \
  --jsonl "$TASK_PATH/frontend-implement.jsonl" \
  "Active task: $TASK_PATH

实现用户资料编辑表单:
- 组件: ProfileEditForm.tsx
- 字段: email, nickname, password (optional)
- 验证: Zod schema
- 设计: shadcn/ui (使用 open-design skill)
- API: PUT /api/users/:id

参考 frontend-implement.jsonl 中的文件。" &

GEMINI_PID=$!
echo "✅ Gemini worker 已启动 (PID: $GEMINI_PID)"
echo ""

echo "================================================"
echo "第 3 步：监控进度"
echo "================================================"
echo ""

echo "📡 启动实时监控..."
echo "提示：打开另一个终端运行以下命令查看实时日志："
echo ""
echo "  python .trellis/scripts/monitor_channel.py $TASK_NAME --follow"
echo ""
echo "或者打开 Web 监控界面："
echo ""
echo "  open .trellis/tools/monitor-web.html"
echo ""

echo "等待 workers 完成（这可能需要几分钟）..."
echo "按 Ctrl+C 可随时中断"
echo ""

# 轮询检查 workers 状态
while true; do
    MESSAGES=$(trellis channel messages "$TASK_NAME" 2>/dev/null || echo "")

    CODEX_DONE=$(echo "$MESSAGES" | grep -c "by=codex-backend.*\[done\]" || true)
    GEMINI_DONE=$(echo "$MESSAGES" | grep -c "by=gemini-frontend.*\[done\]" || true)

    if [ "$CODEX_DONE" -gt 0 ] && [ "$GEMINI_DONE" -gt 0 ]; then
        echo ""
        echo "✅ 两个 workers 都已完成！"
        break
    fi

    sleep 5
done

echo ""
echo "================================================"
echo "第 4 步：交叉测试"
echo "================================================"
echo ""

echo "🔄 启动交叉测试..."
echo ""

echo "📝 Codex 测试 Gemini 的前端代码..."
trellis channel spawn "${TASK_NAME}-cross" \
  --agent backend-implement \
  --provider codex \
  --as codex-test-frontend \
  "Active task: $TASK_PATH

审查前端代码: src/components/ProfileEditForm.tsx

检查项:
1. API 调用是否匹配后端 endpoint (PUT /api/users/:id)
2. 请求/响应类型是否对齐
3. 错误处理是否覆盖 400/404/500
4. 是否硬编码 backend URL

输出格式化的测试报告。" &

CODEX_TEST_PID=$!

echo "📝 Gemini 测试 Codex 的后端代码..."
trellis channel spawn "${TASK_NAME}-cross" \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-test-backend \
  "Active task: $TASK_PATH

审查后端 API: src/api/users.ts

检查项:
1. Endpoint 是否提供前端需要的接口
2. 响应 schema 是否包含前端使用的字段
3. 错误码是否有文档说明
4. CORS 配置（如需要）

输出格式化的测试报告。" &

GEMINI_TEST_PID=$!

echo ""
echo "等待交叉测试完成..."

wait $CODEX_TEST_PID
wait $GEMINI_TEST_PID

echo ""
echo "✅ 交叉测试完成！"
echo ""

echo "================================================"
echo "第 5 步：查看结果"
echo "================================================"
echo ""

echo "📊 Implementation 结果:"
trellis channel messages "$TASK_NAME"

echo ""
echo "📊 Cross-test 结果:"
trellis channel messages "${TASK_NAME}-cross"

echo ""
echo "================================================"
echo "演示完成！"
echo "================================================"
echo ""
echo "下一步操作："
echo ""
echo "1. 查看生成的代码文件"
echo "2. 运行单元测试验证功能"
echo "3. 如果交叉测试发现问题，重新 spawn 对应 worker 修复"
echo "4. 通过后，运行 git commit 提交代码"
echo ""
echo "清理演示数据："
echo "  trellis channel kill $TASK_NAME"
echo "  trellis channel kill ${TASK_NAME}-cross"
echo "  rm -rf $TASK_PATH"
echo ""
echo "感谢使用 Trellis 三模型协作系统！ ฅ'ω'ฅ"
