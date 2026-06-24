# open-design Skill 移植到共享层

## Goal

将 Claude 侧的 open-design skill 移植到 `.agents/skills/` 共享目录，使 Codex 和 Gemini CLI 都能读取该 skill 的设计规则。

## Background

- open-design 已作为 Claude skill 安装在 `.claude/skills/open-design/`
- `.agents/skills/` 是 Codex 和 Gemini CLI 的共享 skill 目录 (agentskills.io 标准)
- Trellis 使用 SKILL.md (YAML frontmatter) + references/ 目录结构

## Requirements

- 将 open-design skill 复制到 `.agents/skills/open-design/`
- 保持 SKILL.md 格式与现有共享 skill 一致
- 保留所有 references 文件
- 确保 `.claude/skills/open-design/` 原文件不受影响

## Acceptance Criteria

- [ ] `.agents/skills/open-design/SKILL.md` 存在且格式正确
- [ ] references/ 目录完整复制
- [ ] Gemini CLI 可识别并加载该 skill
- [ ] 原 Claude 侧 skill 不受影响

## Complexity

轻量任务，PRD-only。
