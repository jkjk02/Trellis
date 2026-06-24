---
name: tri-model-orchestrator
description: |
  Orchestrate collaborative development with Claude (orchestrator), Codex (backend implementation), and Gemini (code review).
  Codex writes backend code, Gemini reviews for quality, Claude makes final decisions. Frontend handled separately by user.
labels: [trellis, orchestration, tri-model, codex, gemini, code-review]
---

# Tri-Model Orchestrator

Orchestrate collaborative development with Claude (orchestrator), Codex (backend), and Gemini (code reviewer).

## Workflow Overview

**New simplified workflow**:
1. **Claude** analyzes user request and creates backend task spec
2. **Codex** implements backend code (API, database, business logic)
3. **Gemini** reviews Codex's code for quality and correctness
4. **Claude** makes final decision based on Gemini's review
5. **Frontend** is handled separately by the user (not part of this workflow)

**Key changes from original tri-model**:
- ❌ No longer uses Gemini for frontend implementation
- ✅ Gemini now focused on code review only
- ✅ Codex handles all backend implementation
- ✅ Frontend development delegated to user

## Trigger

Use this skill when:
- User requests backend features or API development
- Task requires code review after implementation
- User explicitly mentions "tri-model", "codex review", or "code quality check"

Do NOT use for:
- Frontend-only tasks (user handles frontend)
- Simple tasks Codex can complete without review
- Tasks explicitly marked as "no review needed"

## Workflow

### Phase 1: Backend Implementation

1. **Analyze backend requirements** — identify API endpoints, database changes, business logic
2. **Create backend spec** — `backend-implement.jsonl` with context files
3. **Spawn Codex worker**:
   ```bash
   trellis channel spawn <task-slug> \
     --agent backend-implement \
     --provider codex \
     --as codex-backend \
     "Active task: <task-path>

   Implement backend features according to backend-implement.jsonl"
   ```
4. **Monitor progress** — wait for Codex to report completion

### Phase 2: Code Review

After Codex reports completion:

1. **Create review context** — `review-context.jsonl` listing files Codex modified
2. **Spawn Gemini reviewer**:
   ```bash
   trellis channel spawn <task-slug>-review \
     --agent code-reviewer \
     --provider gemini \
     --as gemini-review \
     "Active task: <task-path>

   Review backend code for:
   - Correctness and logic errors
   - Security vulnerabilities
   - Best practices compliance
   - Performance issues

   Report structured findings."
   ```
3. **Wait for review** — Gemini provides detailed feedback

### Phase 3: Decision and Action

After Gemini's review:

1. **Read review report** from channel logs
2. **Assess severity**:
   - **No issues / minor only**: Approve and proceed to commit
   - **Major issues**: Re-spawn Codex with fix instructions
   - **Critical issues**: Halt and notify user
3. **User confirmation** using AskUserQuestion:
   ```
   Question: "Gemini 审查完成，发现以下问题，主人决定？"
   Options:
   - "通过，提交代码 (Recommended)" — if no critical issues
   - "修复后端问题" — re-dispatch Codex with Gemini's feedback
   - "人工介入审查" — pause for manual review
   ```
4. **Execute decision** — commit, fix, or wait

## Worker Communication Protocol

### Backend Worker (Codex)

**Input**: `backend-implement.jsonl` with entries:
```jsonl
{"path": "src/api/users.ts", "purpose": "User API endpoints"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST conventions"}
{"path": "src/db/schema.sql", "purpose": "Database schema"}
```

**Expected Output**: Channel message with:
- Files modified
- Implementation summary
- Self-check results (lint, type-check, unit tests)
- API documentation
- Database migrations (if any)

### Code Reviewer (Gemini)

**Input**: `review-context.jsonl` with entries:
```jsonl
{"path": "src/api/users.ts", "purpose": "File to review", "changes": "Codex implementation"}
{"path": ".trellis/spec/api/rest.md", "purpose": "Standards reference"}
```

**Expected Output**: Structured review report with:
- Files reviewed
- Summary of findings
- Critical/Major/Minor issues (categorized)
- Specific line numbers and suggestions
- Verdict (approve/request changes/reject)

## Error Handling

### Worker Crash
- Check `.trellis/channels/<task>/<worker>.log`
- If handshake timeout: increase timeout or check CLI installation
- If code error: read crash log, fix prompt, re-spawn

### Review Finds Critical Issues
- **Critical issues**: Re-spawn Codex with specific fix instructions from Gemini
- **Major issues**: Ask user whether to fix or proceed
- **Minor only**: Proceed to commit with review notes

### Implementation Failure
- Run `trellis-break-loop` to analyze root cause
- Update specs to prevent recurrence
- May need to revise requirements or approach

## Configuration

### Channel Names
- Implementation: `<task-slug>` (e.g., `user-api-feature`)
- Code review: `<task-slug>-review`

### Worker Names
- `codex-backend` — Codex implementing backend
- `gemini-review` — Gemini reviewing code quality

### Timeout Defaults
- Codex worker: no timeout (until done/crash)
- Gemini reviewer: 10 minutes max
- Claude decision: blocking (waits for user approval)

## Integration with Trellis

- **Plan Phase**: Unchanged — create PRD/design/implement
- **Execute Phase**: This skill orchestrates Codex implementation
- **Check Phase**: Gemini review replaces or supplements `trellis-check`
- **Finish Phase**: Unchanged — commit, update specs, archive

## Example Session

```
User: "实现用户登录 API"

Claude: [analyzes] This is a backend-only task (no frontend mentioned).
        [creates] backend-implement.jsonl with API specs
        [spawns] Codex worker

Codex: "Backend complete. Modified: src/api/auth.ts, added JWT middleware, tests passing."

Claude: [spawns] Gemini reviewer with review-context.jsonl

Gemini: "Code Review Report:
         Critical: None
         Major: Password hashing uses weak algorithm (bcrypt rounds=10, should be 12+)
         Minor: Missing rate limiting on login endpoint
         Verdict: ⚠️ Approved with comments"

Claude: [asks user] "Gemini 审查发现 1 个重要问题（密码哈希强度不足），主人决定？"
User: [selects] "修复后端问题"

Claude: [re-spawns] Codex "修复：增强密码哈希强度到 bcrypt rounds=12"
Codex: "Fixed. Updated auth.ts:45, tests still passing."

Claude: [asks] "修复完成，提交代码？"
User: [confirms]

Claude: [commits] feat: user login API with secure password hashing
        [archives task]

Done! ✨
```

## Notes

- Workers run detached — channel supervisor manages lifecycle
- Claude polls channel messages (no push notifications yet)
- Codex handshake: ~10-15 seconds
- Gemini handshake: ~60-61 seconds (MCP loading), timeout set to 65s
- User approval required before commit (safety gate)
- Skill auto-loads when "tri-model", "codex", or "code review" mentioned
- Frontend development is handled separately by the user

Ready to orchestrate backend development and code review! 🎭
