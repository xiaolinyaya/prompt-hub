# Prompt Hub — 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位

Prompt Hub 是 Tipsy Admin 管理后台的核心模块，为 AI Roleplay 产品提供 Prompt 全生命周期管理能力，覆盖创建、编辑、版本控制、多环境部署、灰度发布、AB 实验和操作审计。

### 1.2 目标用户

- Prompt 工程师：编写和迭代 Prompt 内容
- 产品运营：通过 AB 实验优化 Prompt 效果
- 技术负责人：审批发布、管理环境部署

### 1.3 模块结构

```
Tipsy Admin (首页)
└── Prompt Hub (子模块)
    ├── Prompt 管理（列表 / 详情 / 编辑器）
    ├── AB 实验（列表 / 详情看板）
    └── 操作历史（审计日志）
```

---

## 2. 数据模型

### 2.1 Prompt 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，前缀 `p_` |
| `name` | string | Prompt 名称 |
| `description` | string | 简短描述 |
| `content` | string | 当前最新版本的 Prompt 正文 |
| `drafts` | Draft[] | 未发布的草稿列表（可多个并行） |
| `variables` | string[] | 从 content 中提取的 `{{变量名}}` 列表 |
| `tags` | string[] | 用户自定义标签 |
| `category` | string | 一级分类：Chat / Visual / Voice / Moderation / Translation |
| `subCategory` | string | 二级分类（依赖 category，见 2.6） |
| `sourceType` | string | 代码存储位置：`db` / `hardcode` / `function` |
| `status` | string | 当前状态：`draft` / `published` / `online` / `offline` / `archived` |
| `currentVersionId` | string | 最新版本的 ID |
| `versions` | Version[] | 所有已发布版本（按版本号降序） |
| `environments` | object | 三环境部署信息（见 2.3） |
| `createdAt` | ISO string | 创建时间 |
| `updatedAt` | ISO string | 最后更新时间 |

### 2.2 Version 对象（嵌套在 Prompt.versions[]）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，前缀 `v_` |
| `versionNumber` | number | 自增版本号（1, 2, 3...） |
| `content` | string | 该版本的 Prompt 正文 |
| `variables` | string[] | 该版本的变量列表 |
| `createdAt` | ISO string | 版本创建时间 |
| `publishedAt` | ISO string / null | 发布时间（null 表示从未发布） |
| `prodDeployedAt` | ISO string / null | 首次部署到 PROD 的时间（null 表示从未上线） |
| `author` | string | 作者 |
| `changeNote` | string | 版本变更说明 |

### 2.3 Environment 部署模型

```javascript
environments: {
  dev:  { versionId: string, deployedAt: string },
  test: { versionId: string, deployedAt: string },
  prod: {
    versionId: string,           // 全量版本
    deployedAt: string,
    canary: {                    // 灰度信息（null 表示无灰度）
      versionId: string,         // 灰度版本
      userIds: string[],         // 白名单用户 ID 列表
      deployedAt: string
    } | null
  }
}
```

**环境说明**：

| 环境 | 用途 | 部署方式 |
|------|------|---------|
| DEV | 开发环境 | 自动：创建 / 发布时自动部署最新版本 |
| TEST | 测试环境 | 手动：从版本列表中选择版本推送 |
| PROD | 生产环境 | 手动：支持全量发布或灰度（白名单）发布 |

### 2.4 Draft 对象（嵌套在 Prompt.drafts[]）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，前缀 `d_` |
| `name` | string | 草稿名称 |
| `content` | string | 草稿 Prompt 正文 |
| `description` | string | 草稿描述 |
| `category` | string | 分类（可与父 Prompt 不同） |
| `subCategory` | string | 二级分类 |
| `tags` | string[] | 标签 |
| `createdAt` | ISO string | 创建时间 |
| `updatedAt` | ISO string | 最后更新时间 |

**草稿机制说明**：一个 Prompt 可以同时存在多个草稿，每个草稿代表一个独立的编辑分支。发布草稿时，草稿内容成为新版本，该草稿从列表中移除。

