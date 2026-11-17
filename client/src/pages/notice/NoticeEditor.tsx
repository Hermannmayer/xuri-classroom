import { useEffect, useState } from 'react';
import { Alert, App, Button, DatePicker, Drawer, Form, Input, Radio, Select, Switch, TreeSelect } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import RichTextEditor from '../../components/RichTextEditor';
import type { NoticeView } from './types';

/** 受众选项：只给有「管理全站公告」权限的人选（4.4） */
const AUDIENCE_OPTIONS = [
  { value: 'all', label: '全站所有人' },
  { value: 'teacher', label: '仅老师' },
  { value: 'student', label: '仅学员' },
  { value: 'admin', label: '仅管理员' },
];

/** 与后端 ClassNodeView 对齐（选班只用这几项） */
interface ClassTreeNode {
  id: string;
  name?: string;
  /** false = 只是路径祖先（后端为了让树有路径补出来的），点它会 403 */
  accessible?: boolean;
  /** 当前登录人对本班是否有写权限；false 只能看不能发 */
  manageable?: boolean;
  children?: ClassTreeNode[];
}

interface ClassTreeOption {
  value: string;
  title: string;
  children?: ClassTreeOption[];
}

/**
 * 班级候选：只留「可选」的班。
 *
 * <p>accessible=false 是路径祖先、manageable=false 是只读班，两者都不该出现在候选里。
 * 父节点不可选但子节点可选时把子节点提上来（班级树最多两三层，提上来比整棵剪掉强）。
 */
function toClassOptions(nodes: ClassTreeNode[]): ClassTreeOption[] {
  const result: ClassTreeOption[] = [];
  for (const node of nodes) {
    const children = toClassOptions(node.children ?? []);
    if (node.accessible === false || node.manageable === false) {
      result.push(...children);
      continue;
    }
    result.push({
      value: node.id,
      title: node.name || node.id,
      children: children.length ? children : undefined,
    });
  }
  return result;
}

interface NoticeFormValues {
  title: string;
  /** 全站公告的受众：all / admin / teacher / student；班级公告固定 student */
  audience?: string;
  /** 范围：全站 / 指定班级；只有 notice:manage:system 能选 */
  scope?: 'all' | 'class';
  /** 班级 id，scope=class 时必填 */
  classId?: string;
  pinned?: boolean;
  /** 过期时间，留空=长期有效 */
  expireAt?: Dayjs;
}

/** 判断正文是否为空：富文本里全是标签（<p></p>）时也算空 */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 写公告抽屉：标题、富文本正文、受众、选班、置顶、过期时间（实施计划 4.6）。
 *
 * <p>入口只在公告中心里，而且只有 notice:manage:* 才渲染（见 NoticeCenter），
 * 后端还会在 Service 层再校验一次（4.5），前端隐藏按钮不是权限边界。
 *
 * <p>权限与表单的对应关系：
 * - 有 notice:manage:system：范围可选「全站 / 指定班级」，受众可选 all/admin/teacher/student；
 * - 只有 notice:manage:class：范围固定「指定班级」，受众固定 student（4.3：老师公告只发本班学员）。
 *
 * <p>选班的数据来自已有的 /api/teaching/classes/tree（class:list，老师与管理员预设都带），
 * 4.5 没有给公告专用的班级候选接口，这里不新增后端契约。
 */
