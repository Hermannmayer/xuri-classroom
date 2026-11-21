import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 统一的「返回上一级」按钮 */
export default function BackButton({
  to,
  label = '返回',
  style,
  fallback = '/',
}: {
  to?: string;
  label?: string;
  style?: React.CSSProperties;
  fallback?: string;
}) {
  const navigate = useNavigate();
  const go = () => {
    if (to) {
      navigate(to);
      return;
    }
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
  return (
    <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={go} style={{ paddingLeft: 0, ...style }}>
      {label}
    </Button>
  );
}
