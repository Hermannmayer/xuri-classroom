import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Drawer, Input, message, Modal, Space, Spin, Tabs, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  BgColorsOutlined,
  CodeOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { get, updateProject } from '../../api';
import type { Project, ProjectSetting } from '../../schema/project';
import type { QuestionType, SurveySchema } from '../../schema/types';
import { flattenSchema } from '../../schema/flatten';
import { evaluateVisible } from '../../schema/rules/engine';
import { parseRule } from '../../schema/rules/buildExpression';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../renderer/types';
import AttributePanel from '../../designer/AttributePanel';
import PhonePreview, { DEVICE_H, DEVICE_W } from '../../designer/PhonePreview';
import { GROUP_LABEL, QUESTION_META, createQuestion, createSurvey, normalizeSchema } from '../../designer/defaults';
import { findNode, findParent, flattenOutline, insertNode, moveBefore, moveNode, removeNode, reorderChildren, updateNode, type OutlineItem } from '../../designer/tree';
import { useHistoryState } from '../../designer/useHistory';

const CONTAINER: Set<QuestionType> = new Set(['Survey', 'QuestionSet', 'Pagination']);

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
        background: selected ? 'var(--bp-primary-bg)' : 'transparent',
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [setting, setSetting] = useState<ProjectSetting>({});
  const { state: survey, set: setSurvey, reset, undo, redo, canUndo, canRedo } = useHistoryState<SurveySchema>(
    createSurvey('未命名'),
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [preview, setPreview] = useState(false);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragFromRef = useRef<string | undefined>(undefined);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeText, setThemeText] = useState<{ backgroundImage: string; headerImage: string }>({
    backgroundImage: '',
    headerImage: '',
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    get<Project>('/api/project', { id })
      .then((p) => {
        if (!alive) return;
        setName(p.name ?? '');
        setSetting(p.setting ?? {});
        reset(p.survey ?? createSurvey(p.name ?? '未命名'));
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

  /** 画布内拖拽排序：渲染器不感知 dnd，这里给每个题目节点挂上 draggable */
  useEffect(() => {
    const root = canvasRef.current;
    if (!root || preview) return;
    root.querySelectorAll('[data-qid]').forEach((el) => {
      (el as HTMLElement).draggable = true;
    });
  }, [survey, preview]);

  const selected = useMemo(() => (selectedId ? findNode(survey, selectedId) : undefined), [survey, selectedId]);

  const flatQuestions = useMemo(() => flattenSchema(survey), [survey]);

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

  const save = async () => {
    setSaving(true);
    try {
      // 保存前补齐 children：后端提交链路会直接取每道题的 children.get(0)
      await updateProject({ id, name, survey: normalizeSchema(survey), setting });
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 88px)' }}>
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid var(--bp-line)',
          background: 'var(--bp-toolbar)',
          padding: '8px 12px',
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/project')} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="borderless"
          style={{ width: 280, fontWeight: 600, letterSpacing: '0.04em' }}
          placeholder="问卷/考试名称"
        />
        <span className="bp-tag">DRAFT</span>
        <div style={{ flex: 1 }} />
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
        </Tooltip>
        <Button icon={<EyeOutlined />} type={preview ? 'primary' : 'default'} onClick={() => setPreview((p) => !p)}>
          {preview ? '退出预览' : '预览'}
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
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

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
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
            ADD / 添加
          </div>
          {grouped.map((group) => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--bp-hint)', margin: '4px 0' }}>
                {GROUP_LABEL[group]}
              </div>
              <Space wrap size={4}>
                {QUESTION_META.filter((m) => m.group === group).map((m) => (
                  <Button key={m.type} size="small" onClick={() => addQuestion(m.type)}>
                    {m.label}
                  </Button>
                ))}
              </Space>
            </div>
          ))}

          <div
            style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', margin: '14px 0 6px' }}
          >
            OUTLINE / 大纲
          </div>
          <OutlineList
            root={survey}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemove}
            onMove={handleMove}
            onReorder={(parentId, from, to) => setSurvey(reorderChildren(survey, parentId, from, to))}
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
            onClick={(e) => {
              if (dragFromRef.current) return;
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (el) setSelectedId(el.getAttribute('data-qid') ?? undefined);
            }}
            onDragStart={(e) => {
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (!el) return;
              dragFromRef.current = el.getAttribute('data-qid') ?? undefined;
              e.dataTransfer.effectAllowed = 'move';
              try {
                e.dataTransfer.setData('text/plain', dragFromRef.current ?? '');
              } catch {
                /* 某些浏览器限制 setData，忽略 */
              }
            }}
            onDragOver={(e) => {
              if (dragFromRef.current) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragFromRef.current;
              const toEl = (e.target as HTMLElement).closest('[data-qid]');
              const to = toEl?.getAttribute('data-qid');
              dragFromRef.current = undefined;
              if (from && to && from !== to) setSurvey(moveBefore(survey, from, to));
            }}
            onDragEnd={() => {
              // 拖拽结束后下一帧再清，避免 click 抢在 dragend 之前
              window.setTimeout(() => {
                dragFromRef.current = undefined;
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
                左侧点一个题型开始，或从大纲里选中题组后添加
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
          <hr className="bp-dim" style={{ margin: '14px 0 12px' }} />
          {selected ? (
            <>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
                PROPERTIES / 属性 · {selected.type}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>标题</div>
              <Input
                value={selected.title}
                onChange={(e) => patchNode({ title: e.target.value })}
                style={{ marginBottom: 10 }}
              />
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 4 }}>描述</div>
              <Input.TextArea
                value={selected.description ?? ''}
                onChange={(e) => patchNode({ description: e.target.value })}
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginBottom: 12 }}
              />
              <AttributePanel schema={selected} onChange={patchAttribute} questions={candidateQuestions} />
            </>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 12 }}>
              选中一道题查看属性
            </div>
          )}
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
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          直接编辑整棵树（危险操作）：改完点「应用」回到设计器，再点保存才会写库。
        </div>
        <Input.TextArea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          autoSize={{ minRows: 18, maxRows: 30 }}
          style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}
        />
      </Modal>

      {/* 主题 + 逻辑总览 */}
      <Drawer
        title="主题 / 逻辑"
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        width={400}
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
                    填图片 URL，答题页与预览会用它做背景 / 头图；留空即恢复默认蓝图底。
                  </div>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>背景图</div>
                  <Input
                    value={themeText.backgroundImage}
                    onChange={(e) => setThemeText((t) => ({ ...t, backgroundImage: e.target.value }))}
                    placeholder="https://…"
                    style={{ marginBottom: 14 }}
                  />
                  <div style={{ fontSize: 11, marginBottom: 4 }}>头图</div>
                  <Input
                    value={themeText.headerImage}
                    onChange={(e) => setThemeText((t) => ({ ...t, headerImage: e.target.value }))}
                    placeholder="https://…"
                  />
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
    </div>
  );
}
