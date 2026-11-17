import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'antd';
import { CopyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import TableScrollRegion from '../../components/TableScrollRegion';
import { createApiToken, listApiTokens, revokeApiToken } from '../../api/apiToken';
import type { ApiTokenView, CreateApiTokenResult } from '../../api/apiToken';

/**
 * 系统设置 → MCP / API 令牌（P5 · 计划文档 §7.3）。
 *
 * 后端只加了接口，产品上得有个能点的入口，所以放在设置页里当一个 Tab：
 * - 列表只有掩码（前后各 4 位），明文永远拿不回来；
 * - 新建成功后**只弹一次**明文，关掉就没了，只能撤销后重新签发；
 * - 撤销要二次确认，撤销后正在用它的客户端立刻 401。
 *
 * 三个接口都要 system:setting:update：没有权限时这里只显示一句说明、不发请求
 * （设置页对这类账号整体是只读的，见 Setting.tsx 的 canUpdate）。
 *
 * scopes（工具白名单）后端支持但这里不开放编辑：留空 = 按签发用户的权限放行全部工具，
 * 对「管理员给自己配 Claude Desktop」这个主场景足够；真要限制工具，走接口改库更直接。
 */

/** 有效期快捷选项：值是天数；never=永不过期，custom=自己选到分钟 */
const EXPIRE_OPTIONS = [
  { label: '30 天', value: '30' },
  { label: '90 天', value: '90' },
  { label: '180 天', value: '180' },
  { label: '1 年', value: '365' },
  { label: '永不过期', value: 'never' },
  { label: '自定义…', value: 'custom' },
];

const DEFAULT_EXPIRE = '90';

/** 后端时间是 `yyyy-MM-dd HH:mm:ss`（GMT+8）：dayjs 能直接解析，展示到分钟就够 */
const fmt = (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm');

/**
 * 令牌指纹：优先用后端拼好的 maskedToken，只给前后各 4 位时前端补「****」。
 *
 * 这 8 个字符取的是**哈希**的首尾，不是明文片段（表里只有 SHA-256，见 V2.2.5 迁移），
 * 所以它只用来在同一批令牌里区分谁是谁，辨认令牌还得靠名称。
 */
function maskOf(row: ApiTokenView): string {
  if (row.maskedToken) return row.maskedToken;
  const head = row.tokenPrefix ?? '';
  const tail = row.tokenSuffix ?? '';
  if (!head && !tail) return '—';
  return `${head}****${tail}`;
}

/** 状态：撤销 > 过期 > 启用（撤销后即使没到期也不能用，判断顺序不能反） */
function statusOf(row: ApiTokenView): { text: string; color: string } {
  if (row.revoked) return { text: '已撤销', color: 'default' };
  if (row.expiresAt && dayjs(row.expiresAt).isBefore(dayjs())) return { text: '已过期', color: 'warning' };
  return { text: '启用中', color: 'success' };
}

export default function ApiTokenPanel({ canManage }: { canManage: boolean }) {
  const [form] = Form.useForm();
  const [rows, setRows] = useState<ApiTokenView[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expirePreset, setExpirePreset] = useState<string>(DEFAULT_EXPIRE);
  /** 刚签发的结果：token 只在这一份数据里出现，关掉弹窗就清空 */
  const [created, setCreated] = useState<CreateApiTokenResult>();
  const [revokingId, setRevokingId] = useState<string>();

  const load = useCallback(async () => {
    if (!canManage) return; // 没权限不发请求
    setLoading(true);
    try {
      setRows(await listApiTokens());
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    form.resetFields();
    setExpirePreset(DEFAULT_EXPIRE);
    setCreateOpen(true);
  };

  /**
   * 签发：名称必填；有效期按快捷选项折算成具体时间。
   * 「30 天」= 第 30 天的 23:59:59，免得用户以为当天就被停用。
   */
  const submitCreate = async () => {
    let name = '';
    try {
      const v = await form.validateFields(['name']);
      name = String(v.name ?? '').trim();
    } catch {
      return; // 校验提示已经在字段上
    }
    if (!name) return;

    let expiresAt: string | undefined;
    if (expirePreset === 'custom') {
      const picked = form.getFieldValue('customExpiresAt') as Dayjs | undefined;
      if (!picked) {
        message.warning('请选择到期时间，或把有效期改成「永不过期」');
        return;
      }
      expiresAt = picked.format('YYYY-MM-DD HH:mm:ss');
    } else if (expirePreset !== 'never') {
      expiresAt = dayjs().add(Number(expirePreset), 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss');
    }

    setCreating(true);
    try {
      // scopes 不传 = 按签发用户的权限放行全部工具
      const res = await createApiToken({ name, expiresAt });
      setCreated(res);
      setCreateOpen(false);
      form.resetFields();
      setExpirePreset(DEFAULT_EXPIRE);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  /**
   * 复制明文：优先 clipboard（只有 https / localhost 可用）；
   * 非安全上下文或用户拒权时退回 prompt 让用户手抄，避免「点了复制没反应」。
   */
  const copyPlain = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
        return;
      }
    } catch {
      // 落到下面的人工复制
    }
    window.prompt('浏览器不允许自动复制，请手动复制令牌', text);
  };

  const doRevoke = async (row: ApiTokenView) => {
    setRevokingId(row.id);
    try {
      await revokeApiToken(row.id);
      message.success('已撤销：正在使用该令牌的客户端会立刻失去访问权限');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRevokingId(undefined);
    }
  };

  /** 撤销不可恢复，二次确认；确认框里写清「立刻 401、要重建」 */
  const confirmRevoke = (row: ApiTokenView) => {
    Modal.confirm({
      title: `撤销令牌「${row.name || row.id}」？`,
      content: '撤销后正在使用这个令牌的客户端会立刻收到 401，且无法恢复；要继续用只能重新签发一个新令牌。',
      okText: '确认撤销',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => doRevoke(row),
    });
  };

  if (!canManage) {
    return (
      <Alert
        type="info"
        showIcon
        message="你没有管理 MCP / API 令牌的权限"
        description="签发与撤销令牌需要 system:setting:update（管理员默认拥有）；当前账号只能查看系统设置，不能创建或撤销令牌。"
      />
    );
  }

  const plain = created?.token ?? '';

  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 14, lineHeight: 1.8 }}>
        MCP / API 令牌让 Claude Desktop、脚本等外部客户端以<strong>签发用户的身份</strong>调用本站 MCP 服务
        （<code>POST /mcp</code>，请求头 <code>Authorization: Bearer &lt;令牌&gt;</code>）；令牌的权限就是签发用户的权限。
        明文只在签发那一刻显示一次；服务端只存 SHA-256，列表里的「令牌指纹」是<strong>哈希</strong>的首尾各 4 位
        （不是令牌片段），所以建令牌时把名称写清楚，之后靠名称辨认。忘了明文只能撤销后重新签发。
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建令牌
        </Button>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <TableScrollRegion label="MCP / API 令牌列表（可横向滚动）">
        <Table<ApiTokenView>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 880 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有令牌，点「新建令牌」签发一个"
              />
            ),
          }}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              width: 170,
              render: (_: unknown, row: ApiTokenView) => (
                <div>
                  <div style={{ fontSize: 13 }}>{row.name || '未命名'}</div>
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                    {row.scopes ? `白名单：${row.scopes}` : '权限范围：跟随用户'}
                  </div>
                </div>
              ),
            },
            {
              title: '用户',
              key: 'user',
              width: 110,
              render: (_: unknown, row: ApiTokenView) => (
                <span style={{ fontSize: 12 }}>{row.userName || row.userId || '—'}</span>
              ),
            },
            {
              // 显示的是哈希指纹：写清「指纹」避免用户拿它去和手里的 sk_ 明文比对
              title: <span title="服务端只存 SHA-256，这里显示哈希的首尾各 4 位，不是令牌片段">令牌指纹</span>,
              key: 'mask',
              width: 160,
              render: (_: unknown, row: ApiTokenView) => (
                <span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.04em' }}>
                  {maskOf(row)}
                </span>
              ),
            },
            {
              title: '状态',
              key: 'status',
              width: 92,
              render: (_: unknown, row: ApiTokenView) => {
                const s = statusOf(row);
                return <Tag color={s.color}>{s.text}</Tag>;
              },
            },
            {
              title: '过期时间',
              key: 'expiresAt',
              width: 140,
              render: (_: unknown, row: ApiTokenView) =>
                // 不返回 = 永不过期（后端 non_null，不会给 null）
                row.expiresAt ? (
                  <span style={{ fontSize: 12 }}>{fmt(row.expiresAt)}</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>永不过期</span>
                ),
            },
            {
              title: '最近使用',
              key: 'lastUsedAt',
              width: 140,
              render: (_: unknown, row: ApiTokenView) =>
                row.lastUsedAt ? (
                  <span style={{ fontSize: 12 }}>{fmt(row.lastUsedAt)}</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>从未使用</span>
                ),
            },
            {
              title: '操作',
              key: 'action',
              width: 76,
              render: (_: unknown, row: ApiTokenView) => (
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled={row.revoked}
                  loading={revokingId === row.id}
                  onClick={() => confirmRevoke(row)}
                >
                  撤销
                </Button>
              ),
            },
          ]}
        />
      </TableScrollRegion>

      <Modal
        open={createOpen}
        title="新建 MCP / API 令牌"
        okText="签发"
        cancelText="取消"
        confirmLoading={creating}
        onOk={() => void submitCreate()}
        onCancel={() => setCreateOpen(false)}
        // 提前把表单挂上去：否则第一次打开前调 resetFields，useForm 实例还没连上 Form 会告警
        forceRender
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false} style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请输入名称' },
              { max: 100, message: '名称最长 100 个字' },
            ]}
            extra="给用户辨认用，例如「Claude Desktop」「我的脚本」"
          >
            <Input placeholder="例如：Claude Desktop" maxLength={100} allowClear />
          </Form.Item>
          <Form.Item label="有效期" extra="到期后该令牌自动失效，需要重新签发">
            <Select value={expirePreset} onChange={setExpirePreset} options={EXPIRE_OPTIONS} />
          </Form.Item>
          {expirePreset === 'custom' && (
            <Form.Item name="customExpiresAt" label="到期时间" extra="精确到分钟，不能早于今天">
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                disabledDate={(current) => current.isBefore(dayjs().startOf('day'))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={Boolean(created)}
        title="令牌已签发（明文只显示这一次）"
        okText="我已保存，关闭"
        onOk={() => setCreated(undefined)}
        onCancel={() => setCreated(undefined)}
        // 不允许点遮罩 / ESC / 右上角叉关掉：必须点「我已保存」，少一次手滑丢令牌
        closable={false}
        maskClosable={false}
        keyboard={false}
        width={560}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="关掉这个窗口就再也看不到明文了"
          description="请立刻复制并保存到安全的地方。服务端只存 SHA-256 哈希，忘了只能撤销后重新签发；令牌等同于签发用户的权限，泄露请马上回来撤销。"
        />
        {plain ? (
          <>
            <Input.TextArea
              readOnly
              value={plain}
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              onFocus={(e) => e.target.select()}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <Button type="primary" icon={<CopyOutlined />} onClick={() => void copyPlain(plain)}>
                复制令牌
              </Button>
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                {created?.name ? `名称：${created.name} · ` : ''}
                {created?.expiresAt ? `有效期至 ${fmt(created.expiresAt)}` : '永不过期'}
              </span>
            </div>
          </>
        ) : (
          <Alert
            type="error"
            showIcon
            message="服务端没有返回明文"
            description="响应里缺少 token 字段，令牌已经入库但拿不到明文。建议先撤销它，再检查后端 /api/system/api-token 的响应。"
          />
        )}
      </Modal>
    </>
  );
}
