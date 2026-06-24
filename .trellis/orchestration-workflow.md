# Trellis 三模型协作工作流 - 完整流程图

> Claude (编排) + Codex (后端) + Gemini (前端) 融合工作流
> 基于 Trellis v0.6.4 Channel 系统 · 保留 Trellis 全部核心思想

---

## 零、Trellis 核心思想清单 (不可删改)

| # | 思想 | 机制 | 融合方式 |
|---|------|------|----------|
| 1 | **先规划后编码** | Plan → Execute → Finish 三阶段门禁 | Phase 1 完全保留，新流程只增强 Phase 2 |
| 2 | **知识注入而非记忆** | JSONL 清单 + Spec 系统注入上下文 | Codex/Gemini worker 通过 `--jsonl` 注入 spec |
| 3 | **自动学习** | break-loop 分析 bug → update-spec 写入规范 | 交叉测试失败时自动触发 break-loop |
| 4 | **跨会话记忆** | `trellis mem` 搜索历史对话 | 规划阶段调 mem 检查"上次怎么解的" |
| 5 | **会话持久化** | journal 记录 + session-insight 回溯 | 每次协作完成后自动记录 journal |
| 6 | **Spec 是活文档** | 每次任务后 update-spec 捕获新知识 | Claude 终审发现的模式写回 spec |
| 7 | **上下文精准投递** | implement.jsonl / check.jsonl 清单 | 每个 worker 只拿到自己需要的 spec |
| 8 | **贝叶斯调试** | break-loop 中的概率推理框架 | 交叉测试 bug 用贝叶斯定位根因 |
| 9 | **Session 续接** | trellis-continue 恢复工作点 | 中断后自动定位到正确 phase/step |
| 10 | **安全更新** | template-hash 防覆盖用户修改 | 新增模块不破坏现有配置 |

---

## 一、完整生命周期总览

```mermaid
flowchart TB
    subgraph PHASE1["Phase 1: Plan (保留原始 Trellis 流程)"]
        p0["1.0 创建任务<br/>task.py create<br/>🔹 选择式确认"]
        p1["1.1 需求探索<br/>trellis-brainstorm<br/>🔹 选择式交互引导"]
        mem_check["📚 trellis mem search<br/>检查历史是否做过类似工作"]
        p2["1.2 研究<br/>trellis-research"]
        p3["1.3 配置上下文<br/>implement.jsonl → Codex 用<br/>check.jsonl → Gemini 用<br/>+ open-design spec 引用"]
        p4["1.4 激活任务<br/>task.py start<br/>🔹 选择式审核确认"]

        p0 --> p1 --> mem_check --> p2 --> p3 --> p4
    end

    subgraph PHASE2["Phase 2: Execute (三模型增强)"]
        direction TB
        decompose["2.0 Claude 任务分解<br/>拆分前端/后端<br/>生成精准提示词<br/>🔹 选择式确认拆分"]

        subgraph IMPL["2.1 并行实现"]
            codex_impl["Codex Worker<br/>Channel spawn --provider codex<br/>--jsonl implement.jsonl<br/>后端代码实现"]
            gemini_impl["Gemini Worker<br/>Channel spawn --provider gemini<br/>--jsonl implement.jsonl<br/>前端界面 (open-design)"]
        end

        barrier1["Channel wait --all<br/>实现完成同步点"]

        subgraph CROSS_TEST["2.2 交叉测试 (并行)"]
            codex_test_fe["Codex 测试前端<br/>审查 Gemini 的代码"]
            gemini_test_be["Gemini 测试后端<br/>审查 Codex 的代码"]
        end

        barrier2["Channel wait --all<br/>测试完成同步点"]
        claude_review["2.3 Claude 终极审核<br/>前端+后端统一审查<br/>🔹 选择式呈现结果"]

        decompose --> IMPL --> barrier1
        barrier1 --> CROSS_TEST --> barrier2
        barrier2 --> claude_review
    end

    subgraph PHASE3["Phase 3: Finish (保留 + 增强)"]
        direction TB

        subgraph LEARN["🧠 自动学习环 (Trellis 精髓)"]
            break_loop["3.2 trellis-break-loop<br/>深度 bug 分析<br/>5 维根因分类<br/>贝叶斯概率推理"]
            update_spec["3.3 trellis-update-spec<br/>将发现写回 spec<br/>7 段式知识捕获"]
            break_loop --> update_spec
        end

        commit["3.4 提交变更<br/>🔹 选择式确认提交方式"]
        finish["3.5 trellis-finish-work<br/>归档任务 + 记录 journal<br/>跨会话记忆持久化"]

        LEARN --> commit --> finish
    end

    subgraph MONITOR["📊 实时监控 (全程运行)"]
        web["Web Dashboard (localhost)"]
        tui["终端 TUI 面板"]
    end

    PHASE1 --> PHASE2 --> PHASE3
    PHASE2 -.->|"events.jsonl"| MONITOR

    %% 回滚路径
    claude_review -->|"审核未通过"| decompose
    CROSS_TEST -->|"测试失败<br/>触发 break-loop"| break_loop

    style PHASE1 fill:#e3f2fd,stroke:#1565c0
    style PHASE2 fill:#fff8e1,stroke:#f9a825
    style PHASE3 fill:#e8f5e9,stroke:#2e7d32
    style LEARN fill:#fce4ec,stroke:#c62828
    style MONITOR fill:#f3e5f5,stroke:#7b1fa2
    style IMPL fill:#fff3e0,stroke:#ef6c00
    style CROSS_TEST fill:#e8eaf6,stroke:#283593
```