### 2.5 AB Test 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，前缀 `ab_` |
| `name` | string | 实验名称 |
| `promptId` | string | 关联的 Prompt ID |
| `status` | string | `draft` / `running` / `paused` / `completed` |
| `variants` | Variant[] | 实验分组（至少 2 组） |
| `metrics` | object | 指标配置 |
| `schedule` | object | 计划开始 / 结束时间 |
| `targeting` | object | 定向条件 |
| `results` | object / null | 实验结果（仅 completed 状态有） |
| `createdAt` | ISO string | 创建时间 |
| `startedAt` | ISO string / null | 实际开始时间 |
| `endedAt` | ISO string / null | 实际结束时间 |

**Variant 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 分组标识（var_a, var_b, ...） |
| `label` | string | 分组名称 |
| `versionId` | string | 关联的 Prompt 版本 ID |
| `trafficPercent` | number | 流量百分比（所有分组之和 = 100） |

**Targeting 结构**：

| 字段 | 类型 | 可选值 |
|------|------|--------|
| `userType` | string | `all` / `new` / `existing` |
| `countryTier` | string[] | `['A']`, `['B', 'C']` 等 |
| `gender` | string[] | `['male']`, `['female']`, `['non-binary']` 等 |

### 2.6 分类体系

| 一级分类 | 二级分类 |
|----------|---------|
| Chat | System_prompt, Conversation_style, Inspiration, Character, Scene_control |
| Visual | Image, Video, Image Generation, Image Editing, Style Transfer, OCR |
| Voice | Voice_call, TTS, ASR, Voice Clone, Dialogue |
| Moderation | Text, Image, Content Review, Spam Detection, Sensitive Info, Compliance |
| Translation | General, Realtime, Document, Localization, Subtitle |

### 2.7 审计日志

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，前缀 `log_` |
| `timestamp` | ISO string | 操作时间 |
| `action` | string | 操作类型（见下表） |
| `promptId` | string | 关联 Prompt ID |
| `promptName` | string | 关联 Prompt 名称 |
| `author` | string | 操作人 |
| `details` | string | 操作描述 |

**操作类型**：

| action 值 | 含义 | 触发时机 |
|-----------|------|---------|
| `create` | 创建 | 新建 Prompt |
| `edit` | 编辑 | 发布新版本 |
| `publish` | 发布 | 发布版本 |
| `archive` | 归档 | 删除 Prompt |
| `rollback` | 回滚 | 回滚到历史版本 |
| `ab_start` | AB 开始 | 启动 AB 实验 |
| `ab_stop` | AB 结束 | 完成 AB 实验 |
| `env_push` | 环境推送 | 推送到 TEST / PROD 环境 |

---

## 3. Prompt 状态机

### 3.1 状态定义

| 状态 | 含义 | 进入条件 |
|------|------|---------|
| `draft` | 草稿 | 新建 Prompt 的初始状态 |
| `published` | 已发布 | 至少发布过一个版本，但未部署到生产 |
| `online` | 线上运行 | 已部署到 PROD 环境（全量或灰度提升全量） |
| `offline` | 已下线 | 从生产环境主动下线 |
| `archived` | 已归档 | 被删除（软删除） |

**显示状态**（仅列表页）：

| 显示状态 | 含义 | 判断逻辑 |
|---------|------|---------|
| `ab_testing` | AB 实验中 | 该 Prompt 存在 status=running 的 AB 实验时，列表页覆盖显示此状态 |

### 3.2 状态流转图

```
                    ┌──────────────────────────┐
                    │                          │
                    ▼                          │
  ┌────────┐   发布   ┌───────────┐   推送PROD  ┌────────┐
  │ draft  │ ──────→ │ published │ ─────────→ │ online │
  └────────┘         └───────────┘            └────────┘
                          ▲                     │  ▲
                          │                     │  │
                          │    发布（状态不变）     │  │
                          │  ◄──────────────────┘  │
                          │                        │
                          │         下线            │
                          │      ┌─────────┐       │
                          │      │ offline │       │
                          │      └─────────┘       │
                          │         │              │
                          │         │  重新推送PROD  │
                          │         └──────────────┘
                          │
                    任何状态可归档
                    ┌──────────┐
                    │ archived │
                    └──────────┘
```

### 3.3 状态流转规则

