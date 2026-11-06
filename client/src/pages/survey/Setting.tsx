import { Navigate, useParams } from 'react-router-dom';

/**
 * 旧链接兜底：发布设置页（/survey/:id/setting）已经整体并入概述页（/survey/:id），
 * 两个页面合成一个，这里只做 301 式的客户端重定向，避免收藏夹 / 历史链接失效。
 *
 * 权限由目标路由的 project:detail 校验，这里不再单独拦 project:update——
 * 否则只有「改设置」权限的人点旧链接会看到无权限而不是合并后的页面。
 */
export default function SurveySettingRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/survey/${id}`} replace />;
}
