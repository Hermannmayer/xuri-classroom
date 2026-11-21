import type { ReactNode } from 'react';
import {
  AimOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  MessageOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';










export type CapabilityTarget = 'project' | 'repo' | 'notice';

export interface Capability {
  key: string;
  title: string;
  icon: ReactNode;
  summary: string;

  entry: string;

  permission: string;

  tip: string;

  target?: CapabilityTarget;
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'paper_pick',
    title: '抽题组卷',
    icon: <FileTextOutlined />,
    summary: '按题型配比、难度与章节从题库里抽题组整卷。模型只负责挑题和排序，不编题——题面来自你自己的题库。',
    entry: '打开一份试卷 → 编辑器工具栏「AI 组卷」；也可以在 AI 对话框里说「从题库抽 20 道题组一份单元测验」',
    permission: 'ai:use；勾选采纳写入还要 project:update',
    tip: '生成先落到预览，逐题勾选后才写进画布；题库里不够时提示会直接写「缺 N 道」，这时放宽章节或难度再试。',
    target: 'project',
  },
  {
    key: 'paper_check',
    title: '试卷质检',
    icon: <SafetyCertificateOutlined />,
    summary: '开考前把整卷过一遍：缺分值、缺参考答案、题干重复、题型配比与难度分布异常，最后补一段考点覆盖建议。',
    entry: '试卷编辑器工具栏「试卷质检」；对话框里说「这份卷子有什么问题」',
    permission: 'ai:use',
    tip: '分值 / 答案 / 重复这类确定性检查不花 token 也能跑，只有「考点覆盖建议」会调模型。',
    target: 'project',
  },
  {
    key: 'grade_batch',
    title: '批量 AI 批改',
    icon: <CheckCircleOutlined />,
    summary: '把一场考试里还没批的主观题一次批完：只处理未批答卷、只补没给分的题，写入可撤销。',
    entry: '答卷数据页工具栏「批量 AI 批改」；对话框里说「把这个班没批的卷子批了」',
    permission: 'ai:use + answer:grade',
    tip: '分数会写进库、审计记在你名下；低置信度的题列进「需复核」，撤销令牌 24 小时内有效。',
    target: 'project',
  },
  {
    key: 'repo_audit',
    title: '题库体检',
    icon: <DatabaseOutlined />,
    summary: '按题库做体检：重复题、缺解析、缺难度 / 章节 / 标签，逐条给修改建议，勾选后才写回题目。',
    entry: '题库题目页工具栏「题库体检」',
    permission: 'ai:use；应用建议还要 repo:update 或 template:update',
    tip: '重复题先按字面相似度预筛再交给模型；一轮最多 120 道，大题库分章节跑更准。',
    target: 'repo',
  },
  {
    key: 'practice',
    title: '错题重练',
    icon: <AimOutlined />,
    summary: '按某场考试（或某个班）的逐题得分率找出薄弱考点，再从题库抽一组「最该重练」的题。',
    entry: '试卷报表（学情）页工具栏「错题重练」',
    permission: 'ai:use + project:report',
    tip: '只把统计数字发给模型，不发送学员姓名与原始答案。',
    target: 'project',
  },
  {
    key: 'notice_draft',
    title: '写通知',
    icon: <NotificationOutlined />,
    summary: '把几句要点补成一条规范通知（标题 + 正文 + 受众），先在编辑框里改，确认后才发布。',
    entry: '系统管理 → 公告管理 → 新建公告 → 「AI 起草」',
    permission: 'ai:use；发布会按 notice:manage:system / notice:manage:class 判定范围',
    tip: 'AI 只给草稿，不会自己发布；班级公告只有带这个班的老师能发。',
    target: 'notice',
  },
  {
    key: 'chat',
    title: 'AI 对话（能动手）',
    icon: <MessageOutlined />,
    summary: '右下角悬浮对话框：不用记按钮在哪，直接说要做的事，它会带上当前页面的试卷 / 题库 / 班级。',
    entry: '任何页面右下角「AI 助手」；例如说「把这个班没批的卷子批了」「从题库抽 20 道题组一份单元测验」',
    permission: 'ai:use',
    tip: '能执行的动作（批改 / 组卷 / 体检 / 报表）会给出结果卡和「去查看」；没配模型时对话框会直接告诉你差哪一步。',
  },
];

