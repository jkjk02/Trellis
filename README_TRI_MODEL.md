# Trellis 三模型协作系统 🎭

> **Claude (编排) + Codex (后端实现) + Gemini (代码审查) = 高质量后端开发**

基于 Trellis 原生 Channel 系统的三模型协作框架，Codex 负责后端实现，Gemini 提供代码审查，Claude 编排决策。

## ✨ 特性

- 🎭 **三模型协作**：Claude 编排 + Codex 后端实现 + Gemini 代码审查
- 🔍 **质量保证**：Gemini 审查 Codex 代码，发现潜在问题
- 📡 **实时监控**：终端 + Web 双界面实时监控 worker 状态
- 🚀 **Trellis 原生**：基于 Channel 系统，无需额外基础设施
- 💾 **自动学习**：失败自动触发 break-loop → update-spec 闭环
- 🎯 **专注后端**：前端开发由用户自行安排

## 🚀 快速开始

### 安装

```bash
# 1. 安装 Trellis（如果还没有）
npm install -g @mindfoldhq/trellis

# 2. 安装 Codex CLI
npm install -g @codexlang/cli

# 3. 安装 Gemini CLI
npm install -g @google/gemini-cli

# 4. 克隆本仓库
git clone https://github.com/jkjk02/Trellis.git
cd Trellis

# 5. 配置 API Keys
export CODEX_API_KEY="your-codex-key"
export GEMINI_API_KEY="your-gemini-key"
```

### 第一个三模型任务

```bash
# 运行示例演示（需要更新为新工作流）
# ./examples/tri-model-demo.sh

# 手动执行
# 1. Codex 实现后端
trellis channel spawn my-feature \
  --agent backend-implement --provider codex --as codex-backend \
  "实现用户 API"

# 2. Gemini 审查代码
trellis channel spawn my-feature-review \
  --agent code-reviewer --provider gemini --as gemini-review \
  "审查 Codex 实现的后端代码"

# 3. 实时监控
python .trellis/scripts/monitor_channel.py my-feature --follow
```

## 📖 文档

- **[完整使用指南](docs/TRI_MODEL_GUIDE.md)** — 详细的使用说明、概念解释、故障排查
- **[示例工作流](examples/tri-model-demo.sh)** — 可运行的演示脚本
- **[架构设计](docs/ARCHITECTURE.md)** — 系统架构和技术细节

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                       Claude (编排层)                        │
│  • 任务分析（后端需求）                                      │
│  • Worker 调度（spawn Codex）                                │
│  • 审查编排（spawn Gemini reviewer）                         │
│  • 最终决策 + 提交                                            │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
       ┌───────▼────────┐            ┌────────▼───────┐
       │  Codex Worker  │            │ Gemini Worker  │
       │   (后端实现)    │            │   (代码审查)    │
       │                │            │                │
       │ • API 端点     │            │ • 正确性检查   │
       │ • 数据库操作   │            │ • 安全审查     │
       │ • 业务逻辑     │            │ • 最佳实践     │
       │ • 单元测试     │            │ • 性能分析     │
       └───────┬────────┘            └────────┬───────┘
               │                              │
               └──────────┬───────────────────┘
                          │
               ┌──────────▼──────────┐
               │  Claude 最终决策    │
               │  • 读取审查报告     │
               │  • 评估问题严重性   │
               │  • 用户确认         │
               │  • Git 提交         │
               └─────────────────────┘

注：前端开发由用户自行安排，不在此工作流中
```

## 🎯 使用场景

### 场景 1：后端 API 开发

```bash
# 任务：添加用户登录 API
# Claude 创建后端 spec → Codex 实现 → Gemini 审查 → Claude 决策
# 流程：Implementation → Review → Fix (if needed) → Commit
```

### 场景 2：数据库重构

```bash
# 任务：优化用户表结构
# Codex 实现迁移脚本 → Gemini 审查安全性和性能 → 提交
```

### 场景 3：业务逻辑开发

```bash
# 任务：实现订单处理流程
# Codex 编写业务逻辑 → Gemini 检查边界条件和错误处理 → 提交
```

**注**：前端开发不在此工作流中，由用户使用其他工具完成。

## 🛠️ 核心组件

### 1. Agent 卡片

- **backend-implement** (`.trellis/agents/backend-implement.md`)
  - Provider: Codex
  - 职责：API、数据库、业务逻辑
  
- **frontend-implement** (`.trellis/agents/frontend-implement.md`)
  - Provider: Gemini
  - 职责：UI 组件、设计系统、浏览器端代码

### 2. Channel Adapters

- **codex.ts** — Codex CLI JSON-RPC adapter
- **gemini.ts** — Gemini CLI stream-JSON adapter
- **Windows 优化** — `windowsHide: true` 防止 CMD 窗口弹出

### 3. 编排引擎

- **tri-model-orchestrator** (`.agents/skills/tri-model-orchestrator/SKILL.md`)
  - 任务分析逻辑
  - Worker spawn 编排
  - 审查协议
  - 选择式交互（AskUserQuestion）

### 4. 监控工具

- **终端监控** — `monitor_channel.py --follow`
- **Web 监控** — `.trellis/tools/monitor-web.html`

## 📊 性能指标

- **Codex 启动时间**：~10-15 秒
- **Gemini 启动时间**：~60-61 秒（MCP 加载慢，已优化 timeout 到 70s）
- **并行度**：1 implementation worker + 1 review worker
- **监控延迟**：2-3 秒（轮询间隔）

## 🔧 技术细节

### Context Manifest 系统

每个 worker 接收专属的 `.jsonl` context manifest：

```jsonl
{"path": "src/api/users.ts", "purpose": "User API endpoints"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST conventions"}
```

### 代码审查协议

**Gemini 审查后端代码**：
- ✅ 正确性和逻辑错误
- ✅ 安全漏洞（SQL 注入、XSS 等）
- ✅ 最佳实践和编码规范
- ✅ 性能问题（N+1 查询、算法效率）
- ✅ 可维护性和可读性

**报告格式**：
- 分类：Critical / Major / Minor 问题
- 具体行号和代码片段
- 修复建议
- 审查结论（approve / request changes / reject）

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📝 许可

MIT License

## 🙏 致谢

- **Trellis** — 强大的 AI 开发工作流框架
- **Codex** — 后端代码实现专家
- **Gemini** — 代码审查和质量保证专家
- **Claude** — 智能编排和决策引擎

---

**由幽浮喵 (ฅ'ω'ฅ) 用爱打造**
