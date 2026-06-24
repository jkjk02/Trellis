# Trellis 三模型协作系统 🎭

> **Claude (编排) + Codex (后端) + Gemini (前端) = 高质量全栈开发**

基于 Trellis 原生 Channel 系统的三模型协作框架，通过交叉测试机制确保代码质量，实时监控展示开发进度。

## ✨ 特性

- 🎭 **三模型协作**：Claude 负责编排，Codex 实现后端，Gemini 实现前端
- 🔄 **交叉测试**：Codex 测试 Gemini 的前端代码，Gemini 测试 Codex 的后端代码，避免同模型自信偏差
- 📡 **实时监控**：终端 + Web 双界面实时监控 worker 状态和输出
- 🚀 **Trellis 原生**：完全基于 Trellis Channel 系统，无需额外基础设施
- 💾 **自动学习**：失败自动触发 break-loop → update-spec 闭环，持续改进
- 🎨 **设计系统集成**：Gemini 自动加载 open-design skill（152 个品牌级设计系统）

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
# 运行示例演示
./examples/tri-model-demo.sh

# 或手动执行
trellis channel spawn my-feature \
  --agent backend-implement --provider codex --as codex-backend \
  "实现用户 API"

trellis channel spawn my-feature \
  --agent frontend-implement --provider gemini --as gemini-frontend \
  "实现用户界面"

# 实时监控
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
│  • 任务分解（前端/后端）                                      │
│  • Worker 调度（spawn Codex + Gemini）                       │
│  • 交叉测试编排                                               │
│  • 最终审核 + 提交                                            │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
       ┌───────▼────────┐            ┌────────▼───────┐
       │  Codex Worker  │            │ Gemini Worker  │
       │   (后端实现)    │            │   (前端实现)    │
       │                │            │                │
       │ • API 端点     │            │ • UI 组件      │
       │ • 数据库操作   │            │ • 设计系统     │
       │ • 业务逻辑     │            │ • API 集成     │
       └───────┬────────┘            └────────┬───────┘
               │                              │
               └──────────┬───────────────────┘
                          │
               ┌──────────▼──────────┐
               │   交叉测试阶段      │
               │                     │
               │ Codex → 测前端      │
               │ Gemini → 测后端     │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │  Claude 最终审核    │
               │  • 集成验证         │
               │  • 用户确认         │
               │  • Git 提交         │
               └─────────────────────┘
```

## 🎯 使用场景

### 场景 1：全栈功能开发

```bash
# 任务：添加用户评论功能
# Claude 自动分解为：
#   - 后端：POST /api/comments, GET /api/posts/:id/comments (Codex)
#   - 前端：CommentList + CommentForm 组件 (Gemini)
# 并行实现 → 交叉测试 → Claude 审核 → 提交
```

### 场景 2：API 重构（仅后端）

```bash
# 任务：重构认证中间件
# Claude 识别为纯后端任务
# 单 worker：Codex
# 跳过交叉测试 → Claude 审核 → 提交
```

### 场景 3：UI 改版（仅前端）

```bash
# 任务：重新设计用户仪表盘
# Claude 识别为纯前端任务
# 单 worker：Gemini（自动加载 open-design）
# 跳过交叉测试 → Claude 审核 → 提交
```

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
  - 任务分解逻辑
  - Worker spawn 编排
  - 交叉测试协议
  - 选择式交互（AskUserQuestion）

### 4. 监控工具

- **终端监控** — `monitor_channel.py --follow`
- **Web 监控** — `.trellis/tools/monitor-web.html`

## 📊 性能指标

- **Codex 启动时间**：~10-15 秒
- **Gemini 启动时间**：~40-45 秒（MCP 加载）
- **并行度**：2 implementation workers + 2 test workers
- **监控延迟**：2-3 秒（轮询间隔）

## 🔧 技术细节

### Context Manifest 系统

每个 worker 接收专属的 `.jsonl` context manifest：

```jsonl
{"path": "src/api/users.ts", "purpose": "User API endpoints"}
{"path": ".trellis/spec/api/rest.md", "purpose": "REST conventions"}
```

### 交叉测试协议

**Codex 测试前端**：
- ✅ API 调用正确性
- ✅ 类型对齐
- ✅ 错误处理覆盖
- ⚠️ 硬编码 URL 检测

**Gemini 测试后端**：
- ✅ Endpoint 完整性
- ✅ 响应 schema 匹配
- ✅ 错误码文档
- ⚠️ CORS 配置

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📝 许可

MIT License

## 🙏 致谢

- **Trellis** — 强大的 AI 开发工作流框架
- **Codex** — 后端代码生成专家
- **Gemini** — 前端实现与设计系统专家
- **open-design** — 152 个品牌级设计系统库

---

**由幽浮喵 (ฅ'ω'ฅ) 用爱打造**
