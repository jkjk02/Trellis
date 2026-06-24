# Codex Worker 适配 (后端实现)

## Goal

创建专用的 Codex backend-implement agent 卡片，通过 `trellis channel spawn --provider codex` 调度 Codex CLI 实现后端代码。

## Background

- Channel 系统已支持 `codex` provider（有现成 adapter）
- Codex CLI 0.142.0 已安装并可用
- 现有 `implement.md` agent 卡片是 `provider: claude`，需要专门的后端版本

## Requirements

1. 创建 `.trellis/agents/backend-implement.md` agent 卡片
   - `provider: codex`
   - 职责：后端代码实现（不含前端）
   - 读取 `backend-implement.jsonl` 上下文清单
   - 遵循后端 spec (`.trellis/spec/cli/backend/`, `.trellis/spec/core/backend/`)

2. 验证 spawn 可以成功调起 Codex worker
3. 确保 Codex 接收到正确的上下文（JSONL + PRD + spec）

## Technical Constraints (研究发现)

- Channel 只支持 `claude` 和 `codex` 两个 provider（Gemini 需新建 adapter）
- `--provider codex` 会覆盖 agent 卡片的 `provider:` 字段
- Codex 使用 JSON-RPC 协议，系统提示词通过 `thread/start` 的 `developerInstructions` 传递
- Codex 设置 `multi_agent=false` 防止递归 spawn

## Acceptance Criteria

- [ ] `.trellis/agents/backend-implement.md` 存在且格式正确
- [ ] `provider: codex` 且职责明确为后端实现
- [ ] 可通过 `trellis channel spawn test-channel --agent backend-implement --provider codex` 启动 worker
- [ ] Worker 接收到 `--jsonl backend-implement.jsonl` 注入的 spec 上下文

## Complexity

中等任务，PRD + design.md。
