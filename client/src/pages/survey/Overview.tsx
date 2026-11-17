import BackButton from '../../components/BackButton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  TreeSelect,
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import QRCode from 'qrcode';
import { get, getWithPagination, updateProject, updateProjectStatus } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type {
  Answer,
  AnswerSetting,
  ExamSetting,
  Project,
  ProjectSetting,
  SubmittedSetting,
} from '../../schema/project';
import PartnerPanel from './PartnerPanel';
import type { SurveySchema } from '../../schema/types';
import { PERMISSION_CODES } from '../../auth/permission-codes';

interface ProjectClassStat {
  classId: string;
  className?: string;
  total: number;
  identified: number;
  anonymous: number;
}

interface ProjectClassAnonymousStats {
  total: number;
  identified: number;
  anonymous: number;
  unassignedAnonymous: number;
  classes: ProjectClassStat[];
}

interface ProjectTreeNode {
  id: string;
  name?: string;
  mode?: string;
  children?: ProjectTreeNode[];
}

interface FolderOption {
  value: string;
  title: string;
  children?: FolderOption[];
}

/** 文件夹候选：只保留 folder；当前项目本身是文件夹时排除它和它的子树 */
function buildFolderOptions(nodes: ProjectTreeNode[], excludeId?: string): FolderOption[] {
  return nodes
    .filter((node) => node.mode === 'folder' && node.id !== excludeId)
    .map((node) => ({
      value: node.id,
      title: node.name || '(未命名文件夹)',
      children: node.children?.length ? buildFolderOptions(node.children, excludeId) : undefined,
    }));
}

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
  MatrixScore: '矩阵评分',
  MatrixFill: '矩阵填空',
  Rate: '评分',
};

interface ScoreGroup {
  type: string;
  label: string;
  count: number;
  scores: Set<number>;
}

function collectScoreGroups(survey?: SurveySchema): ScoreGroup[] {
  const groups = new Map<string, ScoreGroup>();
  const walk = (nodes?: SurveySchema[]) => {
    for (const node of nodes ?? []) {
      const label = SCORE_TYPE_LABEL[node.type];
      if (label) {
        const group = groups.get(node.type) ?? { type: node.type, label, count: 0, scores: new Set<number>() };
        group.count += 1;
        const score = node.attribute?.examScore;
        if (typeof score === 'number') group.scores.add(score);
        groups.set(node.type, group);
      }
      walk(node.children);
    }
  };
  walk(survey?.children);
  return Array.from(groups.values());
}

function applyTypeScores(survey: SurveySchema, scores: Record<string, number | null>): SurveySchema {
  const next = JSON.parse(JSON.stringify(survey)) as SurveySchema;
  const walk = (nodes?: SurveySchema[]) => {
    for (const node of nodes ?? []) {
      const value = scores[node.type];
      if (value != null) {
        node.attribute = { ...(node.attribute ?? {}), examScore: value };
      }
      walk(node.children);
    }
  };
  walk(next.children);
  return next;
}

interface ReportStat {
  min?: number;
  max?: number;
  average?: number;
  sum?: number;
  total?: number;
}
interface ReportData {
  total?: number;
  statistics?: Record<string, ReportStat>;
  dailyCountStat?: Record<string, number>;
}

/**
 * 项目详情（概述）：概览 + 全部发布设置，一页搞定。
 *
 * 原「/survey/:id」(概述) 与「/survey/:id/setting」(发布设置) 已合并：
 * 设置页的所有字段都在这里，保存一次走 POST /api/project/update（整包 setting，
 * 未改字段从已加载 setting 合并保留，不会丢字段）。合并时去掉了三处重复：
 * 1. 「开启收集」(旧概述) 与「发布状态」(旧设置) 是同一个 status → 只留投放与分享里的「发布状态」；
 * 2. 「自动保存」(旧概述) 与「自动暂存」(旧设置) 都是 answerSetting.autoSave → 只留答题显示里的「自动暂存」；
 * 3. 「显示排名」(submittedSetting.rankVisible) 与「交卷后显示排名」(examSetting.rankingEnabled)
 *    是同一件事 → 只留考试控制里的「交卷后显示排名」，保存时两个字段一起写，后端行为不变。
 */