| 当前状态 | 操作 | 目标状态 | 说明 |
|---------|------|---------|------|
| `draft` | 发布 | `published` | 首次发布 |
| `draft` | 推送 PROD | `online` | 跳过 published 直接上线 |
| `published` | 发布新版本 | `published` | 状态不变 |
| `published` | 推送 PROD（全量） | `online` | 上线 |
| `published` | 灰度提升全量 | `online` | 灰度验证后上线 |
| `online` | 发布新版本 | `online` | 状态保持 online 不变 |
| `online` | 下线 | `offline` | 清除 PROD 部署 |
| `offline` | 推送 PROD | `online` | 重新上线 |
| 任何状态 | 删除 | `archived` | 软删除 |

---

## 4. 版本与草稿生命周期

### 4.1 版本管理

**版本创建时机**：
- 新建 Prompt → 自动创建 v1（初始版本）
- 发布操作 → 创建新版本（版本号递增）
- 回滚操作 → 以目标版本内容创建新版本（版本号递增，内容复制）

**版本标签系统**（编辑器左侧版本列表）：

每个版本可同时显示多个标签，按以下规则判断：

| 标签 | 样式 | 判断条件 |
|------|------|---------|
| 线上运行 | 绿色 | `version.id === prompt.environments.prod.versionId` |
| 白名单上线 | 橙色 | `version.id === prompt.environments.prod.canary.versionId` |
| 曾上线 | 灰色 | `version.prodDeployedAt` 有值，且该版本既非当前 PROD 全量版本也非 canary 版本 |
| 已发布 | 蓝色 | `version.id === prompt.currentVersionId` 且该版本非 PROD 全量版本 |
| AB-X组 | 紫色 | 该版本被某个 running 状态的 AB 实验引用，X 为组别字母（A/B/C...） |
| AB-X组(已结束) | 灰色 | 该版本被某个 completed 状态的 AB 实验引用 |

**标签可叠加**：例如一个版本可以同时显示「曾上线」+「AB-A组(已结束)」。

**标签互斥规则**：
- 「线上运行」「白名单上线」「曾上线」三者互斥（同一版本只会显示其中一个）
- 「线上运行」覆盖「已发布」（如果一个版本是线上版本，不再显示已发布标签）

### 4.2 草稿机制

**设计理念**：当 Prompt 已发布后，直接编辑不会覆盖当前线上内容，而是创建草稿。草稿允许多个并行存在，代表不同的编辑方向。

**草稿操作**：

| 操作 | 说明 |
|------|------|
| 自动创建草稿 | 编辑已发布 Prompt 的当前内容时，保存会自动转为草稿 |
| 手动创建草稿 | 点击「+」按钮手动新建空白草稿 |
| 从历史版本创建草稿 | 在版本历史中选择某版本，基于其内容创建草稿 |
| 编辑草稿 | 在左侧列表点击草稿进入编辑 |
| 删除草稿 | 确认后删除草稿 |
| 发布草稿 | 草稿内容成为新版本，草稿从列表中移除 |

**草稿状态下的编辑器**：
- 显示草稿名称横幅
- 提供「删除此草稿」和「退出草稿编辑」按钮
- 保存操作更新草稿而非 Prompt 本体

---

## 5. 各状态下的可用操作矩阵

### 5.1 Prompt 级操作

| 操作 | draft | published | online | offline | 说明 |
|------|:-----:|:---------:|:------:|:-------:|------|
| 编辑内容 | ✅ 直接保存 | ✅ 自动创建草稿 | ✅ 自动创建草稿 | ✅ 自动创建草稿 | draft 状态直接修改，其余创建草稿 |
| 发布新版本 | ✅ → published | ✅ → published | ✅ → online（不变） | ✅ → offline（不变） | online 状态发布不会改变状态 |
| 创建草稿 | ✅ | ✅ | ✅ | ✅ | 任何状态均可创建草稿 |
| 删除草稿 | ✅ | ✅ | ✅ | ✅ | 任何状态均可删除草稿 |
| 推送到 TEST | ✅ | ✅ | ✅ | ✅ | 选择某个版本推送到测试环境 |
| 推送到 PROD（全量） | ✅ → online | ✅ → online | ✅ → online | ✅ → online | 直接全量上线 |
| 推送到 PROD（灰度） | ✅ | ✅ | ✅ | ✅ | 灰度不改变 Prompt 状态 |
| 灰度提升全量 | — | — | — | — | 仅当 PROD 存在 canary 时可用 |
| 回退灰度 | — | — | — | — | 仅当 PROD 存在 canary 时可用 |
| 下线 | ❌ | ❌ | ✅ → offline | ❌ | 仅 online 状态可下线 |
| 回滚到历史版本 | ✅ | ✅ | ✅ | ✅ | 以旧版本内容创建新版本 |
| 版本对比 | ✅ | ✅ | ✅ | ✅ | 历史版本与当前版本的 diff |
| 从版本创建草稿 | ✅ | ✅ | ✅ | ✅ | 基于历史版本内容创建草稿 |
| API 模拟调用 | ✅ | ✅ | ✅ | ✅ | 任何状态均可测试 |
| 删除 Prompt | ✅ | ✅ | ✅ | ✅ | 需确认弹窗 |