---

## 二、自动学习闭环 (Trellis 最核心的价值)

```mermaid
flowchart TB
    subgraph LEARN_LOOP["自动学习闭环 — 每次任务都让系统变聪明"]
        direction TB

        subgraph TRIGGER["触发源"]
            t1["交叉测试发现 bug"]
            t2["Claude 终审发现问题"]
            t3["实现过程遇到棘手问题"]
            t4["发现新的设计模式"]
        end

        subgraph ANALYZE["break-loop 深度分析"]
            a1["1. 根因分类<br/>A.缺失规范 B.跨层契约<br/>C.变更传播失败 D.测试覆盖<br/>E.隐式假设"]
            a2["2. 为什么修复失败<br/>表面修复/范围不完整<br/>工具局限/心智模型偏差"]
            a3["3. 贝叶斯推理<br/>建立先验 → 观察证据<br/>→ 更新置信度<br/>→ 寻找区分性证据"]
            a4["4. 系统性扩展<br/>类似问题在哪?<br/>设计缺陷? 流程缺陷?"]
        end

        subgraph CAPTURE["update-spec 知识捕获"]
            c1["更新 .trellis/spec/ 规范<br/>7 段式: 范围/签名/契约<br/>/验证矩阵/案例/测试/正误对比"]
            c2["更新 guides/ 思考指南<br/>跨层/跨平台/代码复用"]
            c3["记录到 journal<br/>session-insight 可回溯"]
        end

        subgraph BENEFIT["未来收益"]
            b1["下次 implement.jsonl<br/>自动包含新 spec"]
            b2["trellis-before-dev<br/>注入更新后的规范"]
            b3["trellis mem search<br/>找到历史决策"]
            b4["break-loop 的先验<br/>从历史 bug 中学习"]
        end

        TRIGGER --> ANALYZE --> CAPTURE --> BENEFIT
        BENEFIT -.->|"正反馈循环"| TRIGGER
    end

    style LEARN_LOOP fill:#fff8e1,stroke:#f57f17
    style TRIGGER fill:#ffebee,stroke:#c62828
    style ANALYZE fill:#e3f2fd,stroke:#1565c0
    style CAPTURE fill:#e8f5e9,stroke:#2e7d32
    style BENEFIT fill:#f3e5f5,stroke:#7b1fa2
```

---

## 三、跨会话记忆 & 会话续接

