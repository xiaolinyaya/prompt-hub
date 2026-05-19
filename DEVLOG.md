# PromptHub - 开发日志

## 当前状态（每次更新覆盖）
- **当前版本**: V2.0
- **核心定位**: Tipsy Admin 管理后台，Prompt Hub 为其中一个模块
- **已完成**: V1.0 全部功能 + V1.1 Tipsy Admin 表格风格 + V2.0 模块化架构重构
- **进行中**: 无
- **待定/开放问题**: 其他模块（User Center, Products, Content, Analytics, Settings）为占位卡片，待后续填充

---
## 版本日志（追加，不删改）

### V1.0 - 2026-05-12
**设计决策**:
- 纯前端原型，localStorage 持久化，无后端
- React + Vite + JavaScript（不用 TypeScript）
- 亮色主题 + 深色侧边栏，Vercel/Linear 风格
- React Context + useReducer 管理状态
- recharts 做数据看板图表
- 11 个核心功能：编辑器、版本管理、发布、预览、模板库、环境管理、回滚、AB测试、API模拟、数据看板、审计日志

**任务进度**:
- [x] 项目脚手架搭建（Vite + 依赖安装）
- [x] 基础框架（样式 + Layout + 路由 + 状态）
- [x] Mock 数据层（6个Prompt + 10模板 + 3个AB测试 + 30天分析 + 20条审计日志）
- [x] Prompt 管理核心功能（列表/编辑器/变量识别/预览/发布）
- [x] 环境管理 + 回滚（dev/test/prod 环境推送 + 版本回滚）
- [x] 模板库（浏览/分类/从模板新建Prompt）
- [x] AB 测试（列表/创建/详情/流量分配/状态管理）
- [x] API 模拟调用面板（模型选择/变量填充/模拟流式输出）
- [x] 数据看板（指标卡片/调用趋势图/AB对比图）
- [x] 审计日志（操作历史/筛选/搜索）
- [x] 收尾打磨（ToastProvider/模板跳转修复/编译验证）

### V1.1 - 2026-05-12
**设计决策**:
- UI 改为 Tipsy Admin 风格：深色顶部导航栏 + 表格布局列表页
- 去掉左侧深色侧边栏，改为顶部 Navbar
- 所有列表页从卡片网格改为表格 + 搜索工具栏
- 按钮大写字母 + pill 圆角，操作改为彩色文字链接

**任务进度**:
- [x] Navbar 替代 Sidebar
- [x] 首页模块卡片网格
- [x] PromptList/TemplateGallery/ABTestList/AuditLog 改为表格布局
- [x] inline style 提取到 CSS 文件
- [x] 编译通过

### V2.0 - 2026-05-12
**设计决策**:
- PromptHub 从独立应用改为 Tipsy Admin 的一个子模块
- 首页展示 6 个管理模块卡片（Prompt Hub + 5 个占位模块）
- 点击 Prompt Hub 进入子布局，左侧 sidebar 导航 5 个分区
- 所有路由前缀从 `/prompts` 改为 `/prompt-hub/prompts`
- Navbar 品牌名从 "PromptHub" 改为 "Tipsy Admin"

**任务进度**:
- [x] Navbar 品牌改为 Tipsy Admin
- [x] HomePage 增加 6 个模块卡片（Prompt Hub 可点击，其余占位）
- [x] 新建 PromptHubLayout 子布局（sidebar + content area）
- [x] App.jsx 路由嵌套到 /prompt-hub 下
- [x] 所有组件 navigate() 路径更新为 /prompt-hub/ 前缀
- [x] sidebar CSS 样式（sticky 定位 + active 高亮）
- [x] 编译通过
