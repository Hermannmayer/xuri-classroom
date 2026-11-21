import { Navigate, useParams } from 'react-router-dom';

/**
 * 旧链接兜底：发布设置页（/survey/:id/setting）已经整体并入概述页（/survey/:id），

 *
 * 权限由目标路由的 project:detail 校验，这里不再单独拦 project:update——

 */
export default function SurveySettingRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/survey/${id}`} replace />;
}