```mermaid
sequenceDiagram
    participant S1 as 会话 1 (今天)
    participant MEM as trellis mem<br/>(本地 JSONL 索引)
    participant SPEC as .trellis/spec/<br/>(活文档)
    participant JOURNAL as journal<br/>(会话日志)
    participant S2 as 会话 2 (明天)

    Note over S1: 开始新任务
    S1->>MEM: trellis mem search "登录模块"
    MEM-->>S1: 找到: 上次在会话 abc123 讨论过<br/>决定用 JWT 而非 session

    Note over S1: 完成任务
    S1->>SPEC: update-spec: JWT 认证规范<br/>签名/契约/验证矩阵
    S1->>JOURNAL: add_session: 实现了登录模块<br/>commit hash, 摘要

    Note over S1: 遇到 bug
    S1->>SPEC: break-loop → update-spec:<br/>token 刷新必须用 atomic 操作

    Note over S2: 新会话开始
    S2->>S2: trellis-continue<br/>检测 status=in_progress
    S2->>MEM: trellis mem search "token 刷新"
    MEM-->>S2: 找到: 会话 1 发现了 atomic 问题
    S2->>SPEC: 读取最新 spec<br/>包含 atomic 操作规范
    Note over S2: 不会重蹈覆辙
```

---

## 四、三模型协作中的 Trellis 机制映射

```mermaid
flowchart TB
    subgraph ORCHESTRATION["Claude 编排 — Trellis 机制在每个环节的作用"]

        subgraph PLAN_STAGE["规划阶段"]
            brainstorm["trellis-brainstorm<br/>选择式需求引导"]
            mem_prior["trellis mem<br/>查历史: 做过类似的吗?"]
            jsonl_curate["配置 JSONL 清单<br/>Codex 的 / Gemini 的 分开配"]
        end

        subgraph DISPATCH["分发阶段"]
            spawn_cx["Channel spawn Codex<br/>--jsonl backend-implement.jsonl<br/>注入后端 spec"]
            spawn_gx["Channel spawn Gemini<br/>--jsonl frontend-implement.jsonl<br/>注入前端 spec + open-design"]
            context_inject["trellis-before-dev<br/>每个 worker 按 spec 索引<br/>加载对应包的规范"]
        end

        subgraph TEST_STAGE["测试阶段"]
            cross_test["交叉测试<br/>Codex 不测自己的代码<br/>Gemini 不测自己的代码"]
            test_fail{"测试失败?"}
            break_loop_trigger["自动触发 break-loop<br/>5 维分析 + 贝叶斯推理<br/>找到真正根因"]
        end

        subgraph REVIEW_STAGE["审核阶段"]
            claude_final["Claude 终极审核<br/>前后端一致性检查<br/>跨层契约验证"]
            spec_update["update-spec<br/>发现的模式/契约/陷阱<br/>写回 spec 活文档"]
        end

        subgraph WRAP["收尾阶段"]
            commit_select["选择式确认提交<br/>前后端分别提交 / 统一提交"]
            archive["task.py archive<br/>任务归档"]
            journal_record["add_session.py<br/>记录会话到 journal"]
            mem_persist["知识持久化<br/>下次 trellis mem 可搜到"]
        end

        PLAN_STAGE --> DISPATCH --> TEST_STAGE
        test_fail -->|是| break_loop_trigger
        break_loop_trigger --> spec_update
        test_fail -->|否| REVIEW_STAGE
        TEST_STAGE --> REVIEW_STAGE
        REVIEW_STAGE --> WRAP
        spec_update -.->|"下次任务受益"| PLAN_STAGE
    end

    style PLAN_STAGE fill:#e3f2fd,stroke:#1565c0
    style DISPATCH fill:#fff3e0,stroke:#ef6c00
    style TEST_STAGE fill:#fce4ec,stroke:#c62828
    style REVIEW_STAGE fill:#e8eaf6,stroke:#283593
    style WRAP fill:#e8f5e9,stroke:#2e7d32
```

---

## 五、Channel 事件流 & 监控数据流

