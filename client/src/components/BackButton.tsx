import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * 统一的「返回上一级」按钮。
 *
 * 约定：除匿名页面（公开答题 / 公开查询 / 登录）外，所有二级页面都必须有返回入口，
 * 不然用户只能靠浏览器后退，手机端全屏时甚至退不出去。
 *
 * - 传了 to：直接跳到该路径（用于跨层级跳转，例如题目页固定回题库列表）
 * - 没传 to：优先 navigate(-1) 回上一页；直接打开链接没有站内历史时退到 fallback
 */
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
