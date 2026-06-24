# Tri-Model Orchestrator

Orchestrate collaborative development with Claude (orchestrator), Codex (backend), and Gemini (frontend).

## Trigger

Use this skill when:
- User requests a feature requiring both frontend and backend work
- Task explicitly mentions "tri-model", "三模型", "codex+gemini", or "cross-test"
- Complex full-stack feature development

Do NOT use for:
- Backend-only tasks (use Codex worker directly)
- Frontend-only tasks (use Gemini worker directly)
- Simple tasks completable by Claude alone

## Workflow

### Phase 1: Task Decomposition

1. **Analyze user request** — identify frontend vs backend scope
2. **Ask user confirmation** — present decomposition using AskUserQuestion:
   ```
   Question: "浮浮酱将任务分解为以下部分，主人确认？"
   Options:
   - "确认分解 (Recommended)" — proceed with decomposition
   - "调整前端范围" — refine frontend scope
   - "调整后端范围" — refine backend scope
   - "改为单模型" — fallback to single-model approach
   ```
3. **Create task artifacts**:
   - `backend-implement.jsonl` — Codex context manifest
   - `frontend-implement.jsonl` — Gemini context manifest
   - `cross-test-plan.md` — test matrix

### Phase 2: Parallel Implementation

Spawn workers in parallel:

```bash
# Backend worker (Codex)
trellis channel spawn <task-slug> \
  --agent backend-implement \
  --provider codex \
  --as codex-backend \
  "Active task: <task-path>

Implement backend features according to backend-implement.jsonl"

# Frontend worker (Gemini)
trellis channel spawn <task-slug> \
  --agent frontend-implement \
  --provider gemini \
  --as gemini-frontend \
  "Active task: <task-path>

Implement frontend features according to frontend-implement.jsonl"
```

Monitor via:
```bash
trellis channel messages <task-slug>
```

### Phase 3: Cross-Testing

After both workers report completion:

1. **Codex tests Gemini's frontend**:
   ```bash
   trellis channel spawn <task-slug>-cross-test \
     --agent backend-implement \
     --provider codex \
     --as codex-test-frontend \
     "Active task: <task-path>

Review and test frontend code in <frontend-files>:
- Component structure correctness
- API integration points
- Type safety
- Error handling

Report findings in structured format."
   ```

2. **Gemini tests Codex's backend**:
   ```bash
   trellis channel spawn <task-slug>-cross-test \
     --agent frontend-implement \
     --provider gemini \
     --as gemini-test-backend \
     "Active task: <task-path>

Review backend API contracts in <backend-files>:
- Endpoint compliance with spec
- Response format
- Error codes
- Documentation completeness

Report findings in structured format."
   ```

3. **Collect results** — wait for both test workers to complete

### Phase 4: Claude Final Review

1. **Read cross-test reports** from channel logs
2. **Verify integration points**:
   - API contract alignment
   - Type consistency
   - Error propagation
3. **Run integration tests** if available
4. **Ask user for approval** using AskUserQuestion:
   ```
   Question: "交叉测试完成，浮浮酱发现以下问题（如果有），主人决定？"
   Options:
   - "通过，提交代码 (Recommended)" — commit changes
   - "修复后端问题" — re-dispatch Codex
   - "修复前端问题" — re-dispatch Gemini
   - "人工介入" — pause for manual review
   ```

### Phase 5: Delivery

1. **Commit changes** (if approved)
2. **Update specs** — run `trellis-update-spec` for learnings
3. **Archive task** — `/trellis:finish-work`

## Worker Communication Protocol

### Backend Worker (Codex)

**Input**: `backend-implement.jsonl` with entries:
```jsonl
{"path": "src/api/users.ts", "purpose": "User API endpoints"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST conventions"}
```

**Expected Output**: Channel message with:
- Files modified
- Implementation summary
- Self-check results (lint, type-check, unit tests)
- Integration setup instructions

### Frontend Worker (Gemini)

**Input**: `frontend-implement.jsonl` with entries:
```jsonl
{"path": "src/components/UserList.tsx", "purpose": "User list component"}
{"path": ".agents/skills/open-design/SKILL.md", "purpose": "Design system guide"}
```

**Expected Output**: Channel message with:
- Components created
- Design system used
- API integration points
- Browser dev server setup

## Cross-Test Protocol

### Codex Testing Frontend

