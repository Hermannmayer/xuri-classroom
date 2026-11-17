import type { ReactNode } from 'react';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

/**
 * 「AI 与智能体」引导页的静态内容（task-16）。
 *
 * 文案全部是产品口径，不写实现细节；改文案只改这个文件，页面组件不掺内容。
 * 每条能力都写清「从哪进」——这是这次要解决的核心缺口：
 * 用户知道有 AI，但不知道入口藏在哪个按钮下面。
 */

export interface Capability {
  key: string;
  title: string;
  icon: ReactNode;
  summary: string;
  /** 界面里的点击路径，文案与页面上的按钮名保持一致（AI 生成试卷 / AI 优化 / AI 建议 / AI 学情总结） */
  entry: string;
  /** 所需权限，直接写权限码，和权限配置页的分组一致 */
  permission: string;
  /** 一句话限制或注意事项，避免用户误以为 AI 会自动改卷 */
  tip: string;
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'paper',
    title: 'AI 出卷',
    icon: <FileTextOutlined />,
    summary: '按学科、题量、总分、题型配比和难度一次生成整卷。生成完先进预览，勾选后才写进画布。',
    entry: '教学 → 打开一份考试 → 编辑器工具栏「AI 生成试卷」',
    permission: 'ai:use；采纳写入还要 project:update',
    tip: '生成通常 30~90 秒。分值是硬校验：模型给的分值合计对不上要求的总分，整卷作废，重试一次通常就好。',
  },
  {
    key: 'rewrite',
    title: 'AI 改题',
    icon: <EditOutlined />,
    summary: '选中一道题，让 AI 给 3 条改写建议（讲清楚 / 中性 / 更短），选一条采纳即可。',
    entry: '编辑器里点题卡旁的「AI 优化」浮标，或右键选「AI 优化题干」',
    permission: 'ai:use',
    tip: '只换题干，选项、分值和正确答案都不动；题干里有图片时会提示，采纳后还能点「恢复原题干」。',
  },
  {
    key: 'grade',
    title: 'AI 批改建议',
    icon: <CheckCircleOutlined />,
    summary: '主观题逐题给出建议分、采分点命中情况和理由，先把最容易判偏的题挑出来。',
    entry: '答卷列表 → 打开一份答卷 → 批改抽屉 → 题目右侧「AI 建议」',
    permission: 'ai:use + answer:grade',
    tip: '只给建议、不自动落分；最终分数仍由你确认保存，操作日志里记的是人工批改。',
  },
  {
    key: 'report',
    title: 'AI 学情总结',
    icon: <BarChartOutlined />,
    summary: '把本页的统计数字写成一段学情分析：总量、平均分、逐题分布，可直接贴进家长会或教研记录。',
    entry: '试卷 → 报表 → 工具栏「AI 学情总结」',
    permission: 'ai:use + project:report',
    tip: '只发送统计数字，不发送学员原始答卷；还没有答卷时按钮是灰的。',
  },
];

export interface ModelFaq {
  question: string;
  cause: string;
  fix: string;
}

/**
 * 模型服务侧的常见问题。
 *
 * 这里的报错原文都能在 AiGateway / AiAssistServiceImpl / AiUsageServiceImpl 里找到，
 * 排查顺序按「最常见的先修」排：权限 → 开关 → Key → 模型 → 地址 → 网络 → 内容校验 → 限额。
 */
