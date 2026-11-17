import { useEffect, useState } from 'react';
import { Alert, Collapse, Select, Spin, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { getSystem, listProjects } from '../../api';
import type { ProjectView } from '../../api';
import { getAiUsageToday } from '../../api/ai';
import type { AiUsageToday } from '../../api/ai';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { AI_GUIDE_SECTIONS } from './constants';
import { CAPABILITIES, MODEL_FAQS } from './content';
import McpGuide from './McpGuide';
import SectionHead from './SectionHead';
import './ai-guide.css';

/**
 * 「AI 与智能体」引导页（task-16，路由 /ai）。
 *
 * 要解决的是三个具体缺口：
 * 1. 不知道 AI 能干什么、入口藏在哪 → 能力清单，每项写清「从哪进」并带入口链接；
 * 2. 不知道怎么开 → 准备模型服务 / 系统设置 / 开权限三步 + 报错排查；
 * 3. MCP 不知道怎么接 → 选客户端 → 建令牌 → 复制配置片段，外加工具清单与验证。
 *
 * 权限口径与后端一致：
 * - 页面本身 ai:use 或 system:setting:update 任一即可进入（router.tsx 的守卫）；
 * - 页面里的链接按目标页面的守卫逐个判权，没权限就不渲染，避免「点进去 403」；
 * - 学员没有 ai:use 时看不到 AI 按钮，这里会把原因写明，而不是给一个点不动的链接。
 */
export default function AiGuide() {
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>();
  const [usage, setUsage] = useState<AiUsageToday>();
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [pickedId, setPickedId] = useState<string>();

  useEffect(() => {
    let alive = true;
    void loadAuthorities().then((list) => {
      if (!alive) return;
      setAuthorities(list);
      setAuthReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // AI 总开关所有人都能读（GET /api/system 的 aiEnabled）；/api/system/aiSetting 只给管理员，这里不碰
  useEffect(() => {
    let alive = true;
    void getSystem()
      .then((system) => {
        if (alive) setAiEnabled(Boolean(system.aiEnabled));
      })
      .catch(() => {
        if (alive) setAiEnabled(undefined);
      });
    return () => {
      alive = false;
    };
  }, []);

  const canUseAi = can(authorities, PERMISSION_CODES.aiUse);
  const canEnterList = can(authorities, PERMISSION_CODES.projectList);
  const canEditProject = can(authorities, PERMISSION_CODES.projectUpdate);
  const canListAnswers = can(authorities, PERMISSION_CODES.answerList);
  const canReport = can(authorities, PERMISSION_CODES.projectReport);
  const canOpenSettings = can(authorities, PERMISSION_CODES.systemRoleList);
  const canManageToken = can(authorities, PERMISSION_CODES.systemSettingUpdate);
  const listPath = can(authorities, PERMISSION_CODES.portalTeacher) ? '/teaching?tab=exam' : '/project';

  useEffect(() => {
    if (!authReady || !canUseAi) return;
    let alive = true;
    void getAiUsageToday()
      .then((today) => {
        if (alive) setUsage(today);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authReady, canUseAi]);

  useEffect(() => {
    if (!authReady || !canEnterList) return;
    let alive = true;
    setProjectsLoading(true);
    void listProjects({ current: 1, pageSize: 50, flat: true })
      .then((result) => {
        if (!alive) return;
        const rows = (result.data ?? []).filter((row) => row.mode !== 'folder');
        setProjects(rows);
        // 默认选中第一份：下面三个直达链接一进页面就是可点的，不用先选
        setPickedId((prev) => prev || rows[0]?.id);
      })
      .catch(() => {
        if (alive) setProjects([]);
      })
      .finally(() => {
        if (alive) setProjectsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authReady, canEnterList]);

  const usageText = !canUseAi
    ? '未开通'
    : usage
      ? (usage.userTokens ?? 0).toLocaleString('zh-CN') +
        ' / ' +
        (usage.userLimit ? usage.userLimit.toLocaleString('zh-CN') : '不限') +
        ' tokens'
      : '读取中…';

  return (
    <div className="ai-guide">
      <header className="ai-guide-header">
        <div className="ai-guide-eyebrow">AI / 与智能体接入</div>
        <h1 className="bp-title ai-guide-title">AI 助手与智能体</h1>
        <p className="ai-guide-lead">
          四个 AI 能力已经接在出卷、改题、批改和报表里；再把 MCP 配到 Codex / Cursor / VS Code，
          AI 就能直接读你的考试、改题目、拉报表。这一页把「怎么开、从哪进、怎么接」一次讲清。
        </p>
        <div className="ai-guide-actions">
          {canOpenSettings ? (
            <Link className="ai-btn ai-btn-primary" to="/system/setting">
              打开系统设置
            </Link>
          ) : null}
          <a className="ai-btn" href="#capabilities">
            看能力清单
          </a>
          <a className="ai-btn" href="#mcp">
            接 MCP
          </a>
        </div>
      </header>

      <div className="ai-guide-status" role="status" aria-live="polite">
        <StatusItem
          label="AI 状态"
          value={aiEnabled === undefined ? '读取中…' : aiEnabled ? '已启用' : '未启用'}
          tone={aiEnabled ? 'ok' : 'warn'}
        />
        <StatusItem
          label="我的 AI 权限"
          value={!authReady ? '读取中…' : canUseAi ? '可用（ai:use）' : '未开通'}
          tone={canUseAi ? 'ok' : 'warn'}
        />
        <StatusItem label="今日用量" value={usageText} />
        <StatusItem label="MCP 端点" value={window.location.origin + '/mcp'} mono />
      </div>

      {aiEnabled === false ? (
        <Alert
          className="ai-guide-alert"
          type="warning"
          showIcon
          title="AI 还没有启用"
          description={
            canOpenSettings ? (
              <span>
                到{' '}
                <Link to="/system/setting">系统设置 → AI</Link>{' '}
                填好 Base URL、API Key 和模型，打开「启用 AI」并保存，四个场景马上可用。
              </span>
            ) : (
              <span>请联系管理员在「系统设置 → AI」里配置模型服务并启用。</span>
            )
          }
        />
      ) : null}

      {authReady && aiEnabled && !canUseAi ? (
        <Alert
          className="ai-guide-alert"
          type="info"
          showIcon
          title="当前账号没有 ai:use 权限"
          description="能力清单可以看，但页面里不会出现 AI 按钮。需要管理员在「系统设置 → 权限配置 → AI」里给角色勾上「使用 AI 助手」。"
        />
      ) : null}

      <div className="ai-guide-body">
        <nav className="ai-guide-toc" aria-label="页面目录">
          <div className="ai-toc-title">目录</div>
          {AI_GUIDE_SECTIONS.map((section, index) => (
            <a key={section.id} className="ai-toc-link" href={'#' + section.id}>
              <span className="ai-toc-no">{String(index + 1).padStart(2, '0')}</span>
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ai-guide-main">
          <section id="capabilities" className="ai-section">
            <SectionHead
              index="01"
              title="AI 能做什么"
              desc="四个场景都已经接在现有页面里，不用另装插件。每张卡写清了从哪进、需要什么权限，以及一条最容易踩的限制。"
            />

            <div className="ai-cap-grid">
              {CAPABILITIES.map((item) => (
                <article key={item.key} className="ai-cap">
                  <div className="ai-cap-head">
                    <span className="ai-cap-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <h3 className="ai-cap-title">{item.title}</h3>
                  </div>
                  <p className="ai-cap-desc">{item.summary}</p>
                  <div className="ai-cap-entry">
                    <span className="ai-cap-entry-label">从哪进</span>
                    <span>{item.entry}</span>
                  </div>
                  <div className="ai-cap-meta">
                    <Tag className="ai-cap-perm">{item.permission}</Tag>
                  </div>
                  <p className="ai-cap-tip">{item.tip}</p>
                  {canEnterList ? (
                    <Link className="ai-link" to={listPath}>
                      打开试卷列表 →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="ai-card ai-direct">
              <div className="ai-direct-head">
                <h3>已经有一份试卷？直接跳过去</h3>
                <p>选一份你有权看到的考试或问卷，编辑、答卷 / 批改、报表一步到位。</p>
              </div>
              {!canEnterList ? (
                <p className="ai-note">当前账号没有查看考试列表的权限（project:list），这里不显示直达入口。</p>
              ) : projectsLoading ? (
                <Spin size="small" />
              ) : projects.length === 0 ? (
                <p className="ai-note">还没有可选的考试或问卷。先去「教学」建一份，再回来用 AI 出卷。</p>
              ) : (
                <>
                  <Select
                    className="ai-direct-select"
                    value={pickedId}
                    onChange={(value: string) => setPickedId(value)}
                    options={projects.map((item) => ({
                      value: item.id,
                      label:
                        (item.name || '未命名') + '（' + (item.mode === 'survey' ? '问卷' : '考试') + '）',
                    }))}
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择一份考试或问卷"
                  />
                  <div className="ai-direct-links">
                    {canEditProject && pickedId ? (
                      <Link className="ai-link" to={'/survey/' + pickedId + '/edit'}>
                        编辑 / AI 出卷 →
                      </Link>
                    ) : null}
                    {canListAnswers && pickedId ? (
                      <Link className="ai-link" to={'/survey/' + pickedId + '/data'}>
                        答卷与批改 →
                      </Link>
                    ) : null}
                    {canReport && pickedId ? (
                      <Link className="ai-link" to={'/survey/' + pickedId + '/report'}>
                        报表与学情 →
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </section>

          <section id="get-started" className="ai-section">
            <SectionHead
              index="02"
              title="三步开通"
              desc="模型服务是学校自己准备的（每校一把 Key，平台不承担 token 成本）；配好一次，四个场景共用。"
            />

            <div className="ai-steps">
              <article className="ai-step">
                <span className="ai-step-no">1</span>
                <div className="ai-step-body">
                  <h3 className="ai-step-title">准备一个模型服务</h3>
                  <p>
                    需要一个 OpenAI 兼容的 <code>/chat/completions</code> 接口，记下三样东西：
                  </p>
                  <ul className="ai-list">
                    <li>
                      <strong>Base URL</strong>：通常以 <code>/v1</code> 结尾，例如 <code>https://api.openai.com/v1</code>、
                      <code>https://api.deepseek.com/v1</code>，也可以是自建 one-api / new-api 网关的地址。
                    </li>
                    <li>
                      <strong>API Key</strong>：供应商后台创建，通常形如 <code>sk-…</code>；只填 Key 本身，不要带 Bearer 前缀。
                    </li>
                    <li>
                      <strong>模型名</strong>：和供应商文档一致，例如 <code>deepseek-chat</code>、<code>gpt-4o-mini</code>；
                      出卷 / 改题 / 批改都要求模型能稳定输出 JSON。
                    </li>
                  </ul>
                  <p className="ai-note">
                    服务端会把 Base URL 拼成 <code>&lt;Base URL&gt;/chat/completions</code>；如果填的地址已经以{' '}
                    <code>/chat/completions</code> 结尾就原样使用。地址必须以 http:// 或 https:// 开头。
                  </p>
                </div>
              </article>

              <article className="ai-step">
                <span className="ai-step-no">2</span>
                <div className="ai-step-body">
                  <h3 className="ai-step-title">在系统设置里填上</h3>
                  <p>
                    进入「系统设置 → AI」：打开「启用 AI」，填 API Base URL、API Key，把模型名加到「模型列表」，
                    选择默认模型，保存。
                  </p>
                  <ul className="ai-list">
                    <li>API Key 保存后不回显；留空再保存表示保持原值，不是清空。</li>
                    <li>模型列表可以有多个；没选默认模型时用列表第一个。</li>
                    <li>「系统提示词」选填，会作为 AI 对话的系统角色内容。</li>
                    <li>保存后立即生效，不用重启后端。</li>
                  </ul>
                  {canOpenSettings ? (
                    <Link className="ai-link" to="/system/setting">
                      打开系统设置（AI 页签）
                    </Link>
                  ) : (
                    <p className="ai-note">
                      修改模型配置需要 system:setting:update 或管理员；当前账号没有这个权限，请找管理员代配。
                    </p>
                  )}
                </div>
              </article>

              <article className="ai-step">
                <span className="ai-step-no">3</span>
                <div className="ai-step-body">
                  <h3 className="ai-step-title">给老师开权限，然后试一遍</h3>
                  <p>
                    管理员和老师的预设角色默认带 <code>ai:use</code>；自定义角色要在「系统设置 → 权限配置」的「AI」分组里
                    勾上「使用 AI 助手」，重新登录后生效。
                  </p>
                  <p>
                    最快的验证路径：打开一份考试 → 编辑器「AI 生成试卷」→ 等 30~90 秒 → 在预览里勾题 → 采纳。
                    页面上方的「今日用量」会显示本账号用了多少 token。
                  </p>
                  <p className="ai-note">
                    每人每天有 token 限额（默认 20 万），全站还有总限额（默认 200 万）；同一账号每分钟最多 10 次调用，
                    超了等几秒再试。
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section id="faq" className="ai-section">
            <SectionHead
              index="03"
              title="常见问题"
              desc="按「最常见的先修」排序：权限 → 开关 → Key → 模型 → 地址 → 网络 → 内容校验 → 限额。报错原文都来自系统，直接对照着找。"
            />
            <Collapse
              className="ai-faq"
              items={MODEL_FAQS.map((item) => ({
                key: item.question,
                label: <span className="ai-faq-q">{item.question}</span>,
                children: (
                  <div className="ai-faq-a">
                    <p>
                      <span className="ai-faq-label">原因</span>
                      {item.cause}
                    </p>
                    <p>
                      <span className="ai-faq-label">处理</span>
                      {item.fix}
                    </p>
                  </div>
                ),
              }))}
            />
          </section>

          <McpGuide canManageToken={canManageToken} canOpenSettings={canOpenSettings} />
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn';
  /** 地址 / 令牌这类等宽文本 */
  mono?: boolean;
}) {
  return (
    <div className="ai-status-item">
      <span className="ai-status-label">{label}</span>
      <span
        className={
          'ai-status-value' + (tone ? ' is-' + tone : '') + (mono ? ' is-mono' : '')
        }
        title={mono ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}
