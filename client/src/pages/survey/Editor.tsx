import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Input, message, Space, Spin, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { get, updateProject } from '../../api';
import type { Project, ProjectSetting } from '../../schema/project';
import type { QuestionType, SurveySchema } from '../../schema/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../renderer/types';
import AttributePanel from '../../designer/AttributePanel';
import { GROUP_LABEL, QUESTION_META, createQuestion, createSurvey } from '../../designer/defaults';
import { findNode, findParent, insertNode, moveNode, removeNode, updateNode } from '../../designer/tree';
import { useHistoryState } from '../../designer/useHistory';

const CONTAINER: Set<QuestionType> = new Set(['Survey', 'QuestionSet', 'Pagination']);

/** 无标题的结构节点在大纲里的显示名 */
const TYPE_LABEL: Partial<Record<QuestionType, string>> = {
  SplitLine: '分割线',
  QuestionSet: '题组',
  Pagination: '分页',
  Survey: '问卷',
};

function Outline({
  node,
  depth,
  selectedId,
  onSelect,
  onRemove,
  onMove,
}: {
  node: SurveySchema;
  depth: number;
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const isRoot = node.type === 'Survey';
  const label = node.title || TYPE_LABEL[node.type] || node.type;
  return (
    <>
      {!isRoot && (
        <div
          onClick={() => onSelect(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            paddingLeft: 8 + depth * 14,
            cursor: 'pointer',
            fontSize: 12,
            borderLeft: selectedId === node.id ? '2px solid var(--bp-orange)' : '2px solid transparent',
            background: selectedId === node.id ? 'rgba(74,144,217,0.18)' : 'transparent',
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 2 }}>
            <UpOutlined style={{ fontSize: 10 }} onClick={() => onMove(node.id, -1)} />
            <DownOutlined style={{ fontSize: 10 }} onClick={() => onMove(node.id, 1)} />
            <DeleteOutlined style={{ fontSize: 10 }} onClick={() => onRemove(node.id)} />
          </span>
        </div>
      )}
      {node.children?.map((child) => (
        <Outline
          key={child.id}
          node={child}
          depth={isRoot ? depth : depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onRemove={onRemove}
          onMove={onMove}
        />
      ))}
    </>
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

  const selected = useMemo(() => (selectedId ? findNode(survey, selectedId) : undefined), [survey, selectedId]);

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
      await updateProject({ id, name, survey, setting });
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
          background: 'rgba(21,42,68,0.85)',
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
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 左栏：题型 + 大纲 */}
        <div
          style={{
            width: 220,
            flex: '0 0 220px',
            border: '1px solid var(--bp-line)',
            background: 'rgba(21,42,68,0.7)',
            overflow: 'auto',
            padding: 10,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 8 }}>
            ADD / 添加
          </div>
          {grouped.map((group) => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(160,196,232,0.55)', margin: '4px 0' }}>
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
          <Outline
            node={survey}
            depth={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemove}
            onMove={handleMove}
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
              const el = (e.target as HTMLElement).closest('[data-qid]');
              if (el) setSelectedId(el.getAttribute('data-qid') ?? undefined);
            }}
          >
            {survey.children?.length ? (
              <SchemaRenderer
                schema={survey}
                values={values}
                onChange={(qId, v) => setValues((prev) => ({ ...prev, [qId]: v }))}
                mode={preview ? 'preview' : 'edit'}
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 12 }}>
                左侧点一个题型开始，或从大纲里选中题组后添加
              </div>
            )}
          </div>
        </Card>

        {/* 右栏：属性 */}
        <div
          style={{
            width: 300,
            flex: '0 0 300px',
            border: '1px solid var(--bp-line)',
            background: 'rgba(21,42,68,0.7)',
            overflow: 'auto',
            padding: 12,
          }}
        >
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
              <AttributePanel schema={selected} onChange={patchAttribute} />
            </>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--bp-text-soft)', fontSize: 12 }}>
              选中一道题查看属性
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