export const MODEL_FAQS: ModelFaq[] = [
  {
    question: '页面上找不到任何 AI 按钮',
    cause: '当前账号没有 ai:use 权限。学员默认没有，自定义角色也可能没勾。',
    fix: '管理员在「系统设置 → 权限配置」里给对应角色勾上「AI」组的「使用 AI 助手」，重新登录后按钮才会出现。',
  },
  {
    question: '提示「AI 功能未启用，请先在系统设置里配置模型」',
    cause: 'AI 总开关关着。',
    fix: '系统设置 → AI → 打开「启用 AI」并保存。保存后立即生效，不用重启服务。',
  },
  {
    question: '提示「AI 的 API Key 未配置，请先在系统设置里填写」',
    cause: '保存时 API Key 留空，而之前也没配过（已保存的 Key 不会回显，留空表示保持原值）。',
    fix: '重新填写 API Key 再保存一次。',
  },
  {
    question: '提示「没有可用的 AI 模型，请先在系统设置里添加模型」',
    cause: '「模型列表」是空的，且没选默认模型。',
    fix: '在「模型列表」里填至少一个模型名（与供应商文档一致，如 deepseek-chat、gpt-4o-mini），再选默认模型。',
  },
  {
    question: '模型服务返回 401 / invalid_api_key',
    cause: 'Key 填错、已被吊销，或复制时把「Bearer 」前缀一起粘进去了。',
    fix: '只填 Key 本身（服务端自己拼 Authorization: Bearer）；到供应商后台确认 Key 有效、额度没用完。',
  },
  {
    question: '模型服务返回 403 / insufficient permissions',
    cause: '这个 Key 没有该模型的权限，或账号被风控/限流。',
    fix: '换一个已开通的模型；仍然 403 就找供应商确认权限与实名/额度状态。',
  },
  {
    question: '模型服务返回 404',
    cause: 'Base URL 多了或少了路径，最常见是漏了 /v1。',
    fix: 'Base URL 要能拼出 /chat/completions：如 https://api.openai.com/v1、https://api.deepseek.com/v1；已经以 /chat/completions 结尾也可以。',
  },
  {
    question: '提示「调用超时（120 秒）」或连接失败',
    cause: '服务端单次调用 120 秒超时，失败会重试 2 次（1 秒、2 秒）；内网地址不通、模型排队也会这样。',
    fix: '先在服务器上 curl 同一地址确认网络和 Key；出卷换更快的模型；自建网关确认没被限速。',
  },
  {
    question: '提示「模型返回的不是 JSON」或「AI 出卷结果未通过校验」',
    cause: '模型没按 JSON 输出、输出被截断，或题量/分值/选项/答案没凑齐。',
    fix: '换指令遵循更好的模型（四个场景都要求只输出 JSON）；按提示调小题量或改分值再试。',
  },
  {
    question: '提示「AI 调用过于频繁，请稍等几秒再试」',
    cause: '同一账号每分钟最多 10 次 AI 调用（防连点）。',
    fix: '等几秒再点；批量操作时一次只开一道题。',
  },
  {
    question: '提示「今日 AI 用量已达单人上限 / 全站上限」',
    cause: '按 token 记账的每日限额到了（默认单人 20 万、全站 200 万）。',
    fix: '次日自动恢复；确实需要提高额度，联系系统维护人员调整 AI 限额（dailyTokenLimit / perUserDailyLimit）。',
  },
];

export interface McpTool {
  name: string;
  title: string;
  desc: string;
  permission: string;
  write: boolean;
}

/** 与后端 McpToolCatalog 一一对应：9 类能力，导出拆成 create/get，共 10 个工具 */
export const MCP_TOOLS: McpTool[] = [
  {
    name: 'sk_capabilities',
    title: '能力清单',
    desc: '当前令牌能用哪些工具、各工具需要的权限、可用题型与限制。建议第一次先调它。',
    permission: '无需额外权限',
    write: false,
  },
  {
    name: 'sk_project_list',
    title: '项目列表',
    desc: '分页列出当前用户可见的考试 / 问卷，支持按名称、分类、模式过滤。',
    permission: 'project:list',
    write: false,
  },
  {
    name: 'sk_project_get',
    title: '项目详情',
    desc: '读一个项目的完整内容：整卷 schema 与考试设置。',
    permission: 'project:detail',
    write: false,
  },
  {
    name: 'sk_project_validate',
    title: '校验试卷',
    desc: '只校验不落库：题量、分值、选项、正确答案、字典引用完整性。',
    permission: 'project:detail',
    write: false,
  },
  {
    name: 'sk_project_create',
    title: '新建项目',
    desc: '新建考试 / 问卷，默认未发布；必须带 idempotencyKey。',
    permission: 'project:create',
    write: true,
  },
  {
    name: 'sk_project_update',
    title: '修改项目',
    desc: '改名称 / 分类 / 整卷 schema / 设置，只传要改的字段；必须带 idempotencyKey。',
    permission: 'project:update',
    write: true,
  },
  {
    name: 'sk_project_publish',
    title: '发布 / 停收',
    desc: '开启或关闭答卷收集；必须带 idempotencyKey。',
    permission: 'project:publish',
    write: true,
  },
  {
    name: 'sk_report_get',
    title: '答卷报表',
    desc: '读答卷统计：summary 总量与趋势、questions 逐题统计、exam 选项分布。',
    permission: 'project:report',
    write: false,
  },
  {
    name: 'sk_export_create',
    title: '发起导出',
    desc: '按班级导出答卷 PDF 的异步任务，返回 jobId；必须带 idempotencyKey。',
    permission: 'answer:export',
    write: true,
  },
  {
    name: 'sk_export_get',
    title: '导出进度',
    desc: '查导出任务进度：queued / running / done / failed，带进度与文件名。',
    permission: 'answer:export',
    write: false,
  },
];

