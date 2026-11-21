import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Empty, InputNumber, message, Modal, Row, Select, Space, Spin, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { getWithPagination } from '../../api';

interface RepoTypeTotal {
  questionType: string;
  total: number;
}

interface RepoPracticeView {
  id: string;
  name?: string;
  description?: string;
  total?: number;
  repoQuestionTypes?: RepoTypeTotal[];
  createBy?: string;
}

const TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  Textarea: '简答',
  Select: '下拉',
  Score: '评分',
  MultipleBlank: '多空',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixFillBlank: '矩阵填空',
};

const CARD_STYLE = { border: '1px solid var(--bp-line)', height: '100%' };


export default function RepoPracticeHome() {
  const { repoId = '' } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<RepoPracticeView>();
  const [loading, setLoading] = useState(true);
  const [wrongCount, setWrongCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomCount, setRandomCount] = useState(30);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<string>();
  const [typeCount, setTypeCount] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getWithPagination<RepoPracticeView>('/api/repo/list', { current: 1, pageSize: 200 });
      const hit = (list.data ?? []).find((item) => item.id === repoId);
      setRepo(hit);
      if (!hit) return;
      const [wrong, favorite, history] = await Promise.all([
        getWithPagination('/api/repo/book/list', { current: 1, pageSize: 1, type: 1 }).catch(() => ({ total: 0 })),
        getWithPagination('/api/repo/book/list', { current: 1, pageSize: 1, type: 2 }).catch(() => ({ total: 0 })),
        getWithPagination('/api/exercise/list', { current: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
      ]);
      setWrongCount(wrong.total ?? 0);
      setFavoriteCount(favorite.total ?? 0);
      setHistoryCount(history.total ?? 0);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const types = repo?.repoQuestionTypes ?? [];
  const total = repo?.total ?? 0;

  const startSequential = () => {
    navigate('/exercise/practice/' + repoId + '?mode=full', { state: { repoName: repo?.name } });
  };

  /** 按题型占比把随机题量拆给各题型，至少 1 题 */
  const buildCounts = (count: number) => {
    const available = types.filter((item) => item.total > 0);
    if (!available.length) return '';
    const parts: string[] = [];
    let left = Math.max(1, Math.min(count, total));
    available.forEach((item, index) => {
      const isLast = index === available.length - 1;
      const take = isLast ? left : Math.max(1, Math.round((count * item.total) / Math.max(1, total)));
      const finalTake = Math.min(take, item.total, left);
      if (finalTake > 0) parts.push(item.questionType + ':' + finalTake);
      left -= finalTake;
    });
    return parts.join(',');
  };

  const startRandom = () => {
    const counts = buildCounts(randomCount);
    if (!counts) {
      message.warning('题库还没有可练习的题目');
      return;
    }
    setRandomOpen(false);
    navigate('/exercise/practice/' + repoId + '?mode=random&counts=' + encodeURIComponent(counts), {
      state: { repoName: repo?.name },
    });
  };

  const startByType = () => {
    if (!typeValue) {
      message.warning('请选择题型');
      return;
    }
    setTypeOpen(false);
    navigate(
      '/exercise/practice/' + repoId + '?mode=random&counts=' + encodeURIComponent(typeValue + ':' + typeCount),
      { state: { repoName: repo?.name } },
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!repo) {
    return (
      <Empty description="没有找到这个题库，或没有练习权限">
        <Button type="primary" onClick={() => navigate('/repo/index')}>
          返回题库列表
        </Button>
      </Empty>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <BackButton label="返回题库" fallback="/repo/index" style={{ marginBottom: 8 }} />

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 className="bp-title" style={{ fontSize: 20, margin: 0 }}>
              {repo.name || '题库练习'}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 6 }}>
              共 {total} 题 · {types.length} 种题型 · 支持顺序、随机和错题练习
            </div>
            {repo.description && (
              <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 6, lineHeight: 1.8 }}>
                {repo.description}
              </div>
            )}
          </div>
          <Space size={20}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{total}</div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>题目</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{wrongCount}</div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>错题</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{favoriteCount}</div>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>收藏</div>
            </div>
          </Space>
        </div>
      </Card>

      <Card className="bp-corners" size="small" title="开始练习" style={{ marginBottom: 14 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={startSequential}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>顺序练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>按题库顺序从头开始</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={() => setRandomOpen(true)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>随机练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>自定义本次练习题量</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={() => setTypeOpen(true)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>题型练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>只练某一种题型</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={() => navigate('/repo/book?type=1')}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>错题练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>{wrongCount} 道错题</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={() => navigate('/repo/book?type=2')}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>收藏练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>{favoriteCount} 道收藏</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable style={CARD_STYLE} onClick={() => navigate('/exercise')}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>历史练习</div>
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>{historyCount} 条记录</div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card className="bp-corners" size="small" title="我的练习">
        <Space wrap>
          <Tag color="error">我的错题 {wrongCount}</Tag>
          <Tag color="gold">我的收藏 {favoriteCount}</Tag>
          <Tag color="green">历史练习 {historyCount}</Tag>
        </Space>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 10 }}>
          错题和收藏会随练习自动积累；换设备后登录同一账号仍可继续。
        </div>
      </Card>

      <Modal
        title="随机练习"
        open={randomOpen}
        onCancel={() => setRandomOpen(false)}
        onOk={startRandom}
        okText="开始练习"
        cancelText="取消"
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
          本次从题库抽 {randomCount} 题，按各题型占比分配。
        </div>
        <InputNumber
          min={1}
          max={Math.max(1, total)}
          value={randomCount}
          onChange={(value) => setRandomCount(Number(value ?? 1))}
          style={{ width: 160 }}
        />
      </Modal>

      <Modal
        title="题型练习"
        open={typeOpen}
        onCancel={() => setTypeOpen(false)}
        onOk={startByType}
        okText="开始练习"
        cancelText="取消"
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Select
            placeholder="选择题型"
            value={typeValue}
            onChange={(value) => {
              setTypeValue(value);
              const hit = types.find((item) => item.questionType === value);
              setTypeCount(Math.min(20, hit?.total ?? 1));
            }}
            options={types.map((item) => ({
              value: item.questionType,
              label: (TYPE_LABEL[item.questionType] ?? item.questionType) + '（' + item.total + ' 题）',
            }))}
          />
          <InputNumber
            min={1}
            max={Math.max(1, types.find((item) => item.questionType === typeValue)?.total ?? 1)}
            value={typeCount}
            onChange={(value) => setTypeCount(Number(value ?? 1))}
            style={{ width: 160 }}
          />
        </Space>
      </Modal>
    </div>
  );
}
