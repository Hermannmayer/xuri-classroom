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
 * - 没传 to：navigate(-1) 回上一页；没有历史时退到 /
 */
export default function BackButton({
  to,
  label = '返回',
  style,
}: {
  to?: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const navigate = useNavigate();
  const go = () => {
    if (to) {
      navigate(to);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  return (
    <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={go} style={{ paddingLeft: 0, ...style }}>
      {label}
    </Button>
  );
}