### 5.2 灰度（Canary）操作条件

| 操作 | 前置条件 | 效果 |
|------|---------|------|
| 发起灰度 | PROD 环境有全量版本或无部署 | 在 PROD.canary 写入灰度版本 + 白名单用户 |
| 全量推送 | PROD.canary 存在 | canary.versionId → PROD.versionId，清除 canary，状态变 online |
| 回退灰度 | PROD.canary 存在 | 清除 canary，保持原 PROD.versionId 不变 |

### 5.3 环境部署规则

| 操作 | DEV | TEST | PROD |
|------|-----|------|------|
| 自动部署时机 | 创建 Prompt、发布新版本 | — | — |
| 手动部署入口 | — | 版本操作菜单 | 版本操作菜单 / 编辑器状态卡 |
| 支持灰度 | ❌ | ❌ | ✅ |
| 部署对 status 的影响 | 无 | 无 | 全量部署 → online |

---

## 6. AB 实验系统

### 6.1 AB 实验状态机

```
  ┌───────┐   启动   ┌─────────┐   完成   ┌───────────┐
  │ draft │ ──────→ │ running │ ──────→ │ completed │
  └───────┘         └─────────┘         └───────────┘
                       │   ▲
                  暂停  │   │ 恢复
                       ▼   │
                    ┌────────┐
                    │ paused │
                    └────────┘
```

### 6.2 AB 实验状态下的操作

| 操作 | draft | running | paused | completed |
|------|:-----:|:-------:|:------:|:---------:|
| 编辑配置 | ✅ | ✅ | ✅ | ❌ |
| 启动 | ✅ | — | — | — |
| 暂停 | — | ✅ | — | — |
| 恢复 | — | — | ✅ | — |
| 完成 | — | ✅ | — | — |
| 查看看板 | — | ✅ | — | ✅ |
| 查看详情 | ✅ | ✅ | ✅ | ✅ |

### 6.3 AB 实验与 Prompt 的联动

| 联动点 | 说明 |
|--------|------|
| 列表状态覆盖 | Prompt 有 running 实验时，列表页状态显示为「AB实验中」（紫色），覆盖原状态 |
| 版本标签 | running 实验的版本显示「AB-X组」紫色标签；completed 实验的版本显示「AB-X组(已结束)」灰色标签 |
| 胜出标识 | completed 实验的胜出分组版本，hover 时 tooltip 显示「(胜出)」 |
| 筛选联动 | Prompt 列表的状态筛选支持「AB实验中」选项 |

### 6.4 AB 实验创建配置

| 配置项 | 说明 |
|--------|------|
| 实验名称 | 自由文本 |
| 关联 Prompt | 从已有 Prompt 中选择 |
| 分组配置 | 至少 2 组，每组配置：名称、关联版本、流量百分比（总和 100%） |
| 定时计划 | 可选的开始时间和结束时间 |
| 用户定向 | 用户类型（全部/新用户/老用户）、国家层级（A/B/C）、性别 |

### 6.5 AB 实验数据看板

**看板仅在 running 和 completed 状态显示。**

| 模块 | 内容 |
|------|------|
| 筛选栏 | 用户分群（新/老）、国家层级（A/B/C）、性别筛选 |
| 概览指标卡 | 进组人数、ARPU、ARPPU、付费率 — 每组数据 + 相对 A 组的 diff% |
| 窗口期表格 | ROI / 留存率 / 付费率的 D1/D3/D7/D14/D30 窗口期数据，含组间差异行 |
| 趋势图 | 可切换指标（进组人数/ROI/留存率/付费率/ARPU/ARPPU），窗口期指标可选窗口维度 |

---

## 7. 页面功能规格

### 7.1 首页（`/`）