**Task**: Verify Gemini's frontend integrates correctly with backend contracts

**Checks**:
- API calls match endpoint signatures
- Request/response types align
- Error handling covers backend error codes
- No hardcoded backend URLs (use env vars)

**Output Format**:
```markdown
## Frontend Cross-Test Report (Codex)

### Files Reviewed
- src/components/UserList.tsx
- src/api/client.ts

### Findings
1. ✅ API calls use correct endpoints
2. ⚠️  Missing error handling for 429 rate limit
3. ❌ Hardcoded backend URL in client.ts:12

### Recommendations
- Add rate limit handling
- Move backend URL to .env

### Verdict
- Blocking issues: 1
- Warnings: 1
```

### Gemini Testing Backend

**Task**: Verify Codex's backend provides contracts frontend expects

**Checks**:
- Endpoints match frontend API calls
- Response schemas include all fields frontend uses
- Error codes documented
- CORS configured if needed

**Output Format**:
```markdown
## Backend Cross-Test Report (Gemini)

### Files Reviewed
- src/api/users.ts
- src/middleware/error.ts

### Findings
1. ✅ All endpoints frontend needs are present
2. ✅ Response types match frontend expectations
3. ⚠️  Error code 404 not documented in API spec
4. ❌ CORS not configured for frontend origin

### Recommendations
- Document 404 behavior
- Add CORS middleware

### Verdict
- Blocking issues: 1
- Warnings: 1
```

## Error Handling

### Worker Crash
- Check `.trellis/channels/<task>/<worker>.log`
- If handshake timeout: increase timeout or check CLI installation
- If code error: read crash log, fix prompt, re-spawn

### Cross-Test Failure
- **Blocking issues found**: re-dispatch relevant worker with fix instructions
- **Warnings only**: ask user whether to proceed or fix
- **Test disagreement**: Claude reviews manually, makes final call

### Integration Failure
- Run `trellis-break-loop` to analyze root cause
- Update specs to prevent recurrence
- May need to re-decompose task differently

## Configuration

### Channel Names
- Implementation: `<task-slug>` (e.g., `user-mgmt-feature`)
- Cross-test: `<task-slug>-cross-test`

### Worker Names
- `codex-backend` — Codex implementing backend
- `gemini-frontend` — Gemini implementing frontend  
- `codex-test-frontend` — Codex testing Gemini's output
- `gemini-test-backend` — Gemini testing Codex's output

### Timeout Defaults
- Implementation workers: no timeout (until done/crash)
- Cross-test workers: 10 minutes max
- Claude review: blocking (waits for user decision)

## Integration with Trellis

- **Plan Phase**: Unchanged — still create PRD/design/implement
- **Execute Phase**: This skill orchestrates worker dispatch
- **Check Phase**: Cross-test results feed into `trellis-check`
- **Finish Phase**: Unchanged — commit, update specs, archive

## Example Session

```
User: "Add user profile editing feature"

Claude: [analyzes] This needs backend (PUT /users/:id) and frontend (ProfileEdit component).
        [asks] "浮浮酱将任务分解为..."
        [user confirms]

Claude: [spawns] codex-backend + gemini-frontend in parallel
        [monitors] trellis channel messages user-profile-edit

[10 minutes later]

Codex: "Backend complete. Modified: src/api/users.ts, tests passing."
Gemini: "Frontend complete. Component: ProfileEdit.tsx, using shadcn/ui."

Claude: [spawns cross-test] codex-test-frontend + gemini-test-backend

Codex: "Frontend review: ⚠️  Missing validation for email format"
Gemini: "Backend review: ✅ All good, response types match"

Claude: [asks user] "交叉测试发现 1 个警告，主人决定？"
User: [selects] "修复前端问题"

Claude: [re-spawns] gemini-frontend "Fix: add email validation"
Gemini: "Fixed. Added Zod schema validation."

Claude: [final review] Integration verified, tests pass.
        [asks] "通过，提交代码？"
User: [confirms]

Claude: [commits] feat: user profile editing with validation
        [archives task]

Done! ✨
```

## Notes

- Workers run detached — channel supervisor manages lifecycle
- Claude polls channel messages (no push notifications yet)
- Cross-test can run in parallel (both test workers at once)
- User approval required before commit (safety gate)
- Skill auto-loads when "tri-model" appears in task name or user mention

Ready to orchestrate! 🎭