```mermaid
sequenceDiagram
    participant U as 用户 (选择式交互)
    participant C as Claude (编排)
    participant CH as Channel (events.jsonl)
    participant CX as Codex Worker
    participant GX as Gemini Worker
    participant M as 监控 (Web + TUI)
    participant SP as Spec 系统

    U->>C: 提出需求 [选择式确认]
    C->>C: trellis mem search 检查历史
    C->>C: trellis-brainstorm [选择式引导]
    C->>C: 任务分解 + 配置 JSONL [选择式确认]

    par 并行启动 Workers (注入各自的 spec)
        C->>CH: spawn Codex --jsonl backend.jsonl
        CH->>CX: 启动 + 注入后端 spec
        C->>CH: spawn Gemini --jsonl frontend.jsonl
        CH->>GX: 启动 + 注入前端 spec + open-design
    end

    loop 实时事件流 → 监控
        CX-->>CH: progress (text_delta, tool_name)
        GX-->>CH: progress (text_delta, tool_name)
        CH-->>M: WebSocket / tail 实时推送
        M-->>U: Worker 状态 + 输出流
    end

    CX->>CH: done
    GX->>CH: done
    CH->>C: wait barrier 释放

    C->>C: 收集结果 [选择式审阅]

    par 并行交叉测试
        C->>CH: spawn Codex → 测 Gemini 的前端
        C->>CH: spawn Gemini → 测 Codex 的后端
    end

    CX->>CH: done (前端测试报告)
    GX->>CH: done (后端测试报告)

    alt 测试发现 bug
        C->>C: 触发 break-loop 深度分析
        C->>SP: update-spec 写回知识
        C->>CH: 重新 spawn 修复
    else 测试通过
        C->>C: Claude 终极审核
    end

    C->>SP: update-spec (终审发现)
    C->>U: 实现报告 [选择式确认提交]
    C->>C: archive + journal 记录
```

---

## 六、选择式交互 × Trellis 决策点

```mermaid
flowchart LR
    subgraph FULL_FLOW["全流程选择式交互节点"]
        subgraph P1["Phase 1"]
            d1["创建任务?<br/>创建/跳过/先讨论"]
            d2["需求确认<br/>确认/补充/拆分"]
            d3["历史检查结果<br/>复用/调整/忽略"]
            d4["JSONL 清单<br/>自动/手动/调整"]
            d5["激活确认<br/>开始/返回修改"]
        end

        subgraph P2["Phase 2"]
            d6["任务拆分<br/>同意/调整/全给一个"]
            d7["Worker 错误<br/>重试/换模型/Claude 做"]
            d8["实现审阅<br/>测试/返工/全返工"]
            d9["测试结果<br/>通过/修复重测/放弃"]
            d10["终审结果<br/>提交/修改/拆分提交"]
        end

        subgraph P3["Phase 3"]
            d11["Spec 更新<br/>更新/新建/跳过"]
            d12["提交方式<br/>统一/分别/仅本地"]
            d13["归档确认<br/>归档/保留/清理其他"]
        end

        d1 --> d2 --> d3 --> d4 --> d5
        d5 --> d6 --> d7 --> d8 --> d9 --> d10
        d10 --> d11 --> d12 --> d13
    end

    style P1 fill:#e3f2fd,stroke:#1565c0
    style P2 fill:#fff8e1,stroke:#f9a825
    style P3 fill:#e8f5e9,stroke:#2e7d32
```

---

## 七、监控面板架构

```mermaid
flowchart TB
    subgraph SOURCE["数据源 (Trellis Channel 原生)"]
        ej["events.jsonl<br/>22 种事件类型"]
        wl["worker.log<br/>stdout/stderr"]
        wp["worker.pid<br/>进程状态"]
        task["task.json<br/>任务元数据"]
        spec["spec 变更<br/>学习记录"]
    end

    subgraph SERVER["监控后端"]
        tail["File Watcher<br/>chokidar / fs.watch"]
        parse["JSONL Parser<br/>解析事件类型"]
        ws["WebSocket Server"]
        http["HTTP + REST API"]
    end

    subgraph WEB["Web Dashboard"]
        w1["Worker 卡片<br/>状态/耗时/provider"]
        w2["实时输出流<br/>text_delta 拼接"]
        w3["事件时间线<br/>spawn → progress → done"]
        w4["学习日志<br/>break-loop / spec 更新"]
        w5["任务进度<br/>task.json 状态"]
    end

    subgraph TUI_PANEL["终端 TUI"]
        t1["Worker 列表 + 状态"]
        t2["日志滚动"]
        t3["进度指示"]
    end

    SOURCE --> tail --> parse
    parse --> ws --> WEB
    parse --> http --> WEB
    parse --> TUI_PANEL

    style SOURCE fill:#fff3e0,stroke:#e65100
    style SERVER fill:#e3f2fd,stroke:#0d47a1
    style WEB fill:#e8f5e9,stroke:#1b5e20
    style TUI_PANEL fill:#fce4ec,stroke:#880e4f
```

