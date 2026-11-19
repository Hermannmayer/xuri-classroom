import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Dropdown, Input, InputNumber, message, Modal, Radio, Space, Spin, Switch, Tabs, Tooltip, Upload } from 'antd';
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BgColorsOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  ImportOutlined,
  PrinterOutlined,
  RedoOutlined,
  RobotOutlined,
  UploadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { get, post, updateProject } from '../../api';
import type { Project, ProjectSetting } from '../../schema/project';
import { DATA_TYPES, type QuestionType, type SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';
import { evaluateVisible } from '../../schema/rules/engine';
import { parseRule } from '../../schema/rules/buildExpression';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../renderer/types';
import AttributePanel from '../../designer/AttributePanel';
import PhonePreview, { DEVICE_H, DEVICE_W } from '../../designer/PhonePreview';
import { GROUP_LABEL, QUESTION_META, createQuestion, createSurvey, newId, normalizeSchema } from '../../designer/defaults';
import { cloneNode, findNode, findParent, flattenOutline, insertNode, moveBefore, moveNode, removeNode, reorderChildren, updateNode, type OutlineItem } from '../../designer/tree';
import { useHistoryState } from '../../designer/useHistory';
import ImportWizard, { type ImportSubmitPayload } from '../import/ImportWizard';
import RichTextEditor from '../../components/RichTextEditor';
import BankPickModal from './BankPickModal';
import AiPaperCheckDrawer from './ai/AiPaperCheckDrawer';
import AiPaperModal from './ai/AiPaperModal';
import AiRewriteDrawer from './ai/AiRewriteDrawer';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import type { ImportFormat } from '../../api/import';

const CONTAINER: Set<QuestionType> = new Set(['Survey', 'QuestionSet', 'Pagination']);

const SCORE_TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多填空',
  Textarea: '简答',
  Select: '下拉',
  HorzBlank: '横向填空',
  Nps: 'NPS',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
};

interface ScoreGroup {
  type: string;
  label: string;
  count: number;
  scores: Set<number>;
}

function collectScoreGroups(root?: SurveySchema): ScoreGroup[] {
  const groups = new Map<string, ScoreGroup>();
  const walk = (nodes?: SurveySchema[]) => {
    for (const node of nodes ?? []) {
      const label = SCORE_TYPE_LABEL[node.type];
      if (label) {
        const group = groups.get(node.type) ?? { type: node.type, label, count: 0, scores: new Set<number>() };
        group.count += 1;
        if (typeof node.attribute?.examScore === 'number') group.scores.add(node.attribute.examScore);
        groups.set(node.type, group);
      }
      walk(node.children);
    }
  };
  walk(root?.children);
  return Array.from(groups.values());
}

/** 左侧 ADD 面板可拖拽的题型集合 */
const PALETTE_TYPES = new Set<QuestionType>(QUESTION_META.map((m) => m.type));

/** 无标题的结构节点在大纲里的显示名 */
const TYPE_LABEL: Partial<Record<QuestionType, string>> = {
  SplitLine: '分割线',
  QuestionSet: '题组',
  Pagination: '分页',
  Survey: '问卷',
};

function OutlineRow({
  item,
  selectedId,
  collapsed,
  hasChildren,
  onToggle,
  onSelect,
  onRemove,
  onMove,
}: {
  item: OutlineItem;
  selectedId?: string;
  collapsed: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const label = item.node.title || TYPE_LABEL[item.node.type] || item.node.type;
  const selected = selectedId === item.id;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(item.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        paddingLeft: 8 + item.depth * 14,
        cursor: 'grab',
        fontSize: 12,
        borderLeft: selected ? '2px solid var(--bp-orange)' : '2px solid transparent',
        background: selected ? 'var(--bp-selected-bg)' : 'transparent',
        color: 'var(--bp-selected-text)',
        touchAction: 'none',
      }}
    >
      <span
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle();
        }}
        style={{ width: 12, fontSize: 10, cursor: hasChildren ? 'pointer' : 'default', color: 'var(--bp-text-soft)' }}
      >
        {hasChildren ? (collapsed ? '▸' : '▾') : ''}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'inline-flex', gap: 3, cursor: 'pointer' }}
      >
        <UpOutlined style={{ fontSize: 10 }} onClick={() => onMove(item.id, -1)} />
        <DownOutlined style={{ fontSize: 10 }} onClick={() => onMove(item.id, 1)} />
        <DeleteOutlined style={{ fontSize: 10 }} onClick={() => onRemove(item.id)} />
      </span>
    </div>
  );
}

