import { Collapse, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { can } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { AI_ENTRY_PATHS } from './constants';
import { CAPABILITIES, MODEL_FAQS } from './content';
import type { Capability } from './content';
import './ai-guide.css';

/** AI 使用说明（可嵌入组件） */
export function AiCapabilityGuide({

  authorities,
}: {
  authorities: string[];
}) {
  const steps = (
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
              质检 / 体检 / 批改都要求模型能稳定输出 JSON。
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
          <h3 className="ai-step-title">就在本页填上</h3>
          <p>
            打开「启用 AI」，填 API Base URL、API Key，把模型名加进「模型列表」并选默认模型，再点下面的「保存」。
          </p>
          <ul className="ai-list">
            <li>API Key 保存后不回显；留空再保存表示保持原值，不是清空。</li>
            <li>模型列表可以有多个；没选默认模型时用列表第一个。</li>
            <li>「系统提示词」选填，会作为 AI 对话的系统角色内容。</li>
            <li>保存后立即生效，不用重启后端；顶部「模型状态」会跟着变。</li>
          </ul>
        </div>
      </article>

      <article className="ai-step">
        <span className="ai-step-no">3</span>
        <div className="ai-step-body">
          <h3 className="ai-step-title">给老师开权限，然后试一遍</h3>
          <p>
            管理员和老师的预设角色默认带 <code>ai:use</code>；自定义角色要在「用户与权限 → 权限配置」的「AI」分组里
            勾上「使用 AI 助手」，让本人重新登录后生效。
          </p>
          <p>
            最快的验证路径：打开一份试卷 → 编辑器工具栏「AI 组卷」或「试卷质检」→ 等十几秒 → 在预览里勾题 → 采纳。
            AI 页签顶部的「今日用量」会显示本账号用了多少 token。
          </p>
          <p className="ai-note">
            每人每天有 token 限额（默认 20 万），全站还有总限额（默认 200 万），都在本页「限额」里调；
            同一账号每分钟最多 10 次调用（防连点），超了等几秒再试。
          </p>
        </div>
      </article>
    </div>
  );

  const quota = (
    <>
      <div className="ai-card">
        <div className="ai-subhead">五个限额分别管什么（可在本页「限额」里改）</div>
        <ul className="ai-list">
          <li>
            <strong>全站每日 token</strong>：默认 200 万，0 表示不限；自然日零点重置，兜住「账单失控」。
          </li>
          <li>
            <strong>单人每日 token</strong>：默认 20 万，0 表示不限；拦住「一个人把全站额度用光」。
          </li>
          <li>
            <strong>一次对话最多几条历史</strong>：默认 20（2–100）；每轮都要把历史重发给模型，条数越多越贵。
          </li>
          <li>
            <strong>单条消息最多多少字</strong>：默认 4000（200–20000）；超长部分会被截断并提示。
          </li>
          <li>
            <strong>每分钟调用几次</strong>：默认 10（1–600）；只挡手抖连点，不是用来控成本的。
          </li>
        </ul>
        <p className="ai-note">
          批改 / 组卷 / 题库体检这类后台任务会一次调用很多次模型，<strong>靠每日 token 限额兜底，不受每分钟限流约束</strong>
          ——否则一次批改 30 份卷子会把自己限死。
        </p>
      </div>
      <div className="ai-card" style={{ marginTop: 10 }}>
        <div className="ai-subhead">没配 Key、一直提示「未配置」时，按这个顺序做</div>
        <ol className="ai-list">
          <li>
            上方「API Base URL」填到能拼出 <code>/chat/completions</code> 的地址，例如{' '}
            <code>https://api.deepseek.com/v1</code>。
          </li>
          <li>
            「API Key」粘贴 Key 本身（不要带 <code>Bearer</code> 前缀），保存后不再回显；要改就重新填一次。
          </li>
          <li>「模型列表」里加上供应商给的模型名，并在「默认模型」里选中它。</li>
          <li>打开「启用 AI」，点本页的「保存」。</li>
          <li>回到 AI 页签顶部看「模型状态」：显示「已就绪」就能用；仍是未配置，按「常见问题」逐条对照。</li>
        </ol>
      </div>
    </>
  );

  const faq = (
    <Collapse
      className="ai-faq"
      size="small"
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
  );

  return (
    <div className="ai-guide">
      <Collapse
        size="small"
        items={[
          {
            key: 'capabilities',
            label: 'AI 能做什么：' + CAPABILITIES.length + ' 项能力的入口',
            children: (
              <>
                <p className="ai-note" style={{ marginTop: 0 }}>
                  每一项都写清了从哪个按钮进、要什么权限、最容易踩的限制；带链接的直接点过去。
                </p>
                <div className="ai-cap-grid">
                  {CAPABILITIES.map((item) => {
                    const link = entryLink(item, authorities);
                    return (
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
                        {link ? (
                          <Link className="ai-link" to={link.to}>
                            {link.label} →
                          </Link>
                        ) : null}
                      </article>
                    );
                  })}
                </div>


                <p className="ai-note">
                  另外还有一条给外部客户端的路：MCP（让 Codex / Cursor / VS Code 里的 AI 直接读写本站）。
                  令牌在「系统与更新 → MCP / API 令牌」里签发，端点是本站的 <code>/mcp</code>，
                  请求头 <code>Authorization: Bearer sk_…</code>；令牌权限跟随签发人。
                </p>
              </>
            ),
          },
          { key: 'get-started', label: '三步开通：配模型 → 开权限 → 试一遍', children: steps },
          { key: 'quota', label: '额度与模型：怎么算、没配好怎么办', children: quota },
          { key: 'faq', label: '常见问题：报错原文对照', children: faq },
        ]}
      />
    </div>
  );
}

export default AiCapabilityGuide;

/** 能力卡片底部的「去…」：先看这条能力落在哪类页面，再按该页面的守卫判权 */
function entryLink(item: Capability, authorities: string[]): { to: string; label: string } | undefined {
  if (!item.target) return undefined;
  if (item.target === 'notice') {

    const allowed =
      can(authorities, PERMISSION_CODES.noticeManageSystem) || can(authorities, PERMISSION_CODES.noticeManageClass);
    return allowed ? { to: AI_ENTRY_PATHS.noticeAdmin, label: '去公告管理' } : undefined;
  }
  if (item.target === 'repo') {
    return can(authorities, PERMISSION_CODES.repoList)
      ? { to: AI_ENTRY_PATHS.repoList, label: '去题库列表选一个' }
      : undefined;
  }
  if (!can(authorities, PERMISSION_CODES.projectList)) return undefined;

  const to = can(authorities, PERMISSION_CODES.portalTeacher)
    ? AI_ENTRY_PATHS.projectList
    : AI_ENTRY_PATHS.projectListShared;
  return { to, label: '去试卷列表选一份' };
}
