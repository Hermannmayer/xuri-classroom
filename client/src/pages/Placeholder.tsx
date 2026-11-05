import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 一期占位：保持路由与菜单可点，避免整棵路由树联调时报 404 */
export default function Placeholder({ title, public: isPublic }: { title: string; public?: boolean }) {
  const navigate = useNavigate();
  return (
    <Result
      status="info"
      title={title}
      subTitle={isPublic ? '公开页面，待 P3 实现' : '待后续阶段实现'}
      extra={
        !isPublic && (
          <Button type="primary" onClick={() => navigate('/home')}>
            回到首页
          </Button>
        )
      }
    />
  );
}