export interface ModelFaq {
  question: string;
  cause: string;
  fix: string;
}







export const MODEL_FAQS: ModelFaq[] = [
  {
    question: '页面上找不到任何 AI 入口',
    cause: '当前账号没有 ai:use 权限。学员默认没有，自定义角色也可能没勾。',
    fix: '管理员在「用户与权限 → 权限配置」里给对应角色勾上「AI」组的「使用 AI 助手」，重新登录后入口才会出现。',
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
    cause: '这个 Key 没有该模型的权限，或账号被风控 / 限流。',
    fix: '换一个已开通的模型；仍然 403 就找供应商确认权限与实名 / 额度状态。',
  },
  {
    question: '模型服务返回 404',
    cause: 'Base URL 多了或少了路径，最常见是漏了 /v1。',
    fix: 'Base URL 要能拼出 /chat/completions：如 https://api.openai.com/v1、https://api.deepseek.com/v1；已经以 /chat/completions 结尾也可以。',
  },
  {
    question: '提示「调用超时（120 秒）」或连接失败',
    cause: '服务端单次调用 120 秒超时，失败会重试 2 次（1 秒、2 秒）；内网地址不通、模型排队也会这样。',
    fix: '先在服务器上 curl 同一地址确认网络和 Key；质检 / 体检换更快的模型；自建网关确认没被限速。',
  },
  {
    question: '提示「模型返回的不是 JSON」或「结果未通过校验」',
    cause: '模型没按 JSON 输出、输出被截断，或组卷的题量 / 分值没凑齐。质检、体检、批改都要求模型只输出 JSON。',
    fix: '换指令遵循更好的模型；体检按章节分批（一轮 ≤120 题）、组卷调小题量后重试。',
  },
  {
    question: '提示「AI 调用过于频繁，请稍等几秒再试」',
    cause: '同一账号每分钟最多 10 次 AI 调用（防连点），可在「系统设置 → AI → 限额」调整。',
    fix: '等几秒再点；批量操作时一次只开一道题。批改 / 组卷这类后台任务不受这条限流约束。',
  },
  {
    question: '提示「今日 AI 用量已达单人上限 / 全站上限」',
    cause: '按 token 记账的每日限额到了（默认单人 20 万、全站 200 万）。',
    fix: '次日零点自动恢复；确实需要提高额度，管理员在「系统设置 → AI → 限额」把 dailyTokenLimit / perUserDailyLimit 调大（0 表示不限）。',
  },
  {
    question: '组卷说「题库里不够」，或者抽出来的题不是想要的',
    cause: '章节 / 难度 / 题型配比这几项一起卡，候选池变小了。',
    fix: '放宽章节或难度、减少题型配比里的种类；确认选中的题库确实有对应题型的题。',
  },
  {
    question: '批量批改只批了一部分，很多题被跳过',
    cause: '这条路径只处理「未批改」的答卷、只补还没给分的题，且题目要有参考答案。',
    fix: '先把参考答案补齐；已经人工给过分的题不会被覆盖，需要改动请在批改抽屉里手改。',
  },
];

export interface McpTool {
  name: string;
  title: string;
  desc: string;
  permission: string;
  write: boolean;
}


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


export const MCP_PROMPT_EXAMPLE = [
  '先用 sk_capabilities 看看这个令牌能用哪些工具；',
  '再用 sk_project_list 找到《安全生产培训》这份考试，用 sk_project_get 读出完整 schema。',
  '保留原有题目，新增 5 道单选题（每题 2 分、4 个选项、给出正确答案），',
  '改完先调 sk_project_validate 校验，通过后再用 sk_project_update 保存，',
  'idempotencyKey 用 20261117-safety-5，最后告诉我改了哪几道题。',
].join('');
