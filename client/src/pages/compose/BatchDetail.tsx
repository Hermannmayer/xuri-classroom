import { useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Spin, Tag, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getComposeBatch, type ComposeBatchDetail } from '../../api/compose';

/** 试卷集详情：一次组卷出的 N 套独立卷子 */
export default function ComposeBatchDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ComposeBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getComposeBatch(id)
      .then(setDetail)
      .catch((e: Error) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {detail.batch.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            {detail.batch.variantCount} 套 · 种子 {detail.batch.seed}
          </Typography.Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/compose/batches')}>全部试卷集</Button>
          <Button type="primary" onClick={() => navigate('/teaching?tab=exam')}>
            返回列表
          </Button>
        </Space>
      </div>

      {detail.variants.some((variant) => !variant.projectId) && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="有套次未发布为考试，只能在线预览，不能打印链接"
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {detail.variants.map((variant) => (
          <Card
            key={variant.seq}
            size="small"
            title={'第 ' + variant.seq + ' 套' + (variant.repeated ? '（与上一套重复 ' + variant.repeated + ' 题）' : '')}
            extra={
              <Space>
                {variant.projectId ? (
                  <>
                    <Button size="small" onClick={() => navigate('/survey/' + variant.projectId + '/print')}>
                      打印
                    </Button>
                    <Button size="small" onClick={() => navigate('/survey/' + variant.projectId + '/edit')}>
                      编辑
                    </Button>
                  </>
                ) : (
                  <Tag>未发布</Tag>
                )}
              </Space>
            }
          >
            <Space wrap>
              <Tag color="blue">{variant.total} 题</Tag>
              <Tag color="green">{variant.score} 分</Tag>
              {Object.entries(variant.byType ?? {}).map(([key, value]) => (
                <Tag key={key}>
                  {key} {value}
                </Tag>
              ))}
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
}