/** 大纲：扁平列表 + dnd-kit 同级排序（跨父级拖拽直接忽略，天然避免把节点拖进自己的子树） */
function OutlineList({
  root,
  selectedId,
  onSelect,
  onRemove,
  onMove,
  onReorder,
}: {
  root: SurveySchema;
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReorder: (parentId: string | undefined, from: number, to: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // 渲染用折叠后的列表；排序索引用完整列表，避免折叠状态影响落点
  const allItems = useMemo(() => flattenOutline(root), [root]);
  const items = useMemo(() => flattenOutline(root, collapsed), [root, collapsed]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const toggle = (nodeId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = allItems.find((i) => i.id === active.id);
    const to = allItems.find((i) => i.id === over.id);
    if (!from || !to || from.parentId !== to.parentId) return;
    const siblings = allItems.filter((i) => i.parentId === from.parentId);
    const fromIndex = siblings.findIndex((i) => i.id === active.id);
    const toIndex = siblings.findIndex((i) => i.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(from.parentId, fromIndex, toIndex);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <OutlineRow
            key={item.id}
            item={item}
            selectedId={selectedId}
            collapsed={collapsed.has(item.id)}
            hasChildren={Boolean(item.node.children?.length)}
            onToggle={() => toggle(item.id)}
            onSelect={onSelect}
            onRemove={onRemove}
            onMove={onMove}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export default function SurveyEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  /** ?ai=pick|check|rewrite：对话里的「打开工具」就是靠这个参数把面板直接弹出来的 */
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [setting, setSetting] = useState<ProjectSetting>({});
  const scoringEnabled =
    setting.mode === 'exam' ? setting.examSetting?.scoringEnabled !== false : setting.examSetting?.scoringEnabled === true;
  const { state: survey, set: setSurvey, reset, undo, redo, canUndo, canRedo } = useHistoryState<SurveySchema>(
    createSurvey('未命名'),
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [preview] = useState(false);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragFromRef = useRef<string | undefined>(undefined);
  const dragTypeRef = useRef<QuestionType | undefined>(undefined);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [themeOpen, setThemeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [rightTab, setRightTab] = useState<'quick' | 'question'>('quick');
  const [leftTab, setLeftTab] = useState<'palette' | 'outline' | 'theme'>('palette');
  const [requireOpen, setRequireOpen] = useState(false);
  const [requireSelected, setRequireSelected] = useState<Record<string, boolean>>({});
  const [requireValue, setRequireValue] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const baselineRef = useRef<string>('');
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreSelected, setScoreSelected] = useState<Record<string, boolean>>({});
  const [scoreValue, setScoreValue] = useState(5);
  const [importWhole, setImportWhole] = useState(false);
  const [importFormats, setImportFormats] = useState<ImportFormat[]>(['text', 'excel', 'word']);

  const openImport = (whole: boolean, formats: ImportFormat[]) => {
    setImportWhole(whole);
    setImportFormats(formats);
    setImportOpen(true);
  };

  /** 从题库添加：作为新题组追加到末尾，一次 setSurvey = 一个撤销步 */
  const handleBankPick = (questions: SurveySchema[]) => {
    if (!questions.length) return;
    const group: SurveySchema = {
      id: newId(),
      type: 'QuestionSet',
      title: '从题库添加（' + questions.length + ' 题）',
      attribute: {},
      children: questions.map((question) => ({
        ...question,
        attribute: { ...(question.attribute ?? {}), required: true },
      })),
    };
    setSurvey(insertNode(survey, undefined, group));
    message.success('已添加 ' + questions.length + ' 题，记得保存');
  };
  const [themeText, setThemeText] = useState<{ backgroundImage: string; headerImage: string }>({
    backgroundImage: '',
    headerImage: '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  /* ---- AI 组卷 / 质检 / 改题：入口全部按 ai:use 门控 ---- */
  /** 权限列表：没回来之前不渲染 AI 入口（判定统一走 auth/permissions 的 can()） */
  const [authorities, setAuthorities] = useState<string[]>();
  const [aiOpen, setAiOpen] = useState(false);
  /** 试卷质检抽屉：读的是服务端已保存的卷子 */
  const [aiCheckOpen, setAiCheckOpen] = useState(false);
  /** ?ai= 只处理一次：同一个参数下选来选去不该反复重开面板 */
  const handledAiParamRef = useRef<string | null>(null);
  /** 正在做 AI 优化的题目 id；undefined = 侧栏关着 */
  const [aiRewriteId, setAiRewriteId] = useState<string>();
  /** AI 改题前的题干快照：同一道题只记第一次改之前的样子，「恢复原题干」用它 */
  const [aiBefore, setAiBefore] = useState<Record<string, { title: string; description?: string }>>({});
  /** 选中卡片上「AI 优化」浮标的位置（视口坐标，跟着卡片滚动） */
  const [aiChip, setAiChip] = useState<{ top: number; left: number } | null>(null);

  /**
   * 关掉 AI 面板就把 ?ai= 去掉。
   *
   * 用 replace 而不是 push：参数是「一次性开门指令」，留着会让刷新页面又弹一次，
   * 也会在浏览器后退时莫名重开面板。
   */
  const clearAiParam = useCallback(() => {
    if (!searchParams.has('ai')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('ai');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const uploadThemeImage = async (file: File, key: 'backgroundImage' | 'headerImage') => {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('publicRead', 'true');
      const uploaded = await post<{ id?: string }>('/api/file/create', form);
      if (!uploaded?.id) throw new Error('上传失败：未返回文件 id');
      setThemeText((value) => ({ ...value, [key]: '/api/public/preview/' + uploaded.id }));
      message.success('图片已上传，点右上角「应用」生效');
    } catch (e) {
      message.error((e as Error).message);
    }
    return false;
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<Project>('/api/project', { id })
      .then((p) => {
        if (!alive) return;
        setName(p.name ?? '');
        setSetting(p.setting ?? {});
        reset(p.survey ?? createSurvey(p.name ?? '未命名'));
        baselineRef.current = JSON.stringify({ name: p.name ?? '', survey: p.survey ?? null });
      })
      .catch((e: Error) => message.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, reset]);

  // 选中高亮：渲染器内部不认识 selectedId，渲染后补 class
  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    root.querySelectorAll('[data-qid]').forEach((el) => {
      el.classList.toggle('bp-selected', el.getAttribute('data-qid') === selectedId);
    });
  }, [selectedId, survey, preview]);

  // 选中（尤其从左侧拖入的新题）后滚动到可见
  useEffect(() => {
    if (!selectedId) return;
    const el = canvasRef.current?.querySelector(`[data-qid="${selectedId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  /** 画布内拖拽排序：渲染器不感知 dnd，这里给每个题目节点挂上 draggable */
  useEffect(() => {
    const root = canvasRef.current;
    if (!root || preview) return;
    root.querySelectorAll('[data-qid]').forEach((el) => {
      (el as HTMLElement).draggable = true;
    });
  }, [survey, preview]);

  const dirty = useMemo(
    () => baselineRef.current !== '' && JSON.stringify({ name, survey }) !== baselineRef.current,
    [name, survey],
  );

  const selected = useMemo(() => (selectedId ? findNode(survey, selectedId) : undefined), [survey, selectedId]);

  /**
   * AI 入口的权力判定：没有 ai:use 就完全不渲染（不是灰掉），和权限页同一份数据。
   * 只有数据题（不是分割线 / 说明这类结构节点）才有题干可改。
   */
  const canAi = can(authorities ?? [], PERMISSION_CODES.aiUse);
  const aiTarget = selected && DATA_TYPES.has(selected.type) ? selected : undefined;
  /** 右键菜单里的 AI 入口：同样只认数据题 */
  const contextAiTarget = useMemo(() => {
    if (!contextMenu || !canAi) return undefined;
    const node = findNode(survey, contextMenu.id);
    return node && DATA_TYPES.has(node.type) ? node : undefined;
  }, [contextMenu, canAi, survey]);

  const flatQuestions = useMemo(() => flattenSchema(survey), [survey]);
  /** 题号索引：质检结果里只有题目 id，界面上要显示成「第 N 题」得按当前卷子算 */
  const questionNumberById = useMemo(() => {
    const map = new Map<string, number>();
    for (const question of flatQuestions) {
      if (question.number) map.set(question.id, question.number);
    }
    return map;
  }, [flatQuestions]);
  const scoreGroups = useMemo(() => collectScoreGroups(survey), [survey]);
  const allScoreSelected = scoreGroups.length > 0 && scoreGroups.every((group) => scoreSelected[group.type]);

  useEffect(() => {
    setRightTab(selectedId ? 'question' : 'quick');
  }, [selectedId]);

  // 权限列表：和 Overview / Data 一样，页面自己拉一次
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  /**
   * 选中题目的「AI 优化」浮标。
   *
   * 题目卡片由共享渲染器 SchemaRenderer 画（答题页也在用），不能往里塞编辑器专属按钮；
   * 这里按卡片在视口中的位置放一个 fixed 定位的小按钮，跟着画布滚动/窗口缩放重新贴位。
   */
  useEffect(() => {
    if (!canAi || !aiTarget) {
      setAiChip(null);
      return;
    }
    const canvas = canvasRef.current;
    const el = canvas?.querySelector<HTMLElement>(`[data-qid="${aiTarget.id}"]`);
    if (!canvas || !el) {
      setAiChip(null);
      return;
    }
    const update = () => {
      const rect = el.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      // 卡片滚出画布可视区就收起，别让按钮飘在别的面板上
      if (rect.bottom < canvasRect.top + 4 || rect.top > canvasRect.bottom - 4) {
        setAiChip(null);
        return;
      }
      const next = { top: rect.top + 4, left: Math.max(rect.left + 4, rect.right - 96) };
      setAiChip((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [canAi, aiTarget, survey]);

  /** 快捷设置：立即写 setting，和设置页同一份数据 */
  const patchAnswerSetting = (patch: Record<string, unknown>) => {
    const next = { ...setting, answerSetting: { ...(setting.answerSetting ?? {}), ...patch } };
    setSetting(next);
    void updateProject({ id, setting: next }).catch((e: Error) => message.error(e.message));
  };

  const openScoreModal = () => {
    const next: Record<string, boolean> = {};
    for (const group of scoreGroups) next[group.type] = false;
    setScoreSelected(next);
    setScoreValue(5);
    setScoreOpen(true);
  };

  const quickSwitch = (label: string, checked: boolean | undefined, onChange: (value: boolean) => void) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <Switch size="small" checked={Boolean(checked)} onChange={onChange} />
    </div>
  );

  const openRequireModal = () => {
    const next: Record<string, boolean> = {};
    for (const group of scoreGroups) next[group.type] = false;
    setRequireSelected(next);
    setRequireValue(true);
    setRequireOpen(true);
  };

  const applyRequired = () => {
    const types = Object.keys(requireSelected).filter((type) => requireSelected[type]);
    if (!types.length) {
      message.warning('请至少勾选一种题型');
      return;
    }
    const next = JSON.parse(JSON.stringify(survey)) as SurveySchema;
    const walk = (nodes?: SurveySchema[]) => {
      for (const node of nodes ?? []) {
        if (types.includes(node.type)) {
          node.attribute = { ...(node.attribute ?? {}), required: requireValue };
        }
        walk(node.children);
      }
    };
    walk(next.children);
    setSurvey(next);
    setRequireOpen(false);
    message.success('已批量更新必填状态，记得保存');
  };

  const openAnswerPreview = async () => {
    if (dirty) {
      setSaving(true);
      try {
        await updateProject({ id, name, survey: normalizeSchema(survey), setting });
        baselineRef.current = JSON.stringify({ name, survey });
        message.success('已自动保存');
      } catch (e) {
        message.error('保存失败，无法预览：' + (e as Error).message);
        return;
      } finally {
        setSaving(false);
      }
    }
    setPreviewOpen(true);
  };

  const share = async () => {
    const url = location.origin + '/s/' + id;
    try {
      await navigator.clipboard.writeText(url);
      message.success('答题链接已复制');
    } catch {
      message.info(url);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const nextSetting = { ...setting, status: 1 };
      await updateProject({ id, name, survey: normalizeSchema(survey), setting: nextSetting });
      setSetting(nextSetting);
      baselineRef.current = JSON.stringify({ name, survey });
      message.success('已发布考试');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const applyTypeScores = () => {
    const types = Object.keys(scoreSelected).filter((type) => scoreSelected[type]);
    if (!types.length) {
      message.warning('请至少勾选一种题型');
      return;
    }
    if (!(scoreValue > 0)) {
      message.warning('请输入大于 0 的分值');
      return;
    }
    const next = JSON.parse(JSON.stringify(survey)) as SurveySchema;
    const walk = (nodes?: SurveySchema[]) => {
      for (const node of nodes ?? []) {
        if (types.includes(node.type)) {
          node.attribute = { ...(node.attribute ?? {}), examScore: scoreValue };
        }
        walk(node.children);
      }
    };
    walk(next.children);
    setSurvey(next);
    setScoreOpen(false);
    message.success('已按题型更新分值，记得保存');
  };

  /** 导入落点选择用：当前试卷里的大题 */
  const importGroups = useMemo(
    () =>
      (survey.children ?? [])
        .filter((node) => node.type === 'QuestionSet')
        .map((node) => ({ id: node.id, title: node.title || '未命名题组' })),
    [survey],
  );

  /** 规则条件只能引用当前题之前的题，避免自引用 */
  const candidateQuestions = useMemo(() => {
    if (!selectedId) return [];
    const index = flatQuestions.findIndex((q) => q.id === selectedId);
    return index < 0 ? flatQuestions : flatQuestions.slice(0, index);
  }, [flatQuestions, selectedId]);

  /** 预览态才应用显隐规则；编辑态全部显示，否则隐藏题在设计器里会消失 */
  const displays = useMemo(() => {
    const rules: Record<string, string | undefined> = {};
    const titles: Record<string, string> = {};
    for (const q of flatQuestions) {
      titles[q.id] = q.title;
      if (q.schema.attribute?.visibleRule) rules[q.id] = q.schema.attribute.visibleRule;
    }
    return evaluateVisible(rules, { values, titles });
  }, [flatQuestions, values]);

  const addQuestion = useCallback(
    (type: QuestionType) => {
      const node = createQuestion(type);
      // 选中容器 → 加进去；选中题目 → 加在同级末尾；否则加根末尾
      let parentId: string | undefined;
      if (selectedId) {
        const sel = findNode(survey, selectedId);
        parentId = sel && CONTAINER.has(sel.type) ? sel.id : findParent(survey, selectedId)?.id;
      }
      setSurvey(insertNode(survey, parentId, node));
      setSelectedId(node.id);
    },
    [survey, selectedId, setSurvey],
  );

  const handleRemove = useCallback(
    (nodeId: string) => {
      setSurvey(removeNode(survey, nodeId));
      if (selectedId === nodeId) setSelectedId(undefined);
    },
    [survey, selectedId, setSurvey],
  );

  const handleMove = useCallback(
    (nodeId: string, direction: -1 | 1) => {
      setSurvey(moveNode(survey, nodeId, direction));
    },
    [survey, setSurvey],
  );

  const handleContextAction = (key: string) => {
    const menu = contextMenu;
    if (!menu) return;
    setContextMenu(null);
    const nodeId = menu.id;

    if (key === 'edit') {
      setSelectedId(nodeId);
      return;
    }
    if (key === 'copy') {
      const source = findNode(survey, nodeId);
      if (!source) return;
      const copy = cloneNode(source, newId);
      const parent = findParent(survey, nodeId);
      const index = parent?.children?.findIndex((child) => child.id === nodeId) ?? -1;
      setSurvey(insertNode(survey, parent?.id, copy, index >= 0 ? index + 1 : undefined));
      setSelectedId(copy.id);
      return;
    }
    if (key === 'ai') {
      openAiRewrite(nodeId);
      return;
    }
    if (key === 'up') {
      handleMove(nodeId, -1);
      return;
    }
    if (key === 'down') {
      handleMove(nodeId, 1);
      return;
    }
    if (key === 'delete') {
      Modal.confirm({
        title: '删除这道题？',
        content: '删除后不可恢复。',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => handleRemove(nodeId),
      });
    }
  };

  const patchNode = useCallback(
    (patch: Partial<SurveySchema>) => {
      if (!selectedId) return;
      setSurvey(updateNode(survey, selectedId, patch));
    },
    [survey, selectedId, setSurvey],
  );

  const patchAttribute = useCallback(
    (attributePatch: Record<string, unknown>) => {
      if (!selectedId) return;
      setSurvey(
        updateNode(survey, selectedId, (node) => ({
          attribute: { ...node.attribute, ...attributePatch } as SurveySchema['attribute'],
        })),
      );
    },
    [survey, selectedId, setSurvey],
  );

  /**
   * 保存指定的树。
   *
   * 单独抽出来是因为 setSurvey 是异步的，拿不到下一棵树的 state：
   * 调用方把算好的树传进来，落库和 baseline 都用同一份，避免「保存的是旧的、画布是新的」。
   */
  const persist = async (tree: SurveySchema, hint = '已保存') => {
    setSaving(true);
    try {
      // 保存前补齐 children：后端提交链路会直接取每道题的 children.get(0)
      await updateProject({ id, name, survey: normalizeSchema(tree), setting });
      baselineRef.current = JSON.stringify({ name, survey: tree });
      message.success(hint);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    await persist(survey);
  };

  /**
   * AI 组卷的结果写进画布。
   *
   * 和「从题库添加」一个套路：包成一个题组追加到末尾，一次 setSurvey = 一个撤销步。
   * **不落库**：题目先落在画布上，老师确认后点「保存」才写库（组卷面板里也不写库）。
   */
  const handleAiAdopt = (questions: SurveySchema[]) => {
    if (!questions.length) return;
    const group: SurveySchema = {
      id: newId(),
      type: 'QuestionSet',
      title: 'AI 组卷（' + questions.length + ' 题）',
      attribute: {},
      children: questions.map((question) => ({
        ...question,
        attribute: { ...(question.attribute ?? {}), required: question.attribute?.required ?? true },
      })),
    };
    setSurvey(insertNode(survey, undefined, group));
    setSelectedId(questions[0].id);
    message.success('已写入 ' + questions.length + ' 题，记得保存');
  };

  /**
   * 打开 AI 优化侧栏。
   *
   * 题干随请求带给后端（后端支持可选的 title/type），所以**不用**先保存：
   * 老师刚改完的题干也能立刻让 AI 改。
   */
  const openAiRewrite = (nodeId: string) => {
    if (!findNode(survey, nodeId)) return;
    setAiRewriteId(nodeId);
  };

  /**
   * 打开试卷质检。
   *
   * 体检接口吃的是 projectId，读的是**服务端那份**卷子；画布上没保存的改动不参与。
   * 这里不替老师自动保存（保存是明确动作，不该被看报告顺手触发），只提醒一句。
   */
  const openAiCheck = () => {
    setAiCheckOpen(true);
    if (dirty) message.info('质检读的是已保存的试卷，刚才的改动要先保存才会算进去');
  };

  /** 采纳 AI 建议：只换题干，并把改之前的题干留成快照（同一道题只记第一次，恢复能回到最初） */
  const handleAiRewriteAdopt = (text: string) => {
    const nodeId = aiRewriteId;
    if (!nodeId) return;
    const node = findNode(survey, nodeId);
    if (!node) return;
    setAiBefore((prev) =>
      prev[nodeId] ? prev : { ...prev, [nodeId]: { title: node.title, description: node.description } },
    );
    setSurvey(updateNode(survey, nodeId, () => ({ title: text })));
    if (node.attribute?.richTitle) {
      // AI 只回纯文本：带图的题干换成建议后图片会丢，提醒一句（快照能恢复）
      message.warning('这道题题干里有富文本/图片，换成 AI 建议后图片会丢，需要时点「恢复原题干」');
      return;
    }
    message.success('已换成 AI 建议的题干，原题干已留快照');
  };

  /** 恢复 AI 改之前的题干（也算一个撤销步，手滑还能 Ctrl+Z） */
  const restoreAiBefore = (nodeId: string) => {
    const snapshot = aiBefore[nodeId];
    if (!snapshot) return;
    setSurvey(updateNode(survey, nodeId, () => ({ title: snapshot.title, description: snapshot.description })));
    setAiBefore((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    message.success('已恢复 AI 修改前的题干');
  };

  /**
   * 外部链接直接打开 AI 面板：/survey/:id/edit?ai=pick|check|rewrite。
   *
   * 参数只认一次：同一份卷子里反复点选题目不该把面板重开一遍；
   * 面板关闭时各自调 clearAiParam 把参数摘掉（见下面的 onClose）。
   * canAi 到位之前先按兵不动——权限接口回来后会再跑一次，那时才知道能不能给入口。
   */
  useEffect(() => {
    if (!canAi) return;
    const ai = searchParams.get('ai');
    if (!ai) {
      handledAiParamRef.current = null;
      return;
    }
    if (handledAiParamRef.current === ai) return;
    handledAiParamRef.current = ai;
    if (ai === 'pick') {
      setAiOpen(true);
      return;
    }
    if (ai === 'check') {
      openAiCheck();
      return;
    }
    if (ai === 'rewrite') {
      // 改题必须有题目：URL 里没有题目 id，只能借用当前选中的那道题
      const target = selectedId ? findNode(survey, selectedId) : undefined;
      if (target && DATA_TYPES.has(target.type)) setAiRewriteId(target.id);
      else {
        message.info('先选中一道题，再让 AI 优化题干');
        clearAiParam();
      }
      return;
    }
    // 不认识的取值（老链接、手改的 URL）直接摘掉，别让参数一直挂在地址栏上
    clearAiParam();
    // openAiCheck 每次渲染都是新函数，放进依赖会让整个 effect 空转；它只读 dirty 与 setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAi, searchParams, selectedId, survey, dirty, clearAiParam]);

  // 刷新/关标签页时也拦一下，避免手快丢改动
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/project', { replace: true });
  };

  /** 离开编辑器前先把未保存内容写库；打印页读的是服务端数据，也必须先保存 */
  const leaveTo = async (target?: string) => {
    const action = () => {
      if (target) navigate(target);
      else goBack();
    };
    if (!dirty) {
      action();
      return;
    }
    setSaving(true);
    try {
      await updateProject({ id, name, survey: normalizeSchema(survey), setting });
      baselineRef.current = JSON.stringify({ name, survey });
      message.success('已自动保存');
      action();
    } catch (e) {
      message.error('保存失败，已留在当前页：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** 导入落地：新题组追加到末尾，或并入现有题组；一次 setSurvey = 一个撤销步 */
  const handleImportSubmit = async ({ preview, destination }: ImportSubmitPayload) => {
    const questions = preview.flat as SurveySchema[];
    if (!questions.length) {
      throw new Error('没有可导入的题目');
    }
    if (destination.type === 'whole-paper') {
      const nodes = (preview.tree?.children ?? []) as SurveySchema[];
      let next = survey;
      for (const node of nodes) {
        next = insertNode(next, undefined, node);
      }
      setSurvey(next);
    } else if (destination.type === 'new-group') {
      const group: SurveySchema = {
        id: newId(),
        title: destination.title,
        type: 'QuestionSet',
        attribute: {},
        children: questions,
      };
      setSurvey(insertNode(survey, undefined, group));
    } else if (destination.type === 'existing-group') {
      if (!findNode(survey, destination.groupId)) {
        throw new Error('题组不存在，请刷新后重试');
      }
      setSurvey(
        updateNode(survey, destination.groupId, (node) => ({
          children: [...(node.children ?? []), ...questions],
        })),
      );
    } else {
      throw new Error('请选择导入到哪个题组');
    }
    setSelectedId(questions[0].id);
    message.success('已导入 ' + questions.length + ' 题，共 ' + preview.stats.score + ' 分；记得保存');
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const grouped = ['choice', 'input', 'structure'] as const;

  return (
    // 高度用 dvh：移动端浏览器地址栏收放时 100vh 会把底部内容顶到可视区之外。
    // 手机上的编辑只保证「工具栏能换行、保存点得到、面板不被底栏盖」，不做移动版设计器。
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100dvh - 88px)', minHeight: 0 }}>
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          // 1500px 的工具栏在手机上不换行，保存/发布会被挤到屏幕外
          flexWrap: 'wrap',
          rowGap: 8,
          gap: 12,
          border: '1px solid var(--bp-line)',
          background: 'var(--bp-toolbar)',
          padding: '8px 12px',
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => void leaveTo()} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="borderless"
          style={{ width: 280, fontWeight: 600, letterSpacing: '0.04em' }}
          placeholder="问卷/考试名称"
        />
        <span className="bp-tag">DRAFT</span>
        <Space size={2} style={{ marginLeft: 10 }}>
          <Button size="small" type="text" style={{ background: 'var(--bp-selected-bg)', color: 'var(--bp-selected-text)' }}>
            编辑
          </Button>
          <Button size="small" type="text" onClick={() => void leaveTo('/survey/' + id)}>
            设置
          </Button>
          <Button size="small" type="text" onClick={() => void leaveTo('/survey/' + id + '/report')}>
            统计
          </Button>
          <Button size="small" type="text" onClick={() => void share()}>
            分享
          </Button>
        </Space>
        <div style={{ flex: 1 }} />
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
        </Tooltip>
        <Button icon={<EyeOutlined />} onClick={() => void openAnswerPreview()}>
          预览答题页
        </Button>
        <Button
          icon={<BgColorsOutlined />}
          onClick={() => {
            setThemeText({
              backgroundImage: survey.attribute?.backgroundImage ?? '',
              headerImage: survey.attribute?.headerImage ?? '',
            });
            setThemeOpen(true);
          }}
        >
          主题
        </Button>
        <Button
          icon={<CodeOutlined />}
          onClick={() => {
            setJsonText(JSON.stringify(survey, null, 2));
            setJsonOpen(true);
          }}
        >
          JSON
        </Button>
        {/* AI 入口：没有 ai:use 的老师看不到。组卷 = 从题库抽题；质检 = 体检已保存的这份卷子 */}
        {canAi && (
          <>
            <Button icon={<RobotOutlined />} onClick={() => setAiOpen(true)}>
              AI 组卷
            </Button>
            {/* 按钮名跟「AI 组卷」成套，悬停写清楚它就是文档里的「试卷质检」 */}
            <Tooltip title="试卷质检：查重复题、缺分值、缺答案、难度分布与考点覆盖">
              <Button icon={<AuditOutlined />} onClick={openAiCheck}>
                AI 质检
              </Button>
            </Tooltip>
          </>
        )}
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'bank', label: '从题库抽题' },
              { key: 'whole-word', label: '整份试卷（Word）' },
              { key: 'text', label: '批量导入题目（文本）' },
              { key: 'excel', label: '批量导入题目（Excel）' },
              { key: 'word', label: '批量导入题目（Word）' },
              { key: 'json', label: '从 JSON 导入试卷（保留大题）' },
            ],
            onClick: ({ key }) => {
              if (key === 'bank') setBankOpen(true);
              else if (key === 'whole-word') openImport(true, ['word']);
              else if (key === 'text') openImport(false, ['text']);
              else if (key === 'excel') openImport(false, ['excel']);
              else if (key === 'word') openImport(false, ['word']);
              else if (key === 'json') openImport(true, ['json']);
            },
          }}
        >
          <Button icon={<ImportOutlined />}>
            导入 <DownOutlined />
          </Button>
        </Dropdown>
        <Button icon={<PrinterOutlined />} onClick={() => void leaveTo('/survey/' + id + '/print')}>
          打印
        </Button>
        <Button type="primary" ghost loading={publishing} onClick={publish}>
          {setting.status === 1 ? '已发布' : '发布考试'}
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

      {/* 选中卡片上的「AI 优化」浮标：fixed 定位跟着卡片走，点它不会冒泡到画布（避免触发拖拽/重选） */}
      {canAi && aiChip && aiTarget && (
        <Button
          size="small"
          icon={<ThunderboltOutlined />}
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openAiRewrite(aiTarget.id);
          }}
          style={{
            position: 'fixed',
            top: aiChip.top,
            left: aiChip.left,
            zIndex: 30,
            border: '1px solid var(--bp-line)',
            background: 'var(--bp-panel-strong)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}
        >
          AI 优化
        </Button>
      )}

      <div className="sk-designer" style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 左栏：题型 + 大纲 */}
        <div
          style={{
            width: 220,
            flex: '0 0 220px',
            border: '1px solid var(--bp-line)',
            background: 'var(--bp-panel-strong)',
            overflow: 'auto',
            padding: 10,
          }}
        >
          <Tabs
            size="small"
            activeKey={leftTab}
            onChange={(key) => setLeftTab(key as 'palette' | 'outline' | 'theme')}
            items={[
              {
                key: 'palette',
                label: '题目',
                children: (
                  <div>
                    {grouped.map((group) => (
                      <div key={group} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--bp-hint)', margin: '4px 0' }}>
                          {GROUP_LABEL[group]}
                        </div>
                        <Space wrap size={4}>
                          {QUESTION_META.filter((m) => m.group === group).map((m) => (
                            <Button
                              key={m.type}
                              size="small"
                              draggable
                              onDragStart={(e) => {
                                dragTypeRef.current = m.type;
                                e.dataTransfer.effectAllowed = 'copy';
                                try {
                                  e.dataTransfer.setData('text/plain', m.type);
                                } catch {
                                  /* 某些浏览器限制 setData，忽略 */
                                }
                              }}
                              onDragEnd={() => {
                                dragTypeRef.current = undefined;
                              }}
                              onClick={() => addQuestion(m.type)}
                            >
                              {m.label}
                            </Button>
                          ))}
                        </Space>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'outline',
                label: '大纲',
                children: (
                  <OutlineList
                    root={survey}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onRemove={handleRemove}
                    onMove={handleMove}
                    onReorder={(parentId, from, to) => setSurvey(reorderChildren(survey, parentId, from, to))}
                  />
                ),
              },
              {
                key: 'theme',
                label: '主题',
                children: (
                  <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9 }}>
                    <div>背景图：{survey.attribute?.backgroundImage ? '已设置' : '未设置'}</div>
                    <div>页眉图：{survey.attribute?.headerImage ? '已设置' : '未设置'}</div>
                    {survey.attribute?.headerImage && (
                      <img
                        src={survey.attribute.headerImage}
                        alt="页眉"
                        style={{ width: '100%', maxHeight: 80, objectFit: 'cover', marginTop: 8, border: '1px solid var(--bp-line)' }}
                      />
                    )}
                    <Button
                      block
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        setThemeText({
                          backgroundImage: survey.attribute?.backgroundImage ?? '',
                          headerImage: survey.attribute?.headerImage ?? '',
                        });
                        setThemeOpen(true);
                      }}
                    >
                      打开主题设置
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* 画布 */}
        <Card
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            border: '1px solid var(--bp-line)',
            background: 'rgba(30,58,95,0.45)',
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            ref={canvasRef}
            className="sk-canvas"
            style={{ maxWidth: 760 }}
            onMouseDown={(e) => {
              // 点题目卡片任意区域都先选中，再交给拖拽/输入框处理
              const el = (e.target as HTMLElement).closest('[data-qid]');
              setSelectedId(el ? el.getAttribute('data-qid') ?? undefined : undefined);
            }}
            onClick={(e) => {
              if (dragFromRef.current) return;
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (el) setSelectedId(el.getAttribute('data-qid') ?? undefined);
            }}
            onContextMenu={(e) => {
              // 手机端没有右键菜单
              if (window.matchMedia('(max-width: 767.98px)').matches) return;
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (!el) return;
              e.preventDefault();
              const id = el.getAttribute('data-qid');
              if (id) setContextMenu({ id, x: e.clientX, y: e.clientY });
            }}
            onDragStart={(e) => {
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (!el) return;
              dragTypeRef.current = undefined;
              dragFromRef.current = el.getAttribute('data-qid') ?? undefined;
              e.dataTransfer.effectAllowed = 'move';
              try {
                e.dataTransfer.setData('text/plain', dragFromRef.current ?? '');
              } catch {
                /* 某些浏览器限制 setData，忽略 */
              }
            }}
            onDragOver={(e) => {
              if (
                dragFromRef.current ||
                dragTypeRef.current ||
                e.dataTransfer.types.includes('text/plain')
              ) {
                e.preventDefault();
                e.dataTransfer.dropEffect = dragFromRef.current ? 'move' : 'copy';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              let raw = '';
              try {
                raw = e.dataTransfer.getData('text/plain');
              } catch {
                /* 忽略受限浏览器的 getData */
              }
              const droppedType =
                dragTypeRef.current ??
                (PALETTE_TYPES.has(raw as QuestionType) ? (raw as QuestionType) : undefined);
              const toEl = (e.target as HTMLElement).closest('[data-qid]');
              const to = toEl?.getAttribute('data-qid');
              const from = dragFromRef.current;
              dragFromRef.current = undefined;
              dragTypeRef.current = undefined;

              if (droppedType) {
                const node = createQuestion(droppedType);
                if (to) {
                  const parent = findParent(survey, to);
                  const index = parent?.children?.findIndex((child) => child.id === to) ?? -1;
                  setSurvey(
                    index >= 0
                      ? insertNode(survey, parent?.id, node, index + 1)
                      : insertNode(survey, undefined, node),
                  );
                } else {
                  // 空白处追加到末尾
                  setSurvey(insertNode(survey, undefined, node));
                }
                setSelectedId(node.id);
                return;
              }

              if (to && from && from !== to) setSurvey(moveBefore(survey, from, to));
            }}
            onDragEnd={() => {
              // 拖拽结束后下一帧再清，避免 click 抢在 dragend 之前
              window.setTimeout(() => {
                dragFromRef.current = undefined;
                dragTypeRef.current = undefined;
              }, 0);
            }}
          >
            {survey.children?.length ? (
              <SchemaRenderer
                schema={survey}
                values={values}
                onChange={(qId, v) => setValues((prev) => ({ ...prev, [qId]: v }))}
                mode={preview ? 'preview' : 'edit'}
                displays={preview ? displays : undefined}
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 12 }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>还没有题目</div>
                <div style={{ marginBottom: 14 }}>可以手动添加，也可以把现成的题目文本导进来</div>
                <Space>
                  <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                    导入题目（文本）
                  </Button>
                  <span>或从左侧题型面板点击添加</span>
                </Space>
              </div>
            )}
          </div>
        </Card>

        {/* 右栏：手机预览 + 属性 */}
        <div
          style={{
            width: 340,
            flex: '0 0 340px',
            border: '1px solid var(--bp-line)',
            background: 'var(--bp-panel-strong)',
            overflow: 'auto',
            padding: 12,
          }}
        >
          <Tabs
            size="small"
            activeKey={rightTab}
            onChange={(key) => setRightTab(key as 'quick' | 'question')}
            items={[
              {
                key: 'quick',
                label: '快捷',
                children: (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        color: 'var(--bp-text-soft)',
                        marginBottom: 6,
                      }}
                    >
                      <span>DEVICE / 手机</span>
                      <span style={{ color: 'var(--bp-hint)' }}>
                        {DEVICE_W}×{DEVICE_H}
                      </span>
                    </div>
                    <PhonePreview
                      schema={survey}
                      values={values}
                      onChange={(qId, v) => setValues((prev) => ({ ...prev, [qId]: v }))}
                      displays={displays}
                    />
                    <hr className="bp-dim" style={{ margin: '14px 0 10px' }} />
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
                      显示与答题
                    </div>
                    {quickSwitch('显示题目序号', setting.answerSetting?.questionNumber ?? true, (value) =>
                      patchAnswerSetting({ questionNumber: value }),
                    )}
                    {quickSwitch('显示进度条', setting.answerSetting?.progressBar, (value) =>
                      patchAnswerSetting({ progressBar: value }),
                    )}
                    {quickSwitch('自动暂存', setting.answerSetting?.autoSave, (value) =>
                      patchAnswerSetting({ autoSave: value }),
                    )}
                    {quickSwitch('一页一题', setting.answerSetting?.onePageOneQuestion, (value) =>
                      patchAnswerSetting({ onePageOneQuestion: value }),
                    )}
                    {quickSwitch('显示答题卡', setting.answerSetting?.answerSheetVisible, (value) =>
                      patchAnswerSetting({ answerSheetVisible: value }),
                    )}
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', margin: '10px 0 8px' }}>
                      访问与权限
                    </div>
                    {quickSwitch('需要登录', setting.answerSetting?.loginRequired, (value) =>
                      patchAnswerSetting({ loginRequired: value }),
                    )}
                    <Space orientation="vertical" style={{ width: '100%', marginTop: 10 }}>
                      {scoringEnabled && (
                        <Button block onClick={openScoreModal}>
                          批量设置分值
                        </Button>
                      )}
                      <Button block onClick={openRequireModal}>
                        批量设置必填
                      </Button>
                      <Button block onClick={() => navigate('/survey/' + id)}>
                        查看全部设置
                      </Button>
                      <Button block onClick={() => navigate('/survey/' + id + '/print')}>
                        试卷打印
                      </Button>
                    </Space>
                  </div>
                ),
              },
              {
                key: 'question',
                label: '题目',
                children: selected ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>
                        PROPERTIES / 属性 · {selected.type}
                      </div>
                      {canAi && DATA_TYPES.has(selected.type) && (
                        <Button
                          size="small"
                          type="text"
                          icon={<ThunderboltOutlined />}
                          onClick={() => openAiRewrite(selected.id)}
                        >
                          AI 优化
                        </Button>
                      )}
                    </div>
                    {aiBefore[selected.id] && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 10, alignItems: 'flex-start' }}
                        title={
                          <span style={{ fontSize: 12 }}>这道题的题干被 AI 改过，改之前的样子已留快照</span>
                        }
                        action={
                          <Button size="small" onClick={() => restoreAiBefore(selected.id)}>
                            恢复原题干
                          </Button>
                        }
                      />
                    )}
                    {selected.type === 'Remark' ? (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>
                          说明内容（页面上显示的文字）
                        </div>
                        <RichTextEditor
                          value={String(selected.attribute?.content ?? '')}
                          onChange={(html) => patchAttribute({ content: html })}
                          placeholder="输入这段说明文字，可插入图片"
                          ownerType="project"
                          ownerId={id}
                          questionId={selected.id}
                        />
                        <div style={{ fontSize: 11, color: 'var(--bp-hint)', lineHeight: 1.7, margin: '4px 0 12px' }}>
                          说明题不显示标题，只显示这段内容；图片会跟随本试卷清理。
                        </div>
                      </>
                    ) : selected.type === 'SplitLine' ? (
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
                        分割线没有文字内容，可拖动调整位置。
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>标题</div>
                        {selected.attribute?.richTitle ? (
                          <RichTextEditor
                            value={selected.title}
                            onChange={(html) => patchNode({ title: html })}
                            placeholder="输入题干，可插入图片"
                            minHeight={80}
                            ownerType="project"
                            ownerId={id}
                            questionId={selected.id}
                          />
                        ) : (
                          <Input
                            value={selected.title}
                            onChange={(e) => patchNode({ title: e.target.value })}
                            style={{ marginBottom: 10 }}
                          />
                        )}
                        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', margin: '10px 0 4px' }}>描述</div>
                        <RichTextEditor
                          value={selected.description ?? ''}
                          onChange={(html) => patchNode({ description: html })}
                          placeholder="输入题目描述，可插入图片"
                          ownerType="project"
                          ownerId={id}
                          questionId={selected.id}
                        />
                      </>
                    )}
                    <AttributePanel
                      schema={selected}
                      onChange={patchAttribute}
                      questions={candidateQuestions}
                      onPatchNode={patchNode}
                      scoring={scoringEnabled}
                    />
                  </>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 12 }}>
                    选中一道题查看属性
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* JSON 视图：树结构出问题时的手动兜底 */}
      <Modal
        title="Schema JSON"
        open={jsonOpen}
        width={760}
        okText="应用"
        cancelText="取消"
        onCancel={() => setJsonOpen(false)}
        onOk={() => {
          try {
            const parsed = JSON.parse(jsonText) as SurveySchema;
            if (!parsed || typeof parsed !== 'object' || !parsed.type) throw new Error('缺少 type 字段');
            setSurvey(parsed);
            setSelectedId(undefined);
            setJsonOpen(false);
            message.success('已应用，记得保存');
          } catch (e) {
            message.error(`JSON 不合法：${(e as Error).message}`);
          }
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            直接编辑整棵树（危险操作）：改完点「应用」回到设计器，再点保存才会写库。
          </span>
          <Button
            size="small"
            onClick={() => {
              const blob = new Blob([jsonText], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = (name || '试卷') + '.json';
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            下载 JSON
          </Button>
        </div>
        <Input.TextArea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          autoSize={{ minRows: 18, maxRows: 30 }}
          style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}
        />
      </Modal>

      <Modal
        title="按题型批量设置分值"
        open={scoreOpen}
        onCancel={() => setScoreOpen(false)}
        onOk={applyTypeScores}
        okText="应用设置"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
          勾选题型后输入分值，应用后这些题型的全部题目会统一改分；未勾选的题型保持不变。
        </div>
        <Checkbox
          checked={allScoreSelected}
          indeterminate={!allScoreSelected && scoreGroups.some((group) => scoreSelected[group.type])}
          onChange={(e) => {
            const next: Record<string, boolean> = {};
            for (const group of scoreGroups) next[group.type] = e.target.checked;
            setScoreSelected(next);
          }}
          style={{ marginBottom: 10 }}
        >
          全选
        </Checkbox>
        {scoreGroups.map((group) => (
          <div
            key={group.type}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
          >
            <Checkbox
              checked={Boolean(scoreSelected[group.type])}
              onChange={(e) => setScoreSelected({ ...scoreSelected, [group.type]: e.target.checked })}
            >
              {group.label}（{group.count} 题）
            </Checkbox>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              当前分值：
              {group.scores.size === 0
                ? '未设置'
                : group.scores.size === 1
                  ? Array.from(group.scores)[0]
                  : '混合'}
            </span>
          </div>
        ))}
        {!scoreGroups.length && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>试卷里还没有题目</div>
        )}
        <div style={{ marginTop: 12 }}>
          分值{' '}
          <InputNumber min={0.5} step={0.5} value={scoreValue} onChange={(value) => setScoreValue(Number(value ?? 0))} />
        </div>
      </Modal>

      <Modal
        title="批量设置必填"
        open={requireOpen}
        onCancel={() => setRequireOpen(false)}
        onOk={applyRequired}
        okText="应用设置"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
          勾选题型后统一设置必填状态；未勾选的题型保持不变。
        </div>
        <Checkbox
          checked={scoreGroups.length > 0 && scoreGroups.every((group) => requireSelected[group.type])}
          indeterminate={scoreGroups.some((group) => requireSelected[group.type]) && !scoreGroups.every((group) => requireSelected[group.type])}
          onChange={(e) => {
            const next: Record<string, boolean> = {};
            for (const group of scoreGroups) next[group.type] = e.target.checked;
            setRequireSelected(next);
          }}
          style={{ marginBottom: 10 }}
        >
          全选
        </Checkbox>
        {scoreGroups.map((group) => (
          <div key={group.type} style={{ marginBottom: 8 }}>
            <Checkbox
              checked={Boolean(requireSelected[group.type])}
              onChange={(e) => setRequireSelected({ ...requireSelected, [group.type]: e.target.checked })}
            >
              {group.label}（{group.count} 题）
            </Checkbox>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <Radio.Group value={requireValue} onChange={(e) => setRequireValue(e.target.value)}>
            <Radio value={true}>设为必填</Radio>
            <Radio value={false}>设为非必填</Radio>
          </Radio.Group>
        </div>
      </Modal>

      {/* AI 组卷：预览后才写画布；关闭时摘掉 ?ai=，刷新不会再弹 */}
      {canAi && (
        <AiPaperModal
          open={aiOpen}
          projectId={id}
          onAdopt={handleAiAdopt}
          onClose={() => {
            setAiOpen(false);
            clearAiParam();
          }}
        />
      )}

      {/* AI 质检：只读已保存的卷子；点题号定位复用编辑器自己的选中逻辑 */}
      {canAi && (
        <AiPaperCheckDrawer
          open={aiCheckOpen}
          projectId={id}
          onLocate={(questionId) => setSelectedId(questionId)}
          questionNumberOf={(questionId) => questionNumberById.get(questionId)}
          onClose={() => {
            setAiCheckOpen(false);
            clearAiParam();
          }}
        />
      )}

      {/* AI 改题：采纳后留 before 快照 */}
      {canAi && (
        <AiRewriteDrawer
          open={Boolean(aiRewriteId)}
          projectId={id}
          questionId={aiRewriteId}
          title={aiRewriteId ? findNode(survey, aiRewriteId)?.title : undefined}
          type={aiRewriteId ? findNode(survey, aiRewriteId)?.type : undefined}
          onAdopt={handleAiRewriteAdopt}
          onClose={() => {
            setAiRewriteId(undefined);
            clearAiParam();
          }}
        />
      )}

      <BankPickModal
        open={bankOpen}
        excludeIds={flattenSchema(survey)
          .filter((node) => DATA_TYPES.has(node.type))
          .map((node) => node.id)}
        onClose={() => setBankOpen(false)}
        onPick={handleBankPick}
      />

      <ImportWizard
        open={importOpen}
        target="paper"
        formats={importFormats}
        wholePaper={importWhole}
        groups={importGroups}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImportSubmit}
      />

      {/* 主题 + 逻辑总览 */}
      <Drawer
        title="主题 / 逻辑"
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        size={400}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setSurvey({
                ...survey,
                attribute: {
                  ...survey.attribute,
                  backgroundImage: themeText.backgroundImage || undefined,
                  headerImage: themeText.headerImage || undefined,
                },
              });
              setThemeOpen(false);
              message.success('主题已应用，记得保存');
            }}
          >
            应用
          </Button>
        }
      >
        <Tabs
          items={[
            {
              key: 'theme',
              label: '主题',
              children: (
                <>
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
                    背景图用于答题页整页铺底；页眉图显示在答题页/打印页顶部。可上传，也可直接填 URL。
                  </div>
                  {([
                    { key: 'backgroundImage', label: '背景图', hint: '建议 1920×1080，铺满整页' },
                    { key: 'headerImage', label: '页眉图', hint: '建议 1200×300，显示在顶部' },
                  ] as const).map((item) => (
                    <div key={item.key} style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 11, marginBottom: 6 }}>{item.label}</div>
                      {themeText[item.key] ? (
                        <img
                          src={themeText[item.key]}
                          alt={item.label}
                          style={{
                            width: '100%',
                            maxHeight: 120,
                            objectFit: 'cover',
                            border: '1px solid var(--bp-line)',
                            marginBottom: 8,
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: 64,
                            border: '1px dashed var(--bp-line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            color: 'var(--bp-text-soft)',
                            marginBottom: 8,
                          }}
                        >
                          未设置
                        </div>
                      )}
                      <Space>
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={(file) => uploadThemeImage(file as File, item.key)}
                        >
                          <Button size="small" icon={<UploadOutlined />}>
                            {themeText[item.key] ? '替换' : '上传'}
                          </Button>
                        </Upload>
                        <Button
                          size="small"
                          danger
                          disabled={!themeText[item.key]}
                          onClick={() => setThemeText((value) => ({ ...value, [item.key]: '' }))}
                        >
                          清除
                        </Button>
                      </Space>
                      <Input
                        value={themeText[item.key]}
                        onChange={(e) => setThemeText((value) => ({ ...value, [item.key]: e.target.value }))}
                        placeholder="或直接填图片 URL"
                        style={{ marginTop: 8 }}
                      />
                      <div style={{ fontSize: 10, color: 'var(--bp-text-soft)', marginTop: 4 }}>{item.hint}</div>
                    </div>
                  ))}
                </>
              ),
            },
            {
              key: 'logic',
              label: '逻辑总览',
              children: (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
                    这里是所有配了规则的题目，点一条可以跳到对应题继续编辑。
                  </div>
                  {flatQuestions
                    .filter((q) => {
                      const a = q.schema.attribute;
                      return a?.visibleRule || a?.requiredRule || a?.jumpRule || a?.calculate;
                    })
                    .map((q) => {
                      const a = q.schema.attribute;
                      const label = (qid?: string) => {
                        const hit = flatQuestions.find((x) => x.id === qid);
                        return hit ? `第${hit.number}题` : '?';
                      };
                      const describe = (raw?: string) => {
                        const rule = parseRule(raw);
                        if (!rule || !rule.conditionItem.length) return '未设置';
                        const parts = rule.conditionItem.map(
                          (it) =>
                            `${label(it.qId)} ${it.condition === 'CHECKED' ? '选中' : it.condition === 'UNCHECKED' ? '未选中' : it.condition === 'ANSWERED' ? '已作答' : it.condition === 'NOT_ANSWERED' ? '未作答' : it.condition === 'SHOW' ? '已显示' : it.condition === 'HIDE' ? '未显示' : it.condition === '>' ? '大于' : it.condition === '<' ? '小于' : '等于'} ${it.compare ?? ''}`,
                        );
                        return parts.join(rule.conditionLogic === 'AND' ? ' 且 ' : ' 或 ');
                      };
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setSelectedId(q.id);
                            setThemeOpen(false);
                          }}
                          style={{
                            border: '1px dashed var(--bp-line)',
                            padding: 8,
                            marginBottom: 8,
                            cursor: 'pointer',
                            fontSize: 11,
                            lineHeight: 1.8,
                          }}
                        >
                          <div style={{ fontSize: 12, marginBottom: 2 }}>
                            {q.number}. {q.title || q.type}
                          </div>
                          {a?.visibleRule && <div>显隐：{describe(a.visibleRule)}</div>}
                          {a?.requiredRule && <div>必填：{describe(a.requiredRule)}</div>}
                          {a?.jumpRule && <div style={{ color: 'var(--bp-text-soft)' }}>跳转：{a.jumpRule}</div>}
                          {a?.calculate && <div style={{ color: 'var(--bp-text-soft)' }}>计算：{a.calculate}</div>}
                        </div>
                      );
                    })}
                  {flatQuestions.every((q) => {
                    const a = q.schema.attribute;
                    return !a?.visibleRule && !a?.requiredRule && !a?.jumpRule && !a?.calculate;
                  }) && (
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有任何规则</div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Drawer>

      <Modal
        title="答题页预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="96%"
        styles={{ body: { padding: 0, height: '85vh', overflow: 'hidden' } }}
        destroyOnHidden
      >
        {previewOpen && (
          <iframe
            title="答题页预览"
            // preview=1：让后端放行未发布/未到时间/未分配班级的卷子——
            // 预览只要求「能看」（管理员/所有者/协作者），不要求「能答」。
            // 不带这个参数时，刚建好还没发布的试卷点预览会被「问卷已暂停回收」挡住。
            src={'/s/' + id + '?preview=1'}
            style={{ width: '100%', height: '85vh', border: 0, display: 'block' }}
          />
        )}
      </Modal>

      <Dropdown
        open={Boolean(contextMenu)}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null);
        }}
        trigger={[]}
        menu={{
          items: [
            { key: 'edit', label: '编辑属性', icon: <EditOutlined /> },
            { key: 'copy', label: '复制一份', icon: <CopyOutlined /> },
            ...(contextAiTarget ? [{ key: 'ai', label: 'AI 优化题干', icon: <ThunderboltOutlined /> }] : []),
            { type: 'divider' },
            { key: 'up', label: '上移', icon: <UpOutlined /> },
            { key: 'down', label: '下移', icon: <DownOutlined /> },
            { type: 'divider' },
            { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
          ],
          onClick: ({ key }) => handleContextAction(key),
        }}
      >
        <span
          style={{
            position: 'fixed',
            left: contextMenu?.x ?? 0,
            top: contextMenu?.y ?? 0,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </Dropdown>
    </div>
  );
}
