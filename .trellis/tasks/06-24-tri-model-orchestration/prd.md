# Trellis 三模型协作融合 (Claude+Codex+Gemini)

## Goal

将 Codex CLI (后端实现) 和 Gemini CLI (前端实现/open-design) 与 Claude (编排) 深度融合，形成三模型协作开发工作流。基于 Trellis 现有 Channel 系统扩展，保留全部 Trellis 核心思想。

## Requirements

- Claude 作为编排者：任务分解、提示词生成、分发、交叉测试编排、终极审核
- Codex 负责后端代码实现，通过 Channel Worker 调度
- Gemini 负责前端界面实现，使用 open-design skill，通过 Channel Worker 调度
- 交叉测试：Codex 测前端、Gemini 测后端，避免同模型自信偏差
- 实时监控：Web Dashboard + TUI 面板，白盒展示 Worker 状态和输出
- 全流程使用选择式交互 (AskUserQuestion)，用户无需手动输入
- **Trellis 主导**: Plan/Finish 阶段完全保留，仅增强 Execute 阶段
- **自动学习不变**: break-loop → update-spec 闭环全程运行
- **最小改动**: 不修改 Trellis 核心代码，通过新增 skill/模块扩展

## 子任务

| # | 子任务 | 类型 | 依赖 |
|---|--------|------|------|
| 1 | open-design Skill 移植到 `.agents/skills/` | 轻量 | 无 |
| 2 | Codex Worker 适配 | 中等 | 无 |
| 3 | Gemini Worker 适配 + open-design | 中等 | #1 |
| 4 | 编排引擎 Skill | 复杂 | #2, #3 |
| 5 | Web 实时监控面板 | 中等 | #4 |
| 6 | TUI 实时监控面板 | 中等 | #4 |

## Acceptance Criteria

- [ ] Claude 可通过 Channel spawn 调起 Codex 和 Gemini Worker
- [ ] Codex Worker 接收后端 spec 并实现代码
- [ ] Gemini Worker 接收前端 spec + open-design 规则并实现 UI
- [ ] 交叉测试可并行运行，结果汇报到 Claude
- [ ] 监控面板实时展示 Worker 状态和输出
- [ ] 全流程决策点使用选择式交互
- [ ] Trellis 原有工作流不受影响
- [ ] 自动学习闭环在交叉测试失败时自动触发
