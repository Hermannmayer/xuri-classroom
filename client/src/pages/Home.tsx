import { Card, Col, Row, Statistic } from 'antd';
import { useOutletContext } from 'react-router-dom';
import type { SystemInfo, UserInfo } from '../api';

function Panel({
  index,
  title,
  children,
  span = 8,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <Col span={span}>
      <div style={{ position: 'relative' }}>
        <span
          className="bp-tag"
          style={{ position: 'absolute', top: -9, left: 12, zIndex: 1, background: '#1e3a5f' }}
        >
          {index}
        </span>
        <Card
          className="bp-corners"
          style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
          styles={{ body: { paddingTop: 22 } }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--bp-text-soft)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          {children}
        </Card>
      </div>
    </Col>
  );
}

export default function Home() {
  const { user, system } = useOutletContext<{ user?: UserInfo; system?: SystemInfo }>();
  return (
    <>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            OVERVIEW / 概览
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            你好，{user?.name || user?.userId || '访客'}
          </h2>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(160,196,232,0.55)', letterSpacing: '0.12em' }}>
          {system?.name || 'SURVEY KING'} · GRID 20/20
        </span>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 22px' }} />

      <Row gutter={[16, 16]}>
        <Panel index="01" title="Backend / 后端" span={8}>
          <Statistic title="" value="已连接" valueStyle={{ fontSize: 20, letterSpacing: '0.04em' }} />
        </Panel>
        <Panel index="02" title="Department / 部门" span={8}>
          <Statistic title="" value={user?.deptName || '—'} valueStyle={{ fontSize: 20 }} />
        </Panel>
        <Panel index="03" title="Authorities / 权限项" span={8}>
          <Statistic
            title=""
            value={user?.authorityList?.length ?? 0}
            valueStyle={{ fontSize: 20, color: 'var(--bp-orange)' }}
          />
        </Panel>
        <Panel index="04" title="Next / 下一步" span={24}>
          <div style={{ fontSize: 12, lineHeight: 1.9, color: 'var(--bp-text-soft)' }}>
            P1 内核：SurveySchema 类型 · 题型注册表 · SchemaRenderer 三态 · 规则引擎移植
            <br />
            P2 设计器 · P3 答题闭环
          </div>
        </Panel>
      </Row>
    </>
  );
}