export type McpClientKey = 'generic' | 'cursor' | 'vscode' | 'codex';

export interface McpClient {
  key: McpClientKey;
  label: string;
  /** 配置文件放在哪里（对着客户端界面照抄） */
  configPath: string;
  language: 'json' | 'toml';
  hint: string;
  build: (url: string) => string;
}

const TOKEN_PLACEHOLDER = 'Bearer <token>';

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * 各客户端的配置片段。
 *
 * 形状差异是真实的（2026-11 对照各家文档核实过）：
 * - 通用 / Claude Code：顶层 mcpServers，远程条目要 type；
 * - Cursor：顶层 mcpServers，远程条目不要 type，给 url 即可；
 * - VS Code：顶层 servers（不是 mcpServers），type 写 http；
 * - Codex：TOML，~/.codex/config.toml 的 [mcp_servers.<name>]。
 * 页面只负责按当前站点地址拼出片段，令牌用 <token> 占位，由用户替换成 sk_ 明文。
 */
export const MCP_CLIENTS: McpClient[] = [
  {
    key: 'generic',
    label: '通用 / Claude Code',
    configPath: '.mcp.json（项目）或 ~/.claude.json（用户）',
    language: 'json',
    hint: '多数支持 Streamable HTTP 的客户端都认这个形状。若客户端只认 url，可删掉 type；若要求写 http，把 streamableHttp 换成 http。',
    build: (url) =>
      prettyJson({
        mcpServers: {
          xuri: {
            type: 'streamableHttp',
            url,
            headers: { Authorization: TOKEN_PLACEHOLDER },
          },
        },
      }),
  },
  {
    key: 'cursor',
    label: 'Cursor',
    configPath: '.cursor/mcp.json（项目）或 ~/.cursor/mcp.json（全局）',
    language: 'json',
    hint: 'Cursor 的远程条目不需要 type，只认 url + headers；写错顶层键（比如写成 servers）会直接看不到这个服务。',
    build: (url) =>
      prettyJson({
        mcpServers: {
          xuri: {
            url,
            headers: { Authorization: TOKEN_PLACEHOLDER },
          },
        },
      }),
  },
  {
    key: 'vscode',
    label: 'VS Code',
    configPath: '.vscode/mcp.json（工作区）或用户配置 mcp.json',
    language: 'json',
    hint: 'VS Code 的顶层键是 servers（不是 mcpServers），远程条目 type 写 http；也可以在命令面板执行「MCP: Open User Configuration」。',
    build: (url) =>
      prettyJson({
        servers: {
          xuri: {
            type: 'http',
            url,
            headers: { Authorization: TOKEN_PLACEHOLDER },
          },
        },
      }),
  },
  {
    key: 'codex',
    label: 'Codex',
    configPath: '~/.codex/config.toml',
    language: 'toml',
    hint: 'Codex 用 TOML。更稳妥的做法是不把明文写进文件：先设环境变量 XURI_MCP_TOKEN，再改用 bearer_token_env_var = "XURI_MCP_TOKEN"。',
    build: (url) =>
      [
        '[mcp_servers.xuri]',
        'url = "' + url + '"',
        'http_headers = { Authorization = "' + TOKEN_PLACEHOLDER + '" }',
      ].join('\n'),
  },
];

/** 「复制这段需求」的示例：把目标试卷名换成自己的，AI 客户端就能按工具链跑一遍 */
export const MCP_PROMPT_EXAMPLE = [
  '先用 sk_capabilities 看看这个令牌能用哪些工具；',
  '再用 sk_project_list 找到《安全生产培训》这份考试，用 sk_project_get 读出完整 schema。',
  '保留原有题目，新增 5 道单选题（每题 2 分、4 个选项、给出正确答案），',
  '改完先调 sk_project_validate 校验，通过后再用 sk_project_update 保存，',
  'idempotencyKey 用 20261117-safety-5，最后告诉我改了哪几道题。',
].join('');
