# Design: Codex Worker 适配

## Architecture

```
Claude (main session)
  │
  ├─ trellis channel spawn test-channel
  │    --agent backend-implement
  │    --provider codex
  │    --jsonl .trellis/tasks/<task>/backend-implement.jsonl
  │
  └─> Codex Worker (JSON-RPC app-server mode)
        ├─ Reads: backend-implement.jsonl → spec files
        ├─ Reads: prd.md, design.md, implement.md
        ├─ Implements: backend code only
        └─> Reports back via Channel events.jsonl
```

## Agent Card Structure

Based on `.trellis/agents/implement.md`, create a backend-specialized variant:

| Field | Value |
|-------|-------|
| `name` | `backend-implement` |
| `provider` | `codex` |
| `description` | Backend code implementation for Codex |
| `labels` | `[trellis, implement, backend, codex]` |

## Key Differences from Generic `implement.md`

| Aspect | Generic `implement` | `backend-implement` |
|--------|---------------------|---------------------|
| Provider | `claude` | `codex` |
| Scope | 全栈 | 仅后端 (CLI/core/backend) |
| JSONL | `implement.jsonl` | `backend-implement.jsonl` |
| Spec focus | 全部 spec | `.trellis/spec/cli/backend/`, `.trellis/spec/core/backend/` |
| Forbidden | 前端文件、UI 代码 | (same + no frontend) |

## Context Injection Flow

1. Claude 策划任务 → 生成 `backend-implement.jsonl`：
   ```json
   {"file": ".trellis/spec/cli/backend/index.md", "reason": "Backend pre-dev checklist"}
   {"file": ".trellis/spec/cli/backend/error-handling.md", "reason": "Error patterns"}
   ```

2. Channel spawn 读取 JSONL → 组装 context block → 注入 `developerInstructions`

3. Codex worker 启动 → 读取 PRD/design/implement → 实现后端代码

4. Worker 完成 → emit `done` event → Claude 收集结果

## Verification Strategy

**最小验证**：
```bash
# 1. Create test channel
trellis channel create test-backend

# 2. Spawn Codex worker
trellis channel spawn test-backend \
  --agent backend-implement \
  --provider codex \
  --file .trellis/agents/backend-implement.md

# 3. Send test message
trellis channel send test-backend \
  --to backend-implement \
  "Echo back: Codex worker is alive"

# 4. Wait for response
trellis channel wait test-backend \
  --from backend-implement \
  --kind done \
  --timeout 30s

# 5. Check events
trellis channel messages test-backend
```

## Windows Compatibility Issue (Discovered)

**Problem:** `packages/cli/src/commands/channel/supervisor.ts:118` uses `spawn(adapter.provider, args, {...})` without `shell: true`, which fails on Windows when the provider is a `.cmd` wrapper (e.g., `codex.cmd` in npm global bin).

**Symptom:** `spawn codex ENOENT` error in worker log.

**Root cause:** Node.js `spawn()` on Windows does not resolve PATH without `shell: true` or explicit `.cmd` extension.

**Verified:**
```js
// Fails on Windows (ENOENT)
spawn('codex', ['--version'], {stdio: 'inherit'})

// Works on Windows
spawn('codex', ['--version'], {stdio: 'inherit', shell: true})
```

**Workaround options:**
1. **Fix supervisor** (recommended): Add `shell: true` to spawn options on Windows
   - Location: `packages/cli/src/commands/channel/supervisor.ts:118`
   - Condition: `process.platform === 'win32' ? { shell: true } : {}`
2. **Use full path**: Resolve `codex` to full path before spawn
3. **Symlink**: Create `codex` (no extension) symlink to `codex.cmd`

**Security note:** `shell: true` with user input requires careful arg escaping. Current code passes `args` array (safe) but spawns with string `adapter.provider` (needs validation).

## Rollback Plan

如果 Codex worker 启动失败：
1. 检查 `~/.trellis/channels/<project>/test-backend/<worker>.log`
2. 确认 `codex --version` 可用
3. 检查 agent 卡片 YAML frontmatter 格式
4. **Windows**: 应用上述 workaround 之一
5. 回退到 Claude provider 验证 agent 卡片逻辑正确

## Future: Gemini Worker

Gemini 需要新建 provider adapter：
- `packages/cli/src/commands/channel/adapters/gemini.ts`
- 实现 `ProviderAdapter` 接口
- 注册到 `REGISTRY`

工作量：~300-500 行 TS + 协议适配测试。暂缓，先完成 Codex。
