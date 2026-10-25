# English Reading Lab

基于 AI 的英语考试阅读生成与词汇巩固系统。上传词书 → AI 生成阅读 → 答题巩固 → 智能复习。

## 先用一次：词书和主题，怎样变成阅读练习

| 输入 | 例子 | 输出 |
| --- | --- | --- |
| 学习目标与词书 | 六级、内置词书或自己的词书 | 本次阅读的选词范围与难度配置 |
| 可选主题与目标词量 | 主题technology；一篇放入8至24个目标词更易阅读 | 英文文章、中文导读/翻译、目标词、阅读题和填空 |
| 阅读后的答题与熟悉度 | 对目标词选择不认识/模糊/熟悉/掌握，并提交题目答案 | 单词状态、复习安排与阅读历史 |

### 不填Key的第一遍

安装依赖后，可在PowerShell显式启用本地模板：

```powershell
$env:AI_PROVIDER = "mock"
npm run dev
```

1. 访问 `http://localhost:3000/settings`，选择考试目标和活跃词书并保存。mock不用Key，但输出是模板演示，不代表真实AI质量。
2. 进入 `/today`，选择本次用的词书，主题填 `technology`，设置本篇目标词量，点击“生成今日阅读”。
3. 读文章，查看目标词及上下文解释，完成阅读理解和填空，再提交熟悉度反馈。
4. 打开历史页和复习页，检查本次阅读与词汇状态是否保存。重复生成可能覆盖当天文章，注意界面确认提示。

### 输入自己的词书

在 `/vocab` 点击上传，选择TXT/CSV/Excel/PDF，先预览与编辑，再“确认导入”。CSV必须有 `word` 和 `meaning` 列，`pos`、`example`可选；TXT每行至少两列，可用制表符、竖线或逗号分开，例如英文单词与释义。扫描PDF和复杂排版不保证识别正确，应检查预览。

**输出位置：**阅读、词书、计划与进度保存在服务器的 `data/`，当前界面不提供完整阅读PDF/Word导出。浏览器展示的文章不是存进你电脑下载目录。该实现以默认本地用户数据组织，不应把它直接理解成已经有多账号隔离。

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | Next.js 15.3 (App Router) |
| 语言 | TypeScript 5.8 |
| 样式 | Tailwind CSS 4.1 |
| UI 库 | React 19.1 |
| AI 引擎 | DeepSeek API (deepseek-v4-pro / deepseek-v4-flash) |
| 数据存储 | 文件系统 JSON/JSONL（零数据库依赖） |
| PDF 解析 | pdf-parse 2.4.5 + @napi-rs/canvas |
| Excel 解析 | SheetJS (xlsx 0.18.5) |

## 环境要求

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18.x | 推荐 20.x 或 22.x LTS |
| npm | 9.x | 随 Node.js 自带 |

> Windows 用户：pdf-parse 依赖的 `@napi-rs/canvas` 包含预编译的 native 二进制（win32-x64-msvc），**不需要额外安装 C++ 编译工具**，`npm install` 直接可用。如果遇到安装问题，见下方常见问题。

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/kayaduster607-jpg/english_reading.git
cd english_reading

# 2. 安装依赖（约 30 秒，包含 native 模块）
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 用编辑器打开 .env.local，填入你的 DeepSeek API Key

# 4. 启动开发服务器
npm run dev
# 浏览器访问 http://localhost:3000
```

> **开发阶段无需 API Key**：在 `.env.local` 中设置 `AI_PROVIDER=mock`，系统使用本地模板生成器，无需调用 DeepSeek API。

## 环境变量

所有环境变量在 `.env.local` 文件中配置（参考 `.env.example`）：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `AI_PROVIDER` | 否 | `deepseek` | AI 引擎：`mock`（本地模板，免 API）或 `deepseek`（真实 AI） |
| `DEEPSEEK_API_KEY` | 条件 | - | DeepSeek API 密钥，`AI_PROVIDER=deepseek` 时必填 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-v4-pro` | 模型选择：`deepseek-v4-pro`（质量优先）或 `deepseek-v4-flash`（速度优先） |

## 常见问题

### npm install 报错 / 卡住不动

```bash
# 1. 清理缓存后重试
rm -rf node_modules package-lock.json
npm install

# 2. 如果 @napi-rs/canvas 安装失败，检查 Node.js 版本 >= 18
node -v

# 3. Windows 下确保没有杀毒软件拦截 node-gyp
```

### 端口被占用

```bash
# 修改端口启动
npx next dev -p 3001
```

### PyCharm 中 npm install 卡死

在 PyCharm 内置终端中 `npm install` 可能因输出缓冲导致假死。**推荐使用系统终端（PowerShell / CMD）执行**，或在 PyCharm 终端中加 `--loglevel=error` 减少输出：

