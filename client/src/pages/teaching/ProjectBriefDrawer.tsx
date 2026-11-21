import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Drawer, Empty, Space, Spin, Tag } from 'antd';
import { BarChartOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { get, getWithPagination } from '../../api';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { can, loadAuthorities } from '../../auth/permissions';
import { flattenSchema } from '../../schema/flatten';
import type { Project } from '../../schema/project';
import type { QuestionType } from '../../schema/types';





type ProjectBrief = Project & { category?: string };


const TYPE_LABELS: Partial<Record<QuestionType, string>> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  MultipleBlank: '多空',
  Textarea: '简答',
  Select: '下拉',
  Cascader: '级联',
  Score: '评分',
  Nps: 'NPS',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixFillBlank: '矩阵填空',
  MatrixAuto: '矩阵自动',
  MatrixScore: '矩阵评分',
  MatrixNps: '矩阵NPS',
  HorzBlank: '横向填空',
  Upload: '上传',
  Signature: '签名',
  User: '人员',
  Dept: '部门',
  Address: '地址',
  Barcode: '条码',
  RichText: '图文',
};

/** 分值可能是 0.5 / 0.25 这种小数，直接展示原值，别四舍五入成整数 */
const fmtScore = (value: number) => String(Math.round(value * 100) / 100);

/** 设置里没填时间 = 不限 */
const fmtTime = (value?: number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '不限');

/**
 * 试卷速览抽屉：在班级资源面板点试卷名打开，先让老师确认「这套卷是不是我要的那套」。
 *
 * <p>数据只走已有的 GET /api/project（project:detail），题量与总分用 flattenSchema
 * 在前端现算，不新增接口。答卷数只能从已有的答卷列表接口拿 total——/api/project
 * 的 total 只有列表接口才回填，详情接口是空的。
 *
 * <p>三个底部操作按权限逐个渲染：没有 project:update 不出现「去编辑」，
 * 没有 answer:list 不出现「看数据」（点进去也会被路由守卫挡回来）。
 */
export default function ProjectBriefDrawer({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
}) {
  const [project, setProject] = useState<ProjectBrief>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [answerTotal, setAnswerTotal] = useState<number>();





  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const canEdit = can(authorities ?? [], PERMISSION_CODES.projectUpdate);
  const canViewAnswers = can(authorities ?? [], PERMISSION_CODES.answerList);


  useEffect(() => {
    if (!open || !projectId) return;
    let alive = true;
    setProject(undefined);
    setError(undefined);
    setAnswerTotal(undefined);
    setLoading(true);
    get<ProjectBrief>('/api/project', { id: projectId })
      .then((detail) => {
        if (alive) setProject(detail);
      })
      .catch((e) => {
        if (alive) setError((e as Error).message || '读取试卷失败');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, projectId]);


  useEffect(() => {
    if (!open || !projectId || !authorities) return;
    if (!canViewAnswers) {
      setAnswerTotal(undefined);
      return;
    }
    let alive = true;

    getWithPagination<unknown>('/api/answer/list', {
      projectId,
      current: 1,
      pageSize: 1,
      includeAnonymous: true,
    })
      .then((res) => {
        if (alive) setAnswerTotal(res.total);
      })
      .catch(() => {

        if (alive) setAnswerTotal(undefined);
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, authorities, canViewAnswers]);

  /** 题量与总分：flattenSchema 内部已按 DATA_TYPES 过滤，拿到的都是会存答案的题 */
  const stats = useMemo(() => {
    const flat = project?.survey ? flattenSchema(project.survey) : [];
    const byType = new Map<QuestionType, number>();
    let scored = 0;
    let score = 0;
    for (const question of flat) {
      byType.set(question.type, (byType.get(question.type) ?? 0) + 1);
      const examScore = question.schema.attribute?.examScore;

      if (typeof examScore === 'number' && examScore > 0) {
        scored += 1;
        score += examScore;
      }
    }
    return { total: flat.length, scored, score, byType: Array.from(byType.entries()) };
  }, [project]);

  const examSetting = project?.setting?.examSetting;
  const submittedSetting = project?.setting?.submittedSetting;

  const published = project?.setting?.status === 1 || project?.status === 1;
  const isExam = project?.mode !== 'survey';
  const maxSubmitMinutes = examSetting?.maxSubmitMinutes ?? 0;
  const windowText =
    examSetting?.startTime || examSetting?.endTime
      ? fmtTime(examSetting?.startTime) + ' ~ ' + fmtTime(examSetting?.endTime)
      : '不限';
  const limitText = maxSubmitMinutes > 0 ? maxSubmitMinutes + ' 分钟' : '不限';

  return (
    <Drawer
      title="试卷速览"
      open={open}
      onClose={onClose}
      size="min(720px, 94vw)"
      destroyOnHidden
      footer={
        project ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              预览答题在新标签打开，未发布的卷也能看
            </span>
            <Space wrap>
              {canEdit && (
                <Link to={'/survey/' + projectId + '/edit'}>
                  <Button type="primary" icon={<EditOutlined />}>
                    去编辑
                  </Button>
                </Link>
              )}
              <Button
                icon={<ExportOutlined />}
                href={'/s/' + projectId + '?preview=1'}
                target="_blank"
                rel="noreferrer"
              >
                预览答题
              </Button>
              {canViewAnswers && (
                <Link to={'/survey/' + projectId + '/data'}>
                  <Button icon={<BarChartOutlined />}>看数据</Button>
                </Link>
              )}
            </Space>
          </Space>
        ) : null
      }
    >
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : error ? (
        <Alert type="error" showIcon title={error} />
      ) : !project ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可预览的试卷" />
      ) : (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="bp-title" style={{ fontSize: 17 }}>
              {project.name || '未命名'}
            </span>
            <Tag>{project.category || '未分类'}</Tag>
            <Tag color={isExam ? 'orange' : 'blue'}>{isExam ? '考试' : '问卷'}</Tag>
            <Tag color={published ? 'success' : 'default'}>{published ? '已发布' : '未发布'}</Tag>
          </div>


          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>计分题 / 总题数</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {stats.scored} / {stats.total}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>总分</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--bp-orange)' }}>
                {fmtScore(stats.score)} 分
              </div>
            </div>
            <div title={canViewAnswers ? undefined : '当前账号没有查看答卷的权限'}>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>答卷</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {answerTotal === undefined ? '—' : answerTotal + ' 份'}
              </div>
            </div>
          </div>


          <div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>题型分布</div>
            {stats.byType.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>这套卷还没有题目</div>
            ) : (
              <Space size={6} wrap>
                {stats.byType.map(([type, count]) => (
                  <Tag key={type}>
                    {TYPE_LABELS[type] ?? type} {count}
                  </Tag>
                ))}
              </Space>
            )}
          </div>


          <div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>设置摘要</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '6px 16px',
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: 'var(--bp-text-soft)' }}>考试窗口</span> {windowText}
              </div>
              <div>
                <span style={{ color: 'var(--bp-text-soft)' }}>限时</span> {limitText}
              </div>
              <div>
                <span style={{ color: 'var(--bp-text-soft)' }}>允许改答案</span>{' '}
                {submittedSetting?.enableUpdate ? '允许' : '不允许'}
              </div>
              <div>
                <span style={{ color: 'var(--bp-text-soft)' }}>成绩单</span>{' '}
                {submittedSetting?.transcriptVisible ? '开放' : '不开放'}
              </div>
            </div>
          </div>
        </Space>
      )}
    </Drawer>
  );
}