export default function NoticeEditor({
  open,
  notice,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** 传了就是编辑已有公告，不传是新建 */
  notice?: NoticeView;
  onClose: () => void;
  /** 保存成功后回调：publish=false 表示只存了草稿（父组件会切到「草稿」分类，免得找不到） */
  onSaved: (publish: boolean) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<NoticeFormValues>();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish'>();
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [classOptions, setClassOptions] = useState<ClassTreeOption[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState<string>();

  const canManageSystem = can(authorities, PERMISSION_CODES.noticeManageSystem);
  const canManageClass = can(authorities, PERMISSION_CODES.noticeManageClass);
  /**
   * 当前范围：
   * - 只有班级权限：固定「指定班级」；
   * - 只有全站权限（自定义角色可能这样）：固定「全站」，不然选了班也会被后端 403；
   * - 两个都有：按表单里选的来。
   */
  const watchedScope = Form.useWatch<'all' | 'class' | undefined>('scope', form);
  const scope: 'all' | 'class' = canManageSystem
    ? canManageClass
      ? (watchedScope ?? 'all')
      : 'all'
    : 'class';

  // 权限列表：抽屉打开时才拉，避免每个登录用户都多一次 /api/currentUser
  useEffect(() => {
    if (!open) return;
    void loadAuthorities().then(setAuthorities);
  }, [open]);

  // 每次打开都按「编辑对象」重置：标题/正文/受众/范围/置顶/过期时间
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setContent(notice?.content ?? '');
    form.setFieldsValue({
      title: notice?.title ?? '',
      audience: notice?.audience ?? 'all',
      scope: notice?.scopeType === 'class' ? 'class' : 'all',
      classId: notice?.scopeType === 'class' ? (notice.scopeId ?? undefined) : undefined,
      pinned: Boolean(notice?.pinned),
      expireAt: notice?.expireAt ? dayjs(notice.expireAt) : undefined,
    });
  }, [open, notice, form]);

  // 班级候选：只有需要发班级公告的人才拉；读不到时给提示，但不挡住「全站公告」
  useEffect(() => {
    if (!open || !canManageClass) return;
    let alive = true;
    setClassLoading(true);
    setClassError(undefined);
    get<ClassTreeNode[]>('/api/teaching/classes/tree')
      .then((list) => {
        if (alive) setClassOptions(toClassOptions(Array.isArray(list) ? list : []));
      })
      .catch((e) => {
        if (!alive) return;
        setClassOptions([]);
        setClassError((e as Error).message || '读取班级列表失败');
      })
      .finally(() => {
        if (alive) setClassLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, canManageClass]);

  /**
   * 保存 / 发布。
   *
   * <p>4.5 把 create 与 publish 分成两个接口，后端 create 只落草稿（NoticeServiceImpl#create），
   * 所以「发布」是 create(update) 之后再调一次 publish。publish 对已发布的公告是幂等的
   * （只把状态写回 published、保留首次 publishAt），重复点不会出问题。
   * 万一 create 什么 id 都没回，退化成「已保存为草稿，请到列表里点发布」，不假装发布成功。
   */
  const submit = async (publish: boolean) => {
    let values: NoticeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // 字段上的校验提示已经显示了
    }
    if (scope === 'class' && !values.classId) {
      message.warning('请选择要接收公告的班级');
      return;
    }
    if (!plainText(content)) {
      message.warning('请填写公告正文');
      return;
    }
    if (values.expireAt && values.expireAt.valueOf() <= Date.now()) {
      message.warning('过期时间要晚于当前时间');
      return;
    }
    const classScoped = scope === 'class';
    /**
     * 班级公告的受众：编辑老公告时保留原来的 teacher / student，
     * 别把「仅老师」的班级公告改成「仅学员」；新建时固定 student（4.3：老师公告只发本班学员）。
     */
    const classAudience =
      notice?.scopeType === 'class' && (notice.audience === 'teacher' || notice.audience === 'student')
        ? notice.audience
        : 'student';
    const body = {
      title: values.title.trim(),
      content,
      /**
       * system_update 只能由「检查更新」写入（后端 NoticeServiceImpl#normalizeType 会拒绝人工写），
       * 公告中心也不给系统更新公告提供「编辑」入口；这里只把 notice / ai_result 原样带回。
       */
      type: notice?.type === 'ai_result' ? 'ai_result' : 'notice',
      // 班级公告只用 classAudience；全站公告才用下拉里选的受众
      audience: classScoped ? classAudience : (values.audience || 'all'),
      // scopeType 为 null 表示全站（4.2 建表注释）；显式传 null 才能在「班级公告改成全站」时清掉 scope_id
      scopeType: classScoped ? 'class' : null,
      scopeId: classScoped ? (values.classId ?? null) : null,
      pinned: Boolean(values.pinned),
      // 后端 update 是整行覆盖，不带上 requireAck 会把「要求已读」清成 false
      requireAck: Boolean(notice?.requireAck),
      // expireAt 是 Long（epoch 毫秒）；传 'YYYY-MM-DD HH:mm:ss' 字符串后端直接 400
      expireAt: values.expireAt ? values.expireAt.valueOf() : null,
    };

    setSaving(publish ? 'publish' : 'draft');
    try {
      let id = notice?.id;
      if (id) {
        await post('/api/notice/update', { id, ...body });
      } else {
        // 后端 create 返回 {id}（NoticeApi.java）；兼容只回 id 字符串或什么都不回的实现
        const created = await post<{ id?: string } | string | null>('/api/notice/create', body);
        id = typeof created === 'string' ? created : (created?.id ?? undefined);
      }
      if (publish) {
        if (id) {
          await post('/api/notice/publish', { id });
          message.success(notice ? '已保存并发布' : '公告已发布');
        } else {
          message.info('已保存为草稿：后端没有返回公告 id，请到列表里点「发布」');
        }
      } else if (notice) {
        message.success('已保存');
      } else {
        // 后端 create 只落草稿，默认列表也只回已发布：必须告诉用户去哪找它
        message.success('已保存为草稿，可在「草稿」分类里发布');
      }
      onSaved(publish);
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(undefined);
    }
  };

  return (
    <Drawer
      title={notice ? '编辑公告' : '写公告'}
      open={open}
      onClose={onClose}
      size="min(760px, 96vw)"
      forceRender
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)', flex: 1, minWidth: 180 }}>
            {canManageSystem
              ? '全站公告按受众过滤可见范围；班级公告只有该班师生能看到'
              : '你只有班级公告权限，只能发给自己负责的班'}
          </span>
          <Button onClick={onClose} disabled={Boolean(saving)}>
            取消
          </Button>
          <Button onClick={() => void submit(false)} loading={saving === 'draft'} disabled={Boolean(saving)}>
            保存草稿
          </Button>
          <Button type="primary" onClick={() => void submit(true)} loading={saving === 'publish'} disabled={Boolean(saving)}>
            发布
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" size="small" requiredMark={false} initialValues={{ scope: 'all', pinned: false }}>
        <Form.Item
          name="title"
          label="标题"
          rules={[
            { required: true, message: '请填写公告标题' },
            { max: 200, message: '标题最多 200 字（对应 t_notice.title varchar(200)）' },
          ]}
        >
          <Input placeholder="例如：关于期中考试安排的通知" maxLength={200} showCount />
        </Form.Item>

        {/* 正文不进 Form：RichTextEditor 的 value/onChange 由本地 state 接管，避免受控冲突 */}
        <Form.Item label="正文" required extra="支持富文本与图片；服务端入库前会再白名单消毒一次，脚本类标签会被清掉">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="写公告正文，可插入图片、链接、公式"
            minHeight={180}
          />
        </Form.Item>

        {canManageSystem && (
          <Form.Item name="scope" label="范围" extra="选「指定班级」时只有该班师生能在公告中心看到">
            <Radio.Group>
              <Radio value="all">全站</Radio>
              {/* 没有 notice:manage:class 就不给「指定班级」，否则提交必然 403 */}
              {canManageClass && <Radio value="class">指定班级</Radio>}
            </Radio.Group>
          </Form.Item>
        )}

        {scope === 'class' && (
          <Form.Item
            name="classId"
            label="接收班级"
            required
            rules={[{ required: true, message: '请选择接收公告的班级' }]}
            extra={classError ? undefined : '只列出你有管理权限的班'}
          >
            <TreeSelect
              placeholder={classLoading ? '班级加载中…' : '选择班级'}
              treeData={classOptions}
              loading={classLoading}
              showSearch
              treeNodeFilterProp="title"
              treeDefaultExpandAll
              allowClear
              style={{ width: '100%' }}
              styles={{ popup: { root: { maxHeight: 360, overflow: 'auto' } } }}
            />
          </Form.Item>
        )}

        {scope === 'class' && classError && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            title="读不到班级列表"
            description={`${classError}；请确认 /api/teaching/classes/tree 可用，或联系管理员给账号补上 class:list。`}
          />
        )}

        {scope === 'all' ? (
          <Form.Item name="audience" label="受众" extra="只有对应角色的账号能在公告中心看到这条公告">
            <Select options={AUDIENCE_OPTIONS} />
          </Form.Item>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 18 }}>
            班级公告只发到所选班级：新建时受众固定为学员，编辑时保留原受众；别班看不到。
          </div>
        )}

        <Form.Item name="pinned" label="置顶" valuePropName="checked" extra="置顶公告排在列表最前面，适合开学须知这类常看的内容">
          <Switch checkedChildren="置顶" unCheckedChildren="普通" />
        </Form.Item>

        <Form.Item name="expireAt" label="过期时间" extra="留空表示长期有效；过期后不再出现在公告中心（数据保留，可按需归档）">
          <DatePicker
            showTime
            allowClear
            style={{ width: '100%' }}
            placeholder="选择过期时间（可选）"
            disabledDate={(current) => current.isBefore(dayjs().startOf('day'))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
