import { useEffect, useState } from 'react';
import { Alert, App, Button, DatePicker, Drawer, Form, Input, Modal, Select, Switch, TreeSelect } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { get, post } from '../../api';
import { draftAiNotice } from '../../api/ai';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import RichTextEditor from '../../components/RichTextEditor';
import { NOTICE_TARGET_LABEL, type NoticeAudienceTarget, type NoticeView } from './types';

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
  /** 班级 id：受众选「指定班级」时必填 */
  classId?: string;
  pinned?: boolean;
  /** 过期时间，留空=长期有效 */
  expireAt?: Dayjs;
}

/**
 * 受众候选：只给「选了不会 403」的项。
 *
 * <p>后端 NoticeServiceImpl#applyRequest 的规则是 scopeType=class 要班级权限（持 notice:manage:system
 * 的人直接放行），其余范围要 notice:manage:system。所以：
 * - 有全站权限：五项都能选，class 表示发给某个班（管理员后端放行）；
 * - 只有班级权限：只能 class —— 给「全站」等于让人选了必然失败。
 */
function availableTargets(canManageSystem: boolean): NoticeAudienceTarget[] {
  return canManageSystem ? ['all', 'admin', 'teacher', 'student', 'class'] : ['class'];
}

/** 编辑已有公告时按原范围回填受众；新建默认全站 */
function initialTarget(notice?: NoticeView): NoticeAudienceTarget {
  if (notice?.scopeType === 'class') return 'class';
  const audience = notice?.audience;
  if (audience === 'admin' || audience === 'teacher' || audience === 'student') return audience;
  return 'all';
}

/** 判断正文是否为空：富文本里全是标签（<p></p>）时也算空 */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 转义 HTML 特殊字符：AI 返回的是纯文本，不转义就会被富文本编辑器当成标签解析 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * AI 返回的正文是纯文本（段落之间用换行；见 AiNoticeDraftView），而编辑器吃 HTML：
 * 空行分段、段内换行转 <br />，先转义再拼标签，保证模型输出里的尖括号只能当文字显示。
 */
function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/**
 * 写公告抽屉：标题、富文本正文、受众、选班、置顶、过期时间（实施计划 4.6）。
 *
 * <p>入口只在公告管理台（/system/notice）里，而且只有 notice:manage:* 才渲染（见 NoticeCenter）；
 * 顶栏铃铛进的只读中心没有这里任何一个写入口。后端还会在 Service 层再校验一次（4.5），
 * 前端隐藏按钮不是权限边界。
 *
 * <p>受众是一个下拉而不是「范围 + 受众」两个控件：对发通知的人来说要决定的只有一件事——发给谁。
 * 五种目标里前四个落到后端 audience 列，class 落到 scopeType=class（见 types.ts 的
 * NoticeAudienceTarget）。只有班级权限的老师只会看到「指定班级」，别让他选了必失败。
 *
 * <p>选班的数据来自已有的 /api/teaching/classes/tree（class:list，老师与管理员预设都带），
 * 4.5 没有给公告专用的班级候选接口，这里不新增后端契约。
 */
