import { useMemo, useState } from 'react';
import { Segmented, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import CodeBlock from './CodeBlock';
import SectionHead from './SectionHead';
import TableScrollRegion from '../../components/TableScrollRegion';
import {
  MCP_CLIENTS,
  MCP_PROMPT_EXAMPLE,
  MCP_TOOLS,
  type McpClientKey,
  type McpTool,
} from './content';

/**
 * MCP 接入的三步引导（task-16 第 1 节的第 3 部分）。
 *
 * 结构照卷王：①选客户端 → ②建 Token → ③复制配置片段，外加工具清单与验证 / 安全说明。
 * 页面只负责拼出「当前站点地址 + 令牌占位」的片段，不读、不存令牌——明文只在令牌面板出现一次。
 */
export default function McpGuide({
  canManageToken,
  canOpenSettings,
}: {
  /** system:setting:update：能签发 / 撤销令牌 */
  canManageToken: boolean;
  /** system:role:list：能打开「系统设置」这一页 */
  canOpenSettings: boolean;
}) {
  const [clientKey, setClientKey] = useState<McpClientKey>('generic');
  const mcpUrl = window.location.origin + '/mcp';
  const client = MCP_CLIENTS.find((item) => item.key === clientKey) ?? MCP_CLIENTS[0];
  const snippet = useMemo(() => client.build(mcpUrl), [client, mcpUrl]);
  const curl = useMemo(
    () =>
      [
        'curl -sS -X POST ' + mcpUrl + ' \\',
        '  -H "Authorization: Bearer <token>" \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'',
      ].join('\n'),
    [mcpUrl],
  );

  return (
    <>
      <section id="mcp" className="ai-section">
        <SectionHead
          index="04"
          title="MCP 接入：三步让 AI 客户端连上本站"
          desc="MCP（Model Context Protocol）让 Codex、Cursor、VS Code 里的 AI 直接查考试、读 schema、校验、建改发布、拉报表、发起导出。端点是一个 POST 地址，令牌决定它能做什么。"
        />

        <div className="ai-card ai-endpoint-card">
          <div className="ai-endpoint">
            <span className="ai-endpoint-label">MCP 端点</span>
            <code>{mcpUrl}</code>
          </div>
          <p className="ai-note">
            鉴权走请求头 <code>Authorization: Bearer sk_…</code>；令牌的权限就是签发人的权限，建议用管理员或老师的账号签发。
            目前共 10 个工具（9 类能力，导出拆成「发起 + 查进度」两步）。
          </p>
        </div>

        <div className="ai-steps">
          <article className="ai-step">
            <span className="ai-step-no">1</span>
            <div className="ai-step-body">
              <h3 className="ai-step-title">选客户端</h3>
              <p>不同客户端的配置文件位置和字段名不一样，选你正在用的那个，下面的片段会自动换成对应格式。</p>
              <Segmented
                className="ai-client-switch"
                value={clientKey}
                onChange={(value) => setClientKey(value as McpClientKey)}
                options={MCP_CLIENTS.map((item) => ({ label: item.label, value: item.key }))}
              />
              <div className="ai-client-meta">
                <span>配置文件</span>
                <code>{client.configPath}</code>
              </div>
              <CodeBlock code={snippet} label="mcp 配置片段" language={client.language} />
              <p className="ai-note">{client.hint}</p>
            </div>
          </article>

          <article className="ai-step">
            <span className="ai-step-no">2</span>
            <div className="ai-step-body">
              <h3 className="ai-step-title">建一个令牌</h3>
              <p>
                到「系统设置 → MCP / API 令牌」点「新建令牌」：名称写清用途（例如 Cursor-张三），有效期按需选 30 / 90 / 180 天或永不过期。
              </p>
              <ul className="ai-list">
                <li>
                  明文形如 <code>sk_</code> + 32 位十六进制，<strong>只在创建成功时显示一次</strong>；关掉弹窗就再也拿不到，忘了只能撤销重发。
                </li>
                <li>列表里的「令牌指纹」是哈希的首尾各 4 位，不是令牌片段，辨认令牌靠名称。</li>
                <li>令牌权限跟随签发人；客户端不用了或人员离岗，立刻在同一页撤销，撤销后下一次调用就是 401。</li>
              </ul>
              {canOpenSettings ? (
                <Link className="ai-link" to="/system/setting">
                  打开系统设置（MCP / API 令牌页签）
                </Link>
              ) : (
                <p className="ai-note">当前账号进不了系统设置页（需要 system:role:list）；这一步请管理员操作。</p>
              )}
              {canOpenSettings && !canManageToken ? (
                <p className="ai-note">
                  你能打开设置页，但签发 / 撤销令牌需要 system:setting:update；没有该权限时令牌页只显示一句说明。
                </p>
              ) : null}
            </div>
          </article>

          <article className="ai-step">
            <span className="ai-step-no">3</span>
            <div className="ai-step-body">
              <h3 className="ai-step-title">粘贴配置，让 AI 先自报能力</h3>
              <p>
                把上面的片段存到 <code>{client.configPath}</code>，把 <code>Bearer &lt;token&gt;</code> 里的 <code>&lt;token&gt;</code>{' '}
                换成刚签发的明文，重启或重载客户端。
              </p>
              <div className="ai-prompt-card">
                <div className="ai-subhead">第一次对话：先让它调 sk_capabilities</div>
                <p>把下面这段需求整段发给 AI，它会按「看能力 → 找项目 → 读 schema → 校验 → 写回」的顺序干活：</p>
                <CodeBlock code={MCP_PROMPT_EXAMPLE} label="复制这段需求（把《安全生产培训》换成你的试卷名）" />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="mcp-tools" className="ai-section">
        <SectionHead
          index="05"
          title="能调用的 10 个工具"
          desc="工具名、作用和所需权限都和后端一致。写操作必须带 idempotencyKey：同一个键重复调用只执行一次，第二次直接回放上次结果。"
        />
        <div className="ai-card ai-tool-table">
          <TableScrollRegion label="MCP 工具清单（可横向滚动）">
            <Table<McpTool>
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={MCP_TOOLS}
              scroll={{ x: 720 }}
              columns={[
                {
                  title: '工具',
                  dataIndex: 'name',
                  width: 200,
                  render: (_: unknown, row: McpTool) => (
                    <div>
                      <code className="ai-tool-name">{row.name}</code>
                      <div className="ai-muted">{row.title}</div>
                    </div>
                  ),
                },
                { title: '作用', dataIndex: 'desc' },
                {
                  title: '所需权限',
                  dataIndex: 'permission',
                  width: 160,
                  render: (_: unknown, row: McpTool) => <code className="ai-tool-perm">{row.permission}</code>,
                },
                {
                  title: '类型',
                  dataIndex: 'write',
                  width: 76,
                  render: (_: unknown, row: McpTool) => (row.write ? <Tag color="warning">写</Tag> : <Tag>读</Tag>),
                },
              ]}
            />
          </TableScrollRegion>
        </div>
        <p className="ai-note">
          令牌的 scopes 是工具白名单：为空表示按签发人的权限放行全部工具；后端支持收紧（界面暂未开放编辑）。
          工具白名单外返回 200 + JSON-RPC -32001，不是 401——别把它当成令牌失效。
        </p>
      </section>

      <section id="mcp-verify" className="ai-section">
        <SectionHead
          index="06"
          title="验证与安全"
          desc="客户端配置好之后，先用一条 curl 确认令牌和地址没问题，再看三条红线。"
        />
        <CodeBlock
          code={curl}
          label="curl 验证（Windows 的 PowerShell 5 里请用 curl.exe）"
          language="bash"
        />
        <ul className="ai-list">
          <li>返回 200 且 <code>result.tools</code> 是数组：令牌通，客户端照抄片段即可。</li>
          <li>返回 401 <code>invalid_token</code>：令牌缺失、拼错、已撤销或已过期——重新签发一个。</li>
          <li>返回 JSON-RPC 错误 <code>-32001</code>：令牌白名单里没有这个工具，不是令牌失效，别去重配令牌。</li>
        </ul>
        <div className="ai-card ai-security">
          <div className="ai-subhead">
            <SafetyCertificateOutlined /> 三条红线
          </div>
          <ul className="ai-list">
            <li>
              <strong>一人一令牌</strong>：令牌就是那个人的身份，能读写他全部可见的数据；不要共用、不要转发给外部人员。
            </li>
            <li>
              <strong>明文只出现一次</strong>：服务端只存 SHA-256；别把令牌写进公开仓库、聊天记录或截图。
            </li>
            <li>
              <strong>写操作要幂等键</strong>：建项目、改 schema、发布、发起导出都必须带 idempotencyKey，重试不会重复建卷。
            </li>
          </ul>
          <p className="ai-note">
            客户端报「工具列表为空」时，先确认令牌签发人有没有 project:list 等权限：工具清单按「令牌白名单 ∩ 用户权限」过滤。
          </p>
        </div>
      </section>
    </>
  );
}
