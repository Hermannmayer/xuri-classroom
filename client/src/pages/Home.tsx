import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';
import type { SystemInfo, UserInfo } from '../api';

export default function Home() {
  const { user } = useOutletContext<{ user?: UserInfo; system?: SystemInfo }>();
  return (
    <Row gutter={16}>
      <Col span={24}>
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            你好，{user?.name || user?.userId || '访客'}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            新前端骨架已就绪：登录、鉴权、布局、请求层已打通。接下来是问卷设计器与答题闭环。
          </Typography.Paragraph>
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic title="后端" value="已连接" />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic title="当前部门" value={user?.deptName || '-'} />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic title="权限项" value={user?.authorityList?.length ?? 0} />
        </Card>
      </Col>
    </Row>
  );
}