Tipsy Admin 模块选择页，展示 6 个管理模块卡片。目前仅 Prompt Hub 可进入，其余模块（User Center / Products / Content / Analytics / Settings）为占位状态。

首次访问时自动初始化 Mock 数据。

### 7.2 Prompt 列表页（`/prompt-hub`）

**布局**：工具栏 + 数据表格

**工具栏**：
- 搜索框：按名称、描述、标签模糊搜索
- 分类筛选下拉：一级分类
- 二级分类筛选下拉：依赖一级分类联动
- 状态筛选下拉：草稿 / 已发布 / 线上运行 / 已下线 / AB实验中
- 「CREATE NEW」按钮

**表格列**：

| 列 | 内容 |
|----|------|
| Name | Prompt 名称 + 描述摘要 + 草稿数量提示 |
| Category | 一级分类 |
| Sub-Category | 二级分类 |
| Status | 状态徽标（如有 running AB 实验则显示「AB实验中」） |
| Variables | 变量数量 |
| Updated | 最后更新的相对时间 |
| Actions | VIEW / EDIT / TEST / DELETE 操作链接 |

**操作说明**：
- VIEW → 跳转详情页
- EDIT → 跳转编辑器
- TEST → 跳转 API 测试面板
- DELETE → 弹出确认对话框，确认后删除并记录审计日志

### 7.3 Prompt 详情页（`/prompt-hub/prompts/:id`）

**布局**：头部操作栏 + 双栏内容

**头部操作栏**：
- 返回列表
- 「EDIT」按钮
- 「API TEST」按钮

**草稿提示横幅**：若存在未发布草稿，顶部显示黄色提示条，含草稿数量和「前往编辑」链接。

**左栏（主内容区）**：
- 元信息卡片：分类、二级分类、创建时间、更新时间、标签列表
- Prompt 内容卡片：渲染 Prompt 正文（高亮 `{{变量}}`）

**右栏（侧边栏）**：
- 状态卡片：
  - 当前状态徽标
  - 环境部署状态（DEV / TEST / PROD 各自的版本号和部署时间）
  - 灰度状态（若 PROD 有 canary：显示灰度版本 + 白名单人数）
  - 代码存储位置（DB / Hardcode / Function）
- 变量列表：所有 `{{变量}}` 渲染为标签
- 版本历史列表：
  - 每个版本显示：版本号、变更说明、日期、作者
  - 当前版本高亮标记

### 7.4 Prompt 编辑器（`/prompt-hub/prompts/new` 和 `/prompt-hub/prompts/:id/edit`）

#### 7.4.1 新建模式

**布局**：编辑表单 + 右侧边栏

**编辑表单**：
- 名称输入
- 描述输入
- 分类选择（一级 + 二级联动）
- 标签输入（TagInput 组件，回车添加）
- Prompt 内容文本域（多行）

**右侧边栏**：
- 变量卡片：实时提取并显示 `{{变量}}`
- 预览卡片：填写变量值，实时预览渲染结果

**操作按钮**：
- 「SAVE」保存为草稿状态
- 「PUBLISH」直接发布

#### 7.4.2 编辑模式

**布局**：三栏 — 左面板（版本/草稿列表） + 中间（编辑器/只读预览） + 右侧边栏

**左面板 — 版本/草稿列表**：

```
┌─────────────────────────┐
│ vN（当前版本号）    [标签]  │  ← 点击显示当前已发布内容
├─────────────────────────┤
│ 未发布草稿           [+]  │  ← 标题 + 新建草稿按钮
│  ├ 草稿名称 A             │
│  └ 草稿名称 B             │
├─────────────────────────┤
│ 已发布版本                │  ← 标题
│  ├ v3  [线上运行][AB-A组]  │
│  ├ v2  [AB-B组(已结束)]   │
│  └ v1                    │
└─────────────────────────┘
```

**中间区域 — 编辑当前版本/草稿时**：
- 完整编辑表单（同新建模式）
- 草稿横幅（编辑草稿时显示草稿名称 + 删除/退出按钮）

**中间区域 — 查看历史版本时（只读）**：
- 版本头部：版本号 + 标签 + 元信息（作者、时间、变更说明）
- Prompt 内容只读展示
- 操作按钮栏：
  - 「回滚到此版本」— 以该版本内容创建新版本
  - 「基于此版本创建草稿」
  - 「与当前版本对比」— 打开侧对侧 diff 视图
  - 「推送到 TEST」
  - 「推送到 PROD」— 弹出灰度/全量选择弹窗