```bash
npm install --loglevel=error
```

## 项目结构

```
src/
├── app/                          # Next.js App Router 页面与 API
│   ├── api/                      # API Routes
│   │   ├── exams/                # GET 考试配置列表
│   │   ├── readings/             # 阅读生成、查询、历史
│   │   │   ├── generate/         # POST 同步生成
│   │   │   ├── generate-stream/  # POST SSE 流式生成（带进度条）
│   │   │   ├── history/          # GET 历史阅读列表（?days=N）
│   │   │   └── today/            # GET 今日阅读
│   │   ├── review/submit/        # POST 提交复习结果
│   │   ├── user/plan/            # GET/PUT 学习计划
│   │   ├── user/progress/        # GET 词汇掌握进度
│   │   └── vocab/                # 词书管理
│   │       ├── books/            # GET 词书列表
│   │       ├── search/           # GET 搜索词书
│   │       ├── upload/           # POST 上传词书（同步导入）
│   │       ├── import-preview/   # POST 解析预览（多模式可选）
│   │       └── import-confirm/   # POST 确认导入
│   ├── today/                    # 今日阅读页（核心页面）
│   ├── readings/[id]/            # 历史阅读详情页
│   ├── review/                   # 词汇复习仪表盘
│   ├── history/                  # 阅读历史列表
│   ├── settings/                 # 学习设置页
│   └── vocab/                    # 词书管理页
├── components/reading/           # 阅读相关 UI 组件
│   ├── HighlightedText.tsx       # 目标词高亮文本
│   ├── TargetWordPanel.tsx       # 目标词侧边面板
│   ├── ComprehensionQuestions.tsx # 阅读理解题
│   ├── ClozeExercise.tsx         # 完形填空练习
│   └── GenerationProgress.tsx    # 生成进度条（SSE 流式）
├── server/                       # 服务端代码
│   ├── ai/                       # AI 引擎
│   │   ├── provider.ts           # 提供者工厂（DeepSeek/Mock）
│   │   ├── deepseek-provider.ts  # DeepSeek API 调用
│   │   ├── mock-provider.ts      # 本地模板生成器
│   │   ├── prompts.ts            # Prompt 构建 + 考试难度细则
│   │   └── generated-reading.schema.ts # JSON 输出校验
│   ├── parsers/                  # 词书文件解析器
│   │   ├── parser-factory.ts     # 解析器工厂（按扩展名路由）
│   │   ├── txt-parser.ts         # TXT 解析
│   │   ├── csv-parser.ts         # CSV 解析（自动检测表头）
│   │   ├── xlsx-parser.ts        # Excel 解析（.xlsx/.xls）
│   │   ├── pdf-parser.ts         # PDF 解析入口（按模式路由）
│   │   └── pdf-vocab-text-parser.ts # PDF 三策略解析引擎
│   ├── repositories/             # 数据访问层
│   │   ├── exam.repository.ts    # 考试配置
│   │   ├── user.repository.ts    # 用户计划/Profile
│   │   ├── reading.repository.ts # 阅读文章 CRUD + 历史清理
│   │   ├── progress.repository.ts # 词汇进度追踪
│   │   └── vocab-book.repository.ts # 词书管理
│   ├── services/                 # 业务逻辑层
│   │   ├── reading-generation.service.ts # 阅读生成核心流程
│   │   ├── reading-validation.service.ts # 文章质量校验
│   │   ├── vocab-selection.service.ts     # 智能选词算法
│   │   ├── review.service.ts              # 复习提交处理
│   │   └── vocab-ai-extract.service.ts    # DeepSeek 辅助词条提取
│   └── storage/                  # 存储底层工具
│       ├── json.ts               # JSON 读写（原子写入）
│       ├── jsonl.ts              # JSONL 读写
│       ├── file-system.ts        # 文件系统操作
│       └── path.ts               # 路径解析
├── shared/                       # 共享代码
│   ├── types.ts                  # 全部 TypeScript 类型定义
│   ├── constants.ts              # 常量（考试列表、主题、默认值）
│   ├── date.ts                   # 日期工具
│   ├── id.ts                     # ID 生成
│   ├── word-count.ts             # 字数统计
│   ├── reading-target-limits.ts  # 按考试的目标词限制
│   └── history.ts                # 历史保留策略（15天）
└── app/globals.css               # 全局样式 + CSS 变量主题
```

## 数据目录结构