export default function SurveyOverview() {
  const { id = '' } = useParams();
  const [form] = Form.useForm();

  // category 是后端 Project 新增字段，schema 暂未包含，这里用局部交叉类型
  const [project, setProject] = useState<Project & { category?: string }>();
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [folderNodes, setFolderNodes] = useState<ProjectTreeNode[]>([]);
  const [report, setReport] = useState<ReportData>();
  const [classStats, setClassStats] = useState<ProjectClassAnonymousStats>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [qr, setQr] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** 已加载的 setting：保存时用它与表单合并，避免丢掉本页没展示的字段 */
  const [current, setCurrent] = useState<ProjectSetting>({});
  const [scoreDraft, setScoreDraft] = useState<Record<string, number | null>>({});
  const [scoreSaving, setScoreSaving] = useState(false);
  const [targetScore, setTargetScore] = useState(100);
  const [scoreWeights, setScoreWeights] = useState<Record<string, number>>({});
  const targetTouched = useRef(false);

  /**
   * 权限列表：没回来之前既不渲染管理入口，也不发需要权限的请求。
   * 判断统一走 auth/permissions 的 can()，与后端 authorityList 同源。
   */
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const isSurvey = project?.mode === 'survey';
  const scoringEnabled = Form.useWatch('scoringEnabled', form) ?? project?.mode === 'exam';
  const canEdit = can(authorities ?? [], PERMISSION_CODES.projectUpdate);
  const canPublish = can(authorities ?? [], PERMISSION_CODES.projectPublish);
  const canViewAnswers = can(authorities ?? [], PERMISSION_CODES.answerList);
  const canReport = can(authorities ?? [], PERMISSION_CODES.projectReport);
  const canManagePartner = can(authorities ?? [], PERMISSION_CODES.projectPartner);

  const scoreGroups = useMemo(() => collectScoreGroups(project?.survey), [project]);

  useEffect(() => {
    const next: Record<string, number | null> = {};
    const weights: Record<string, number> = {};
    let total = 0;
    let questions = 0;
    for (const group of scoreGroups) {
      const values = Array.from(group.scores);
      const uniform = values.length === 1 ? values[0] : null;
      next[group.type] = uniform;
      weights[group.type] = 1;
      total += (uniform ?? 0) * group.count;
      questions += group.count;
    }
    setScoreDraft(next);
    setScoreWeights((prev) => {
      const merged: Record<string, number> = { ...prev };
      for (const group of scoreGroups) {
        if (merged[group.type] == null) merged[group.type] = weights[group.type] ?? 1;
      }
      return merged;
    });
    if (!targetTouched.current) {
      if (total > 0) setTargetScore(Math.round(total * 100) / 100);
      else if (questions > 0) setTargetScore(100);
    }
  }, [scoreGroups]);

  const scoreQuestions = scoreGroups.reduce((sum, group) => sum + group.count, 0);
  const scoreTotal = scoreGroups.reduce(
    (sum, group) => sum + (Number(scoreDraft[group.type] ?? 0) || 0) * group.count,
    0,
  );
  const averageScore = scoreQuestions ? scoreTotal / scoreQuestions : 0;
  const fmtScore = (value: number) => String(Math.round(value * 100) / 100);

  const allocateByTotal = () => {
    const active = scoreGroups.filter((group) => group.count > 0);
    const weightSum = active.reduce((sum, group) => sum + (Number(scoreWeights[group.type] ?? 0) || 0), 0);
    if (!active.length || weightSum <= 0 || targetScore <= 0) {
      message.warning('请填写整套总分和题型分值比例');
      return;
    }
    const next: Record<string, number | null> = { ...scoreDraft };
    let spent = 0;
    active.forEach((group, index) => {
      const weight = Number(scoreWeights[group.type] ?? 0) || 0;
      const isLast = index === active.length - 1;
      const perQuestion = isLast
        ? (targetScore - spent) / group.count
        : (targetScore * weight) / weightSum / group.count;
      const rounded = Math.max(0.5, Math.round(perQuestion * 100) / 100);
      next[group.type] = rounded;
      spent += rounded * group.count;
    });
    setScoreDraft(next);
    message.success('已按整套总分分配每题分值，点「按题型应用分值」保存');
  };

  const applyScores = async () => {
    if (!project?.survey || !canEdit) return;
    setScoreSaving(true);
    try {
      const next = applyTypeScores(project.survey, scoreDraft);
      await updateProject({ id, survey: next });
      setProject({ ...project, survey: next });
      message.success('已按题型更新分值');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setScoreSaving(false);
    }
  };

  const shareUrl = useMemo(() => `${location.origin}/s/${id}`, [id]);

  const folderOptions = useMemo(
    () => buildFolderOptions(folderNodes, project?.mode === 'folder' ? project.id : undefined),
    [folderNodes, project],
  );

  /** 把后端 setting 铺进表单；「交卷后显示排名」兼容旧数据里只写了 rankVisible 的情况 */
  const applySetting = useCallback(
    (value: ProjectSetting) => {
      setCurrent(value);
      form.setFieldsValue({
        status: value.status === 1,
        scoringEnabled: value.examSetting?.scoringEnabled ?? value.mode === 'exam',
        password: value.answerSetting?.password,
        loginRequired: value.answerSetting?.loginRequired,
        progressBar: value.answerSetting?.progressBar,
        autoSave: value.answerSetting?.autoSave ?? true,
        onePageOneQuestion: value.answerSetting?.onePageOneQuestion,
        answerSheetVisible: value.answerSetting?.answerSheetVisible,
        questionNumber: value.answerSetting?.questionNumber ?? true,
        answererNameRequired: value.answerSetting?.answererNameRequired ?? false,
        copyEnabled: value.answerSetting?.copyEnabled ?? true,
        maxAnswers: value.answerSetting?.maxAnswers,
        ipLimitEnabled: Boolean(value.answerSetting?.ipLimit),
        ipLimitNum: value.answerSetting?.ipLimit?.limitNum,
        ipLimitFreq: value.answerSetting?.ipLimit?.limitFreq,
        deviceLimitEnabled: Boolean(value.answerSetting?.cookieLimit),
        deviceLimitNum: value.answerSetting?.cookieLimit?.limitNum,
        deviceLimitFreq: value.answerSetting?.cookieLimit?.limitFreq,
        endTime: value.answerSetting?.endTime ? dayjs(value.answerSetting.endTime) : undefined,
        enableUpdate: value.submittedSetting?.enableUpdate,
        redirectUrl: value.submittedSetting?.redirectUrl,
        contentHtml: value.submittedSetting?.contentHtml,
        transcriptVisible: value.submittedSetting?.transcriptVisible,
        answerAnalysis: value.submittedSetting?.answerAnalysis,
        examStartTime: value.examSetting?.startTime ? dayjs(value.examSetting.startTime) : undefined,
        examEndTime: value.examSetting?.endTime ? dayjs(value.examSetting.endTime) : undefined,
        minSubmitMinutes: value.examSetting?.minSubmitMinutes,
        maxSubmitMinutes: value.examSetting?.maxSubmitMinutes,
        rankingEnabled: value.examSetting?.rankingEnabled ?? value.submittedSetting?.rankVisible,
        exerciseMode: value.examSetting?.exerciseMode,
        passMode: value.examSetting?.passMode,
        passModePerSeconds: value.examSetting?.passModePerSeconds,
        randomOrder: value.examSetting?.randomOrder,
        randomSurveyWrong: value.examSetting?.randomSurveyWrong,
        maxSwitchScreenTimes: value.examSetting?.maxSwitchScreenTimes,
        favoriteEnabled: value.examSetting?.favoriteEnabled !== false,
      });
    },
    [form],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, setting, r, classStat, list] = await Promise.all([
        get<Project & { category?: string }>('/api/project', { id }),
        get<ProjectSetting>('/api/project/setting', { id }).catch(() => ({}) as ProjectSetting),
        // 没有 project:report 就不请求报表，免得每次都拿一个必 403 的请求去刷错误提示
        canReport
          ? get<ReportData>(`/api/report/${id}`, { includeAnonymous: true }).catch(() => undefined)
          : Promise.resolve(undefined),
        canReport
          ? get<ProjectClassAnonymousStats>('/api/project/class-anonymous-stats', { projectId: id }).catch(() => undefined)
          : Promise.resolve(undefined),
        // 没有 answer:list 就不请求答卷列表
        canViewAnswers
          ? getWithPagination<Answer>('/api/answer/list', {
              projectId: id,
              current: 1,
              pageSize: 5,
              includeAnonymous: true,
            }).catch(() => ({ current: 1, pageSize: 5, total: 0, data: [] as Answer[] }))
          : Promise.resolve({ current: 1, pageSize: 5, total: 0, data: [] as Answer[] }),
      ]);
      setProject(p);
      setReport(r);
      setClassStats(classStat);
      setAnswers(list.data);
      applySetting(setting ?? {});
      // 基本信息不在 setting 里，单独回填；根目录统一为 '0'
      form.setFieldsValue({ name: p.name, category: p.category ?? '', parentId: p.parentId || '0' });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, applySetting, canReport, canViewAnswers, form]);

  useEffect(() => {
    // 等权限落地再发请求：否则会先按「无权限」跑一遍，拿到权限后又跑一遍
    if (authorities) void load();
  }, [authorities, load]);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#ffffff', light: '#1e3a5f' } })
      .then(setQr)
      .catch(() => undefined);
  }, [shareUrl]);

  // 分类候选：可自由输入，拿不到候选项也不影响保存
  // 文件夹候选：失败不影响保存，表单仍可只改名称/分类
  useEffect(() => {
    get<ProjectTreeNode[]>('/api/project/tree')
      .then((list) => setFolderNodes(Array.isArray(list) ? list : []))
      .catch(() => setFolderNodes([]));
  }, []);

  useEffect(() => {
    get<{ name?: string }[]>('/api/project/categories')
      .then((list) =>
        setCategoryOptions(
          (Array.isArray(list) ? list : [])
            .map((item) => (item.name || '').trim())
            .filter((name) => name && name !== '__UNCATEGORIZED__' && name !== '未分类'),
        ),
      )
      .catch(() => setCategoryOptions([]));
  }, []);

  /** 保存后只刷新概览数据（不复位表单，避免把用户刚填的内容刷掉）；没权限的数据源直接跳过 */
  const refreshSummary = async () => {
    const emptyAnswers = { current: 1, pageSize: 5, total: 0, data: [] as Answer[] };
    const [p, r, list] = await Promise.all([
      get<Project>('/api/project', { id }).catch(() => undefined),
      canReport
        ? get<ReportData>(`/api/report/${id}`, { includeAnonymous: true }).catch(() => undefined)
        : Promise.resolve(undefined),
      canViewAnswers
        ? getWithPagination<Answer>('/api/answer/list', {
            projectId: id,
            current: 1,
            pageSize: 5,
            includeAnonymous: true,
          }).catch(() => emptyAnswers)
        : Promise.resolve(emptyAnswers),
    ]);
    if (p) setProject(p);
    setReport(r);
    setAnswers(list.data);
  };

  const onSave = async () => {
    if (!canEdit) return; // 没有 project:update 不渲染保存按钮，这里再兜一层
    let v: Record<string, unknown>;
    try {
      v = await form.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }

    const name = String(v.name ?? '').trim();
    const category = String(v.category ?? '').trim();
    const parentId = String(v.parentId ?? '').trim() || '0';

    const answerSetting: AnswerSetting = {
      ...(current.answerSetting ?? {}),
      password: (v.password as string) || undefined,
      loginRequired: Boolean(v.loginRequired),
      progressBar: Boolean(v.progressBar),
      autoSave: Boolean(v.autoSave),
      onePageOneQuestion: Boolean(v.onePageOneQuestion),
      answerSheetVisible: Boolean(v.answerSheetVisible),
      questionNumber: Boolean(v.questionNumber),
      // 答题人姓名必填：默认 false（匿名投票/问卷强制填姓名会劝退答题人）
      answererNameRequired: Boolean(v.answererNameRequired),
      copyEnabled: Boolean(v.copyEnabled),
      maxAnswers: (v.maxAnswers as number | undefined) ?? undefined,
      // schema 里的 AnswerFreqEnum 只覆盖了部分频率，后端实际存字符串（only/hour/day/week/month）
      ipLimit: v.ipLimitEnabled
        ? {
            limitNum: Number(v.ipLimitNum ?? 1),
            limitFreq: ((v.ipLimitFreq as string | undefined) ?? 'only') as NonNullable<
              AnswerSetting['ipLimit']
            >['limitFreq'],
          }
        : undefined,
      cookieLimit: v.deviceLimitEnabled
        ? {
            limitNum: Number(v.deviceLimitNum ?? 1),
            limitFreq: ((v.deviceLimitFreq as string | undefined) ?? 'only') as NonNullable<
              AnswerSetting['cookieLimit']
            >['limitFreq'],
          }
        : undefined,
      endTime: v.endTime ? (v.endTime as Dayjs).valueOf() : undefined,
    };

    const submittedSetting: SubmittedSetting = {
      ...(current.submittedSetting ?? {}),
      enableUpdate: Boolean(v.enableUpdate),
      redirectUrl: (v.redirectUrl as string) || undefined,
      contentHtml: (v.contentHtml as string) || undefined,
      transcriptVisible: Boolean(v.transcriptVisible),
      // 去重：与「交卷后显示排名」共用同一个开关，两个字段一起写，后端行为不变
      rankVisible: Boolean(v.rankingEnabled),
      answerAnalysis: Boolean(v.answerAnalysis),
    };

    const examSetting: ExamSetting = {
      ...(current.examSetting ?? {}),
      scoringEnabled: Boolean(v.scoringEnabled),
      startTime: v.examStartTime ? (v.examStartTime as Dayjs).valueOf() : undefined,
      endTime: v.examEndTime ? (v.examEndTime as Dayjs).valueOf() : undefined,
      minSubmitMinutes: (v.minSubmitMinutes as number) ?? undefined,
      maxSubmitMinutes: (v.maxSubmitMinutes as number) ?? undefined,
      rankingEnabled: Boolean(v.rankingEnabled),
      exerciseMode: Boolean(v.exerciseMode),
      passMode: Boolean(v.passMode),
      passModePerSeconds: (v.passModePerSeconds as number) ?? undefined,
      randomOrder: Boolean(v.randomOrder),
      randomSurveyWrong: Boolean(v.randomSurveyWrong),
      maxSwitchScreenTimes: (v.maxSwitchScreenTimes as number) ?? undefined,
      favoriteEnabled: v.favoriteEnabled !== false,
    };

    const setting: ProjectSetting = {
      ...current,
      // 没有 project:publish 时不提交 status：整包保存不能顺手把发布开关写回 0
      ...(canPublish ? { status: v.status ? 1 : 0 } : {}),
      answerSetting,
      submittedSetting,
      examSetting,
    };

    setSaving(true);
    try {
      // 分类空串=清空（未分类）；parentId '0'=根目录；名称在本页可编辑，一并保存
      await updateProject({ id, name, category, parentId, setting });
      // 发布开关走独立端点 POST /api/project/status（project:publish）；
      // 整包 setting 不会同步 t_project.status 列，所以状态变了要单独补一次。
      // 没有 project:publish 的人不碰这个端点，状态保持后端原值。
      const nextStatus = v.status ? 1 : 0;
      if (canPublish && (current.status ?? 0) !== nextStatus) {
        await updateProjectStatus({ id, status: nextStatus });
      }
      setCurrent(setting);
      message.success('已保存');
      await refreshSummary();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const daily = useMemo(() => {
    const entries = Object.entries(report?.dailyCountStat ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return { entries, max: Math.max(1, ...entries.map(([, v]) => v)) };
  }, [report]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const published = project?.setting?.status === 1 || project?.status === 1;
  const answerTotal = report?.total ?? 0;

  const cardTitle = (en: string, cn: string) => (
    <span className="bp-title" style={{ fontSize: 12 }}>
      {en} / {cn}
    </span>
  );

  const switchItem = (name: string, label: string, extra?: string) => (
    <Col xs={24} md={12} key={name}>
      <Form.Item name={name} label={label} valuePropName="checked" extra={extra}>
        <Switch />
      </Form.Item>
    </Col>
  );

  const limitFreqOptions = [
    { value: 'only', label: '仅一次' },
    { value: 'hour', label: '每小时' },
    { value: 'day', label: '每天' },
    { value: 'week', label: '每周' },
    { value: 'month', label: '每月' },
  ];

  return (
    <div className="survey-overview" style={{ maxWidth: 1200 }}>
      {/* 统一本页 Form.Item 间距：左右两列标签/控件节奏一致，避免一张卡松一张卡紧 */}
      <style>{'.survey-overview .ant-form-item{margin-bottom:14px}'}</style>
      <BackButton label="返回上一级" fallback="/project" style={{ marginBottom: 4 }} />
      {/* 页头：编辑 / 数据 / 项目列表 + 保存（发布设置已并入本页，不再有第二个「设置」入口） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>OVERVIEW / 概述</div>
          <div className="bp-title" style={{ fontSize: 17, marginTop: 4 }}>
            {project?.name || '未命名'}
          </div>
        </div>
        <Tag color={published ? 'success' : 'default'} style={{ marginLeft: 4 }}>
          {published ? '收集中' : '未发布'}
        </Tag>
        <Tag>{project?.mode === 'exam' ? '考试' : '问卷'}</Tag>
        <div style={{ flex: 1 }} />
        {canEdit && (
          <Link to={`/survey/${id}/edit`}>
            <Button icon={<EditOutlined />}>编辑</Button>
          </Link>
        )}
        {canViewAnswers && (
          <Link to={`/survey/${id}/data`}>
            <Button>数据</Button>
          </Link>
        )}
        {canEdit && (
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void onSave()}>
            保存
          </Button>
        )}
      </div>

      {isSurvey && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          message={scoringEnabled ? '当前是问卷模式：已启用计分，可显示成绩单和正确率' : '当前是问卷模式：不判分，不显示成绩单、排名和答案解析'}
          description="用「回收限制」控制收集范围与截止时间；用「答题显示」控制填写体验。需要完整考试控制请新建考试项目。"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="small"
        disabled={!canEdit}
        initialValues={{ progressBar: true, autoSave: true }}
      >
        <Row gutter={[14, 14]} align="stretch">
          {/* ① 基本信息：名称 + 分类（分类不再只藏在列表里） */}
          <Col xs={24} lg={16}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('BASIC', '基本信息')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label="项目名称"
                    rules={[{ required: true, whitespace: true, message: '请填写项目名称' }]}
                  >
                    <Input maxLength={120} placeholder="例如：2026 年第一季度安全培训考试" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="category" label="分类" extra="可自由输入；留空表示未分类">
                    <AutoComplete
                      allowClear
                      placeholder="例如：保育员 / 养老护理员 / 育婴员"
                      options={categoryOptions.map((name) => ({ value: name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="parentId"
                    label="所属文件夹"
                    extra="留空/根目录表示最外层；不能选自己或自己的子文件夹"
                  >
                    <TreeSelect
                      allowClear
                      treeData={[{ value: '0', title: '根目录', children: folderOptions }]}
                      placeholder="根目录"
                      showSearch
                      treeNodeFilterProp="title"
                      treeDefaultExpandAll
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* ② 概览：收集趋势（与基本信息同排；无数据时紧凑） */}
          <Col xs={24} lg={8}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('DAILY', '每日收集')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              {/* 每日收集来自 /api/report，最近答卷来自 /api/answer/list；缺任一权限都不渲染数据 */}
              {!canReport || !canViewAnswers ? (
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>没有查看答卷数据的权限</div>
              ) : (
                <>
                  {daily.entries.length === 0 ? (
                    // 无数据时只占两行，不再撑出一大块空白
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                      <div>还没有答卷数据</div>
                      <div style={{ marginTop: 6, fontSize: 11 }}>共 0 份</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {daily.entries.map(([day, count]) => (
                          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                            <span style={{ width: 90, color: 'var(--bp-text-soft)' }}>{day}</span>
                            <div style={{ flex: 1, height: 8, background: 'var(--bp-fill-soft)' }}>
                              <div
                                style={{
                                  width: `${(count / daily.max) * 100}%`,
                                  height: 8,
                                  background: 'var(--bp-blue)',
                                }}
                              />
                            </div>
                            <span style={{ width: 40, textAlign: 'right' }}>{count}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-text-soft)' }}>
                        共 <span style={{ color: 'var(--bp-orange)' }}>{answerTotal}</span> 份答卷 · 最近 5 份
                        {answers.length > 0 ? `（最新 ${answers[0].createAt || ''}）` : ''}
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('ANONYMOUS', '匿名答卷 / 班级')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              {!canReport || !classStats ? (
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>没有查看报表的权限</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>总答卷</div><div style={{ fontSize: 22, fontWeight: 600 }}>{classStats.total}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>匿名</div><div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bp-orange)' }}>{classStats.anonymous}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>普通链接匿名</div><div style={{ fontSize: 22, fontWeight: 600 }}>{classStats.unassignedAnonymous}</div></div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bp-hint)', marginBottom: 8 }}>
                    普通公开链接的匿名答卷没有班级归属，只在这里计数；班级老师看不到。要归到班级，请在班级资源里复制「班级链接」。
                  </div>
                  {classStats.classes.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有带班级归属的答卷；在班级资源里复制班级专属链接。</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {classStats.classes.map((row) => (
                        <div key={row.classId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                          <span style={{ flex: '1 1 120px', minWidth: 0 }}>{row.className || row.classId}</span>
                          <Tag color="blue">实名 {row.identified}</Tag>
                          <Tag color="orange">匿名 {row.anonymous}</Tag>
                          <span style={{ color: 'var(--bp-text-soft)' }}>共 {row.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          </Col>

          {/* ③ 题型分值：按题型统一改所有题的分值，不用逐题设置（问卷不判分，不展示） */}
          {scoringEnabled && <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('SCORE', '题型分值')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              {scoreGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>试卷里还没有题目</div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 0.6fr 0.9fr 0.8fr',
                      gap: 8,
                      fontSize: 11,
                      color: 'var(--bp-text-soft)',
                    }}
                  >
                    <span>题型</span>
                    <span>题数</span>
                    <span>每题分值</span>
                    <span>题型小计</span>
                  </div>
                  {scoreGroups.map((group) => (
                    <div
                      key={group.type}
                      style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.9fr 0.8fr', gap: 8, alignItems: 'center' }}
                    >
                      <span>{group.label}</span>
                      <span>× {group.count}</span>
                      <InputNumber
                        min={0}
                        step={0.5}
                        style={{ width: '100%' }}
                        placeholder={group.scores.size > 1 ? '混合' : '未设置'}
                        value={scoreDraft[group.type] ?? undefined}
                        onChange={(value) =>
                          setScoreDraft({ ...scoreDraft, [group.type]: value === null ? null : Number(value) })
                        }
                      />
                      <span>{fmtScore((Number(scoreDraft[group.type] ?? 0) || 0) * group.count)} 分</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12 }}>
                    共 {scoreQuestions} 题 · 整卷 {fmtScore(scoreTotal)} 分 · 平均每题 {fmtScore(averageScore)} 分
                  </div>
                  <div style={{ borderTop: '1px dashed var(--bp-line)', paddingTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span>整套总分</span>
                      <InputNumber
                        min={1}
                        value={targetScore}
                        onChange={(value) => {
                          targetTouched.current = true;
                          setTargetScore(Number(value ?? 0));
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span>题型分值比例</span>
                      {scoreGroups.map((group) => (
                        <span key={group.type}>
                          {group.label}{' '}
                          <InputNumber
                            min={0}
                            style={{ width: 58 }}
                            value={scoreWeights[group.type]}
                            onChange={(value) =>
                              setScoreWeights({ ...scoreWeights, [group.type]: Number(value ?? 0) })
                            }
                          />
                        </span>
                      ))}
                    </div>
                    <Space>
                      <Button onClick={allocateByTotal}>按总分分配</Button>
                      <Button type="primary" loading={scoreSaving} disabled={!canEdit} onClick={() => void applyScores()}>
                        按题型应用分值
                      </Button>
                    </Space>
                    <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 6 }}>
                      先按整套总分和比例算出每题分值，再应用；未填分值的题型保持原样。
                    </div>
                  </div>
                </Space>
              )}
            </Card>
          </Col>}

          {/* ④ 答题显示（「自动暂存」取代旧概述页的「自动保存」，只此一处） */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('DISPLAY', '答题显示')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                {switchItem('autoSave', '自动暂存', '答题过程中定时保存草稿')}
                {switchItem('progressBar', '显示进度条')}
                {switchItem('onePageOneQuestion', '一页一题')}
                {switchItem('answerSheetVisible', '显示答题卡')}
                {switchItem('questionNumber', '显示题目序号')}
                {switchItem(
                  'answererNameRequired',
                  '答题人姓名必填',
                  '不填姓名不能交卷',
                )}
                {switchItem('copyEnabled', '允许复制题目')}
                {switchItem('scoringEnabled', '启用计分', '考试默认开启；问卷默认关闭，开启后显示分值、成绩单和正确率')}
              </Row>
            </Card>
          </Col>

          {/* ④ 回收限制 */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('COLLECT', isSurvey ? '问卷收集' : '回收限制')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                {switchItem('loginRequired', '需要登录')}
                <Col xs={24} md={12}>
                  <Form.Item name="password" label="凭密码">
                    <Input placeholder="留空表示不需要密码" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxAnswers" label="回收上限">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="每 IP 限次">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="ipLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="ipLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="ipLimitFreq" noStyle>
                        <Select style={{ width: '52%' }} placeholder="频率" options={limitFreqOptions} />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="每台设备限次" extra="按浏览器 cookie 识别">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="deviceLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="deviceLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="deviceLimitFreq" noStyle>
                        <Select style={{ width: '52%' }} placeholder="频率" options={limitFreqOptions} />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="endTime" label="回收截止时间" extra="到点后停止收卷，与考试结束时间不同">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* ⑤ 考试控制（问卷模式不展示） */}
          {!isSurvey && <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('EXAM', '考试控制')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="examStartTime" label="考试开始时间">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="examEndTime" label="考试结束时间" extra="考试窗口的结束时间">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="minSubmitMinutes" label="最短交卷（分钟）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxSubmitMinutes" label="最长交卷（分钟）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxSwitchScreenTimes" label="最大切屏次数">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="passModePerSeconds" label="闯关每题限时（秒）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                {switchItem('rankingEnabled', '交卷后显示排名')}
                {switchItem('exerciseMode', '练习模式')}
                {switchItem('randomSurveyWrong', '错题练习')}
                {switchItem('randomOrder', '随机题目顺序')}
                {switchItem('passMode', '闯关模式')}
                {switchItem('favoriteEnabled', '允许收藏题目')}
              </Row>
            </Card>
          </Col>}

          {/* ⑥ 投放与分享：链接/二维码 + 发布状态（取代旧概述页的「开启收集」） */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('PUBLISH', isSurvey ? '问卷投放' : '投放与分享')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>答题链接</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                      style={{
                        flex: '1 1 100%',
                        padding: '6px 10px',
                        border: '1px solid var(--bp-line)',
                        fontSize: 12,
                        wordBreak: 'break-all',
                      }}
                    >
                      {shareUrl}
                    </span>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard?.writeText(shareUrl);
                        message.success('已复制');
                      }}
                    >
                      复制
                    </Button>
                    <Button size="small" icon={<ExportOutlined />} href={shareUrl} target="_blank">
                      打开
                    </Button>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      href={qr}
                      download={`${project?.name || id}-二维码.png`}
                      disabled={!qr}
                    >
                      下载二维码
                    </Button>
                  </div>
                </div>
                {qr && (
                  <img
                    src={qr}
                    alt="答题二维码"
                    style={{ width: 104, height: 104, border: '1px solid var(--bp-line)' }}
                  />
                )}
              </div>

              <hr className="bp-dim" style={{ margin: '10px 0 14px' }} />

              <Row gutter={[12, 0]}>
                {canPublish &&
                  switchItem('status', '发布状态', '开启后任何人可通过链接作答；关闭后答题链接打不开')}
                {switchItem('enableUpdate', '允许修改答案')}
                {scoringEnabled && switchItem('transcriptVisible', '显示成绩单')}
                {scoringEnabled && switchItem('answerAnalysis', '显示答案解析')}
                <Col xs={24} md={12}>
                  <Form.Item name="redirectUrl" label="完成跳转">
                    <Input placeholder="https://…（选填）" allowClear />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="contentHtml" label="提交后提示内容" extra="支持 HTML，留空显示默认提示">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* ⑦ 协作者 */}
          <Col span={24}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('COLLABORATORS', '协作管理员')}
              style={{ height: '100%' }}
              styles={{ body: { padding: 16 } }}
            >
              <PartnerPanel projectId={id} canManage={canManagePartner} />
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