**右侧边栏**（编辑/查看当前版本时）：
- 状态卡片：
  - 状态徽标 + 草稿数量提示
  - 「下线」按钮（仅 online 状态显示，需确认弹窗）
  - 环境部署状态行（DEV / TEST / PROD + 版本号）
  - 灰度操作区（当 PROD 有 canary 时）：
    - 显示「vN 灰度中 (X人)」
    - 「全量推送」按钮
    - 「回退灰度」按钮
  - 代码存储位置
- 变量卡片
- 预览卡片

**灰度发布弹窗**（推送到 PROD 时弹出）：

```
┌──────────────────────────────────┐
│  推送到生产环境                     │
│                                  │
│  版本: vN — 变更说明               │
│                                  │
│  发布方式:                         │
│  ┌────────────┐ ┌────────────┐   │
│  │ ● 灰度发布  │ │ ○ 全量发布  │   │
│  └────────────┘ └────────────┘   │
│                                  │
│  白名单用户ID:                     │
│  ┌──────────────────────────────┐│
│  │ uid_001, uid_002             ││
│  └──────────────────────────────┘│
│  每行一个或逗号分隔                 │
│                                  │
│          [取消]    [确认推送]       │
└──────────────────────────────────┘
```

### 7.5 API 测试面板（`/prompt-hub/prompts/:id/test`）

**布局**：双栏 — 左侧输入 + 右侧响应

**左侧输入区**：
- Prompt 内容预览（变量已替换后的最终文本）
- 模型选择：GPT-4 / Claude / General
- 变量输入区：每个变量一个文本框
- 「模拟调用」按钮

**右侧响应区**：
- 流式文本输出（模拟逐字符渲染）
- 复制响应按钮
- 统计栏：模型名称、延迟时间（ms）、估算 Token 数

### 7.6 AB 实验列表页（`/prompt-hub/ab-tests`）

**布局**：工具栏 + 数据表格

**表格列**：

| 列 | 内容 |
|----|------|
| Name | 实验名称 |
| Prompt | 关联的 Prompt 名称 |
| Status | 状态徽标 |
| Groups | 分组数量 |
| Traffic Split | 流量分配可视化条 |
| Created | 创建时间 |
| Actions | VIEW + 状态相关操作 |

**状态相关操作**：

| 当前状态 | 可用操作 |
|---------|---------|
| draft | VIEW, START |
| running | VIEW, PAUSE, COMPLETE |
| paused | VIEW, RESUME |
| completed | VIEW |

**创建实验弹窗**：填写名称 → 选择 Prompt → 配置分组（版本 + 流量比例） → 设置定时计划 → 设置用户定向

### 7.7 AB 实验详情页（`/prompt-hub/ab-tests/:id`）

**布局**：头部信息 + 分组展示 + 数据看板

**头部信息栏**：
- 实验名称 + 状态徽标
- 操作按钮（状态相关：编辑 / 启动 / 暂停 / 恢复 / 完成）
- 元信息行：分组数、创建时间、开始时间、结束时间
- 定时计划信息
- 定向条件：用户类型 / 国家层级 / 性别

**流量分配条**：彩色横条图显示各组流量比例

**分组卡片**：网格排列，每张卡片显示分组名称、关联版本号、Prompt 内容预览

**数据看板**（仅 running / completed 可见）：
- 筛选栏：用户分群 + 国家层级 + 性别
- 概览指标卡：进组人数 / ARPU / ARPPU / 付费率
- 窗口期表格：D1 / D3 / D7 / D14 / D30 维度，含 diff 行
- 趋势折线图：可切换指标和窗口维度

**编辑弹窗**：同创建弹窗结构，预填现有配置

### 7.8 操作历史页（`/prompt-hub/history`）

**布局**：工具栏 + 数据表格

**工具栏**：
- 搜索框：按 Prompt 名称、操作详情、操作人搜索
- 操作类型筛选下拉：创建 / 编辑 / 发布 / 归档 / 回滚 / AB开始 / AB结束 / 环境推送

**表格列**：

| 列 | 内容 |
|----|------|
| Time | 操作时间（格式化） |
| Action | 操作类型标签（带颜色） |
| Prompt | Prompt 名称（可点击跳转详情） |
| Details | 操作描述文本 |
| Author | 操作人 |