export default function NoticeEditor({
  open,
  notice,
  aiEnabled,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** 传了就是编辑已有公告，不传是新建 */
  notice?: NoticeView;
  /** /api/system 的 aiEnabled：明确为 false（系统停用 AI）时连「AI 起草」都不出现 */
  aiEnabled?: boolean;
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
  /** 受众目标：只有全站权限的人能改，没权限时按 class 渲染（见下面的 audienceTarget） */
  const [audience, setAudience] = useState<NoticeAudienceTarget>('all');

  /** AI 起草：要点弹窗、生成中、失败原因、生成后的提醒 */
  const [draftOpen, setDraftOpen] = useState(false);
  const [points, setPoints] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string>();
  const [draftTip, setDraftTip] = useState<string>();

  const canManageSystem = can(authorities, PERMISSION_CODES.noticeManageSystem);
  const canManageClass = can(authorities, PERMISSION_CODES.noticeManageClass);
  /**
   * 「AI 起草」的显示条件：能管公告 + 有 ai:use（/api/ai/notice/draft 的注解要它，
   * 自定义角色可能只有公告权限）+ AI 总开关没关。
   */
  const canDraft =
    (canManageSystem || canManageClass) && can(authorities, PERMISSION_CODES.aiUse) && aiEnabled !== false;

  const targets = availableTargets(canManageSystem);
  const targetOptions = targets.map((value) => ({ value, label: NOTICE_TARGET_LABEL[value] }));
  /**
   * 实际生效的受众：
   * - 有全站权限：按下拉里选的来；
   * - 只有班级权限：恒为 class。表单里的值可能是回填出来的 'all'，
   *   但后端只认 scopeType=class，这里统一按 class 处理，避免提交一个必然 403 的范围。
   */
  const audienceTarget: NoticeAudienceTarget = canManageSystem ? audience : 'class';
  const classScoped = audienceTarget === 'class';

  // 权限列表：抽屉打开时才拉，避免每个登录用户都多一次 /api/currentUser
  useEffect(() => {
    if (!open) return;
    void loadAuthorities().then(setAuthorities);
  }, [open]);

  /**
   * 每次打开都按「编辑对象」重置。
   *
   * <p>这里只依赖 open / notice：把 canManageSystem 也写进依赖的话，权限晚到会再跑一遍，
   * 把用户已经敲进去的标题正文冲掉（受众的实际取值由 audienceTarget 在渲染时收敛）。
   */
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setContent(notice?.content ?? '');
    setAudience(initialTarget(notice));
    // AI 的提醒与错误不跨公告带：上一条的「建议补上考试地点」挂在新公告上会误导人
    setDraftOpen(false);
    setDraftError(undefined);
    setDraftTip(undefined);
    form.setFieldsValue({
      title: notice?.title ?? '',
      classId: notice?.scopeType === 'class' ? (notice.scopeId ?? undefined) : undefined,
      pinned: Boolean(notice?.pinned),
      expireAt: notice?.expireAt ? dayjs(notice.expireAt) : undefined,
    });
  }, [open, notice, form]);

  // 班级候选：只有要发班级公告的人才拉；读不到时给提示，但不挡住「全站公告」
  useEffect(() => {
    if (!open || !classScoped) return;
    // 权限还没回来时 canManageSystem 恒为 false，管理员会被当成「只发班」而白拉一次班级树
    if (authorities.length === 0) return;
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
  }, [open, classScoped, authorities]);

  /**
   * AI 起草：把几句要点补成规范通知，只填进表单，不碰任何写接口。
   *
   * <p>受众跟着表单当前的选择走，模型建议的 audience / classIds 一律不回写——
   * 若模型建议了用户无权发的范围，回写只会立刻换来一个 403。
   * 后端失败时给的是中文原因（例如「只有管理员能给全站发通知」），原样展示在弹窗里。
   */
  const generateDraft = async () => {
    const raw = points.trim();
    if (!raw) {
      setDraftError('先写几句要点，例如「下周三上午 9 点考养老护理员五级，带身份证」');
      return;
    }
    const classId = form.getFieldValue('classId') as string | undefined;
    if (classScoped && !classId) {
      setDraftError('先在表单里选好接收班级，再让 AI 起草');
      return;
    }
    setDrafting(true);
    setDraftError(undefined);
    try {
      const res = await draftAiNotice({
        points: raw,
        // 与保存时同一套口径：班级公告传 class + classIds，其余直接传 audience 枚举值
        audience: classScoped ? 'class' : audienceTarget,
        classIds: classScoped && classId ? [classId] : undefined,
      });
      const title = (res?.title || '').trim();
      const html = plainTextToHtml(res?.content ?? '');
      if (!title && !html) {
        // 模型偶尔只回一句提醒（放在 tip 里）：这时候什么都不填，别把用户已经写好的正文清空
        setDraftError('AI 没有返回可用的标题和正文，换个说法再试一次');
        return;
      }
      if (title) form.setFieldsValue({ title: title.slice(0, 200) });
      if (html) setContent(html);
      setDraftTip((res?.tip || '').trim() || undefined);
      setDraftOpen(false);
      // 只填不发布：这一步之后还得人来核对，再点「发布」
      message.success('已填入标题和正文，核对后再点「发布」');
    } catch (e) {
      setDraftError((e as Error).message || 'AI 起草失败，请稍后再试');
    } finally {
      setDrafting(false);
    }
  };

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
    if (classScoped && !values.classId) {
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
       * 公告管理台也不给系统更新公告提供「编辑」入口；这里只把 notice / ai_result 原样带回。
       */
      type: notice?.type === 'ai_result' ? 'ai_result' : 'notice',
      // 班级公告只用 classAudience；其余目标本身就是 audience 列的值
      audience: classScoped ? classAudience : audienceTarget,
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
      {canDraft && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Button size="small" icon={<RobotOutlined />} onClick={() => { setDraftOpen(true); setDraftError(undefined); }}>
            AI 起草
          </Button>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            写几句要点，AI 补成规范通知；只填进表单，不会直接发出去
          </span>
        </div>
      )}

      {draftTip && (
        <Alert
          type="info"
          showIcon
          title="AI 提醒"
          description={draftTip}
          closable={{ onClose: () => setDraftTip(undefined) }}
          style={{ marginBottom: 12 }}
        />
      )}

      <Form form={form} layout="vertical" size="small" requiredMark={false} initialValues={{ pinned: false }}>
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

        {/* 受众用受控 Select：值取自 audienceTarget，只有班级权限的人只有一个选项且不可改 */}
        <Form.Item
          label="受众"
          extra={
            canManageSystem
              ? '选「指定班级」时只有该班师生能看到；其余按角色过滤'
              : '你只有班级公告权限，只能发给自己负责的班'
          }
        >
          <Select<NoticeAudienceTarget>
            value={audienceTarget}
            options={targetOptions}
            disabled={targets.length <= 1}
            onChange={setAudience}
          />
        </Form.Item>

        {classScoped && (
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

        {classScoped && classError && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            title="读不到班级列表"
            description={`${classError}；请确认 /api/teaching/classes/tree 可用，或联系管理员给账号补上 class:list。`}
          />
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

      <Modal
        title="AI 起草公告"
        open={draftOpen}
        onCancel={() => {
          if (!drafting) setDraftOpen(false);
        }}
        onOk={() => void generateDraft()}
        okText="生成草稿"
        cancelText="取消"
        confirmLoading={drafting}
        width="min(560px, 94vw)"
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 10 }}>
          写几句要点就行：什么时候、什么事、要带什么。生成结果只填进标题与正文，不会直接发布；
          会覆盖当前已填的标题和正文。
        </div>
        <Input.TextArea
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="例如：下周三上午 9 点考养老护理员五级，带身份证，提前 15 分钟到"
          autoSize={{ minRows: 4, maxRows: 8 }}
          maxLength={500}
          showCount
          disabled={drafting}
        />
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 8 }}>
          按「{NOTICE_TARGET_LABEL[audienceTarget]}」的口吻起草
          {classScoped ? '；接收班级以表单里选的为准' : ''}
        </div>
        {draftError && <Alert type="error" showIcon style={{ marginTop: 12 }} title={draftError} />}
      </Modal>
    </Drawer>
  );
}
