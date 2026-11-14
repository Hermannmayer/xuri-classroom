import { useEffect, useState } from 'react';
import { Button, Table, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listComposeBatches, type ComposeBatchView } from '../../api/compose';

/** 试卷集列表 */
export default function ComposeBatchListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ComposeBatchView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listComposeBatches()
      .then(setRows)
      .catch((e: Error) => message.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          试卷集
        </Typography.Title>
        <Button type="primary" onClick={() => navigate('/compose')}>
          新建组卷
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            render: (name: string, row) => <a onClick={() => navigate('/compose/batch/' + row.id)}>{name}</a>,
          },
          { title: '套数', dataIndex: 'sets', width: 100 },
          { title: '种子', dataIndex: 'seed', width: 140 },
          { title: '创建时间', dataIndex: 'createAt', width: 180 },
        ]}
      />
    </div>
  );
}