**操作类型颜色**：

| 类型 | 颜色 |
|------|------|
| 创建 | 绿色 |
| 编辑 | 蓝色 |
| 发布 | 紫色 |
| 归档 | 灰色 |
| 回滚 | 黄色 |
| AB开始 / AB结束 | 青色 |
| 环境推送 | 粉色 |

---

## 8. 全操作清单与审计日志触发

| # | 操作 | 触发页面 | 记录审计日志 | 日志 action |
|---|------|---------|:----------:|-----------|
| 1 | 新建 Prompt | 编辑器（新建模式） | ✅ | `create` |
| 2 | 保存编辑（draft 状态） | 编辑器 | ❌ | — |
| 3 | 创建草稿 | 编辑器 | ❌ | — |
| 4 | 编辑草稿 | 编辑器 | ❌ | — |
| 5 | 删除草稿 | 编辑器 | ❌ | — |
| 6 | 发布新版本 | 编辑器 | ✅ | `edit` + `publish` |
| 7 | 回滚到历史版本 | 编辑器（版本浏览） | ✅ | `rollback` |
| 8 | 推送到 TEST | 编辑器（版本浏览） | ✅ | `env_push` |
| 9 | 推送到 PROD（全量） | 编辑器（版本浏览 / 灰度弹窗） | ✅ | `env_push` |
| 10 | 推送到 PROD（灰度） | 灰度弹窗 | ✅ | `env_push` |
| 11 | 灰度提升全量 | 编辑器（状态卡） | ✅ | `env_push` |
| 12 | 回退灰度 | 编辑器（状态卡） | ❌ | — |
| 13 | 下线 | 编辑器（状态卡） | ❌ | — |
| 14 | 删除 Prompt | 列表页 / 编辑器 | ✅ | `archive` |
| 15 | 创建 AB 实验 | AB 列表页 | ❌ | — |
| 16 | 启动 AB 实验 | AB 列表页 / 详情页 | ✅ | `ab_start` |
| 17 | 暂停 AB 实验 | AB 列表页 / 详情页 | ❌ | — |
| 18 | 恢复 AB 实验 | AB 列表页 / 详情页 | ❌ | — |
| 19 | 完成 AB 实验 | AB 列表页 / 详情页 | ✅ | `ab_stop` |
| 20 | API 模拟调用 | API 测试面板 | ❌ | — |

---

## 9. 代码存储位置（Source Type）

标识 Prompt 在代码库中的存储方式，在详情页和编辑器侧边栏显示。

| 值 | 显示 | 含义 |
|----|------|------|
| `db` | DB | 存储在数据库中，通过管理后台可动态修改 |
| `hardcode` | Hardcode | 硬编码在代码中，修改需要发版 |
| `function` | Function | 由代码函数动态生成，参数可配置 |

---

## 10. Mock 数据场景（当前 Demo）

### 10.1 Prompt 场景覆盖

| Prompt | 状态 | 版本数 | 草稿数 | 存储 | 特殊场景 |
|--------|------|:------:|:-----:|------|---------|
| 角色扮演 System Prompt | online | 3 | 0 | DB | 三环境全部署；有已完成 AB 实验 |
| 对话语气控制 | online | 2 | 2 | Hardcode | 有 2 个并行草稿；有 draft AB 实验 |
| 场景开场白 | published | 2 | 0 | Function | PROD 未部署；有 running AB 实验 |
| 角色记忆摘要 | draft | 1 | 0 | DB | 仅部署 DEV；从未发布 |
| 角色语音合成指令 | offline | 2 | 0 | Hardcode | PROD 未部署 |
| Roleplay 内容安全审核 | online | 4 | 0 | DB | 4 个版本迭代；三环境全部署 |

### 10.2 AB 实验场景覆盖

| 实验 | 关联 Prompt | 状态 | 分组数 | 特殊场景 |
|------|------------|------|:------:|---------|
| 场景开场白叙事风格测试 | 场景开场白 | running | 2 (60/40) | 定向：新用户 + A 层级 |
| 角色扮演沉浸感测试 | 角色扮演 System Prompt | completed | 2 (50/50) | 有胜出结果 |
| 语气控制精细度三组测试 | 对话语气控制 | draft | 3 (34/33/33) | 三组实验 + 定向：老用户 + BC层级 + 女性 |