```
data/
├── app.json                      # 应用元数据
├── cache/                        # 缓存
├── exams/                        # 7种考试配置（CET4/6/考研/雅思/托福/中考/高考）
├── users/default/                # 默认用户数据
│   ├── plan.json                 # 学习计划
│   ├── profile.json              # 用户信息
│   ├── progress.json             # 词汇掌握进度
│   ├── readings/                 # 阅读文章（按 年/月/日.json 组织）
│   │   ├── index.json
│   │   └── 2026/05/
│   └── review-log.jsonl          # 复习日志
└── vocab-books/                  # 词书
    ├── builtin/                  # 内置词书
    └── uploaded/                 # 上传词书
```

## 核心架构

```
用户上传词书（TXT/CSV/XLSX/PDF）
        │
        ▼
  多策略解析器 ─── 如果规则解析失败 ──→ DeepSeek 辅助提取
        │
        ▼
  词书存储（meta.json + words.jsonl）
        │
        ▼
用户设置学习计划（考试目标、每日词量、单篇目标词数）
        │
        ▼
生成阅读时 ──→ VocabSelectionService 智能选词
        │         ├─ 弱词优先（+1000分）
        │         ├─ 到期复习优先（+500分）
        │         ├─ 新词（+700分）
        │         ├─ 3天内见过降权（-800分）
        │         └─ mastered 排除（-1000分）
        │
        ▼
  DeepSeek 生成文章 ──→ SSE 流式进度推送
        │                10%→25%→35%→42-82%→88%→94%→97%→100%
        ▼
  ReadingValidationService 校验
        │  ├─ 字数检查（95%-115% 容差）
        │  ├─ 目标词全部出现
        │  └─ 题目答案正确性
        ▼
  失败 → 自动重试（最多3次）
  成功 → 保存文章 + markWordsExposed（记录词已出现）
        → pruneOldReadings（清理15天外旧文章）
        │
        ▼
用户阅读文章 → 答题 → 全文翻译 → 词汇自测 → 提交复习
        │                                        │
        └── progress.json 更新 ◄─────────────────┘
              ├─ practiceCount++
              ├─ correctCount++ / wrongCount++
              ├─ familiarity 变化
              ├─ status 重新计算
              └─ nextReviewAt 间隔设置
```

## 支持的考试

| 考试 | CEFR | 文章字数 | 单篇目标词 |
|------|------|----------|------------|
| 中考 | A2-B1 | 200-300 | 4-8 |
| 高考 | B1 | 280-380 | 6-12 |
| 四级 CET-4 | B1-B2 | 320-420 | 8-14 |
| 六级 CET-6 | B2 | 420-520 | 10-18 |
| 考研 | B2-C1 | 480-600 | 12-24 |
| 雅思 IELTS | B2-C1 | 600-800 | 12-24 |
| 托福 TOEFL | B2-C1 | 600-800 | 12-24 |

## 词汇掌握状态机

```
new ───(阅读中出现)───→ learning ───(正确率高)───→ familiar ───(持续正确)───→ mastered
  │                         │                        │                      │
  └──(用户标记不认识)──→ weak ←─(连续错误)────────────┘                      │
       │                                                                    │
       └──(重新学习)──→ learning ───────────────────────────────────────────┘
```

## 版本历史

### v0.1.0 — MVP 初始化 (2026-05-20)
- **Commit: `ee9561d` — `init: MVP`**
  - 项目骨架搭建：Next.js 15.3 + TypeScript + Tailwind CSS 4
  - 文件系统存储层（JSON/JSONL 读写、路径解析、原子写入）
  - 7种考试配置（中考→托福），含 CEFR 等级、字数范围、段落数、题型
  - 基础类型系统：ExamProfile、VocabItem、VocabBook、GeneratedReading、UserPlan
  - Mock AI Provider：模板生成器，支持 8 个固定主题
  - 内置 CET-6 核心词书（30词）
  - Repository 模式数据访问层
  - 基础页面：今日阅读、词书管理、设置、历史、复习仪表盘
  - API 路由：exams、readings/today、readings/generate、user/plan、vocab/books
  - 全局 CSS 主题变量（绿色主色调 `#2f6b4f`）