---

## 八、错误处理 + 自动学习回滚流程

```mermaid
flowchart TB
    impl["Worker 实现中"] --> status{"Worker 状态?"}
    status -->|done| collect["收集结果"]
    status -->|error| diagnose["诊断错误"]
    status -->|timeout| kill["Channel kill"]

    diagnose --> break_loop_1["break-loop 分析<br/>根因分类 (A-E)<br/>贝叶斯推理"]
    kill --> break_loop_1

    break_loop_1 --> retry{"可重试?<br/>🔹 选择式"}
    retry -->|"重试 (调整提示词)"| respawn["重新 spawn<br/>spec 已更新"]
    retry -->|"换模型"| swap_worker["Codex↔Gemini 互换"]
    retry -->|"Claude 直接做"| fallback["Claude 单模型实现"]

    respawn --> impl
    swap_worker --> impl
    fallback --> collect

    collect --> cross_test["交叉测试"] --> test_result{"通过?"}
    test_result -->|通过| review["Claude 终审"]
    test_result -->|失败| break_loop_2["break-loop 分析<br/>为什么交叉测试失败?<br/>自信偏差? 规范缺失?"]

    break_loop_2 --> update_spec["update-spec<br/>写回发现到 spec"]
    update_spec --> fix{"修复策略<br/>🔹 选择式"}
    fix -->|"原 Worker 修"| impl
    fix -->|"交换 Worker 修"| swap_fix["Codex 修前端<br/>Gemini 修后端"]
    fix -->|"Claude 修"| claude_fix["Claude 直接修复"]

    swap_fix --> cross_test
    claude_fix --> review

    review --> final{"终审通过?"}
    final -->|通过| phase3["Phase 3: Finish<br/>spec update + commit + journal"]
    final -->|未通过| impl

    style break_loop_1 fill:#ffebee,stroke:#c62828
    style break_loop_2 fill:#ffebee,stroke:#c62828
    style update_spec fill:#e8f5e9,stroke:#2e7d32
    style status fill:#fff9c4,stroke:#f57f17
    style test_result fill:#fff9c4,stroke:#f57f17
    style final fill:#fff9c4,stroke:#f57f17
```

---

## 九、Trellis 思想 × 新流程 对照表

| Trellis 原始能力 | 原始触发时机 | 融合后增强触发 |
|-----------------|-------------|---------------|
| **trellis-brainstorm** | 用户提出新需求 | + Claude 分解前后端需求时也用 |
| **trellis mem** | 用户问"上次怎么做的" | + 规划阶段自动检查历史 |
| **implement.jsonl** | 给单个 implement 代理 | + 拆分为 backend.jsonl / frontend.jsonl 分别投递 |
| **trellis-before-dev** | 实现前加载 spec | + 每个 Worker spawn 前注入对应包的 spec |
| **trellis-check** | 单代理检查 | + 交叉测试 (异模型检查) |
| **break-loop** | 手动触发 / 调试后 | + 交叉测试失败时自动触发 |
| **update-spec** | 任务完成时 | + 交叉测试发现问题时即时写回 + 终审后写回 |
| **session-insight** | 用户问"之前讨论过吗" | + 新任务开始前自动检查 |
| **trellis-continue** | 会话恢复 | + 三模型协作中断后恢复到正确步骤 |
| **finish-work** | 手动收尾 | + 自动: archive + journal + spec 更新 |
| **Channel** | 多代理协作 | = 核心调度层 (spawn/wait/event) |
| **Forum channel** | 议题讨论 | + 跨模型审查意见持久化 |
| **Worker OOM guard** | 防止资源耗尽 | = 保持不变 (idle 5m, max 6) |
| **template-hash** | 安全更新 | = 新模块不覆盖用户自定义 |