### v0.2.0 — AI 生成 + 多格式导入 (2026-05-20)
- **Commit: `69a2ade` / `69a4368` — `接入AI生成高质量文章，篇幅增加，可导入excel，txt格式的单词书`**
  - DeepSeek Provider：调用 Chat Completions API，`response_format: json_object`
  - Prompt 构建系统：考试难度说明、13条硬性要求、JSON 输出格式模板
  - 文章质量校验：字数检查、目标词全覆盖验证、题目答案正确性
  - 全文中文翻译 `translationCn`：与 paragraphs 一一对应，答题后展示
  - TXT 解析器：支持 tab/竖线/逗号分隔
  - CSV 解析器：自动检测中英文表头
  - Excel 解析器：SheetJS 集成，多 Sheet 支持，中英文表头检测
  - 词书上传预览流程：上传 → 解析 → 编辑预览 → 确认导入
  - `VocabSelectionService`：基础选词（新词优先、弱词优先、复习到期优先）
  - `ReviewService`：提交复习 → 更新 familiarity/status/nextReviewAt
  - `ComprehensionQuestions` 组件：4选项交互 + 颜色反馈 + 中文解析
  - `ClozeExercise` 组件：填空 + 中文提示 + 即时反馈
  - 今日阅读页重设计：双栏布局（文章+侧边词面板）、生成表单
  - `HighlightedText` 组件：目标词黄色高亮
  - `TargetWordPanel` 组件：可展开的词汇上下文面板
  - 设置页：考试选择、词书启用、主题偏好

### v0.3.0 — PDF 导入 + 可视化进度 + 核心产品逻辑重构 (2026-05-20)
- **Commit: `817aeb7` / `82ba66c` — `可导入pdf单词书，增加AI生成文章的可视化进度`**
  
  **核心产品逻辑重构：**
  - 新增 `readingTargetWordCount` 字段，与 `dailyNewWords`/`dailyReviewWords` 分离
  - "每日学习词量"和"单篇阅读目标词"拆为独立概念
  - 新增 `reading-target-limits.ts`：按考试限制单篇目标词范围
  - 生成服务不再把 dailyNewWords+dailyReviewWords 当单篇目标词

  **智能选词算法升级：**
  - 稳定的哈希扰动替代 `Math.random()`（同日同词得分稳定）
  - 最近 3 天出现过的词降权 -800
  - 高级考试自动降低基础词优先级（good/huge/same...）
  - 40% 复习词 + 60% 新词配额分配
  - 生成成功后 `markWordsExposed`：立即记录词已出现
  - 提交答案不再重复增加 `seenCount`，新增 `practiceCount`

  **AI 生成体验：**
  - SSE 流式生成接口：`POST /api/readings/generate-stream`
  - `GenerationProgress` 进度条组件
  - 生成阶段：10%读计划 → 25%选词 → 35%请求AI → 42-82%生成中 → 88%校验 → 94%保存 → 97%更新进度 → 100%完成
  - DeepSeek `max_tokens` 提升至 9000
  - 生成失败自动重试 3 次

  **PDF 词书导入：**
  - pdf-parse 集成 + Next.js serverExternalPackages 配置
  - 三策略解析引擎：`inline-numbered`（编号词表）/ `momo-table`（表格词书）/ `simple-line`（简单行格式）
  - `auto` 模式自动合并三种策略结果
  - 解析质量评分：准确率、策略统计、疑似词条数
  - 解析模式选择器：用户可根据 PDF 类型手动选择
  - DeepSeek 辅助解析兜底：规则失败时 AI 抽取词条
  - 预览区分页显示（每页80条），避免大数据量卡顿
  - `.env.local` 加入 `.gitignore`，防止 API Key 泄露

  **Prompt 增强：**
  - 按考试添加风格细则（CET-6 要求分析性论述，考研要求社论风格等）
  - 新增 5 条硬性要求（不写低龄故事、基础词不影响难度、需要抽象论述等）

  **历史管理：**
  - 历史保留 15 天，`HistoryRetentionDays = 15`
  - 生成新文章自动清理过期文件
  - 历史 API 支持 `?days=N` 参数

  **字数校验强化：**
  - `validateWordCount` 从 `console.warn` 改为 `throw Error`
  - 字数不足触发自动重试

## 已知问题与待解决

1. **PDF 扫描版不支持**：当前 PDF 解析依赖可复制文字层，扫描版/图片型 PDF 无法提取文字，需 OCR 方案
2. **PDF 排版容错有限**：复杂多栏、跨页拆分、不规则排版仍可能漏词，需视具体 PDF 调整策略
3. **单用户硬编码**：当前仅支持 `default` 用户，无登录/多用户系统
4. **无数据库持久化**：文件系统存储在并发写入场景下可能有问题，不适合生产部署
5. **AI 生成延迟**：DeepSeek 调用单次约 15-45 秒，进度条是模拟阶段式而非真实 token 进度
6. **Prompt 依赖**：文章质量高度依赖 Prompt，对不同考试可能需要微调
7. **词汇数据无词频分级**：选词仅基于用户 progress，未引入外部词频数据
8. **移动端适配未完成**：双栏布局在小屏上需优化
9. **无测试覆盖**：无单元测试或集成测试
10. **复习算法简化**：Spaced Repetition 算法较简单，可用 SM-2 等成熟算法替代

## License

Private project.
