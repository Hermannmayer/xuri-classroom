import { can } from '../auth/permissions';
import { PERMISSION_CODES } from '../auth/permission-codes';

/** 帮助中心的角色判定：管理员可看管理+老师文档，老师看老师，学员看学员 */
export function resolveHelpRoles(authorities: string[]): string[] {
  const roles = new Set(authorities.map((role) => role.toLowerCase()));
  if (roles.has('role_admin') || authorities.includes('ROLE_admin')) {
    return ['admin', 'teacher'];
  }
  const teacher =
    roles.has('role_teacher') ||
    can(authorities, PERMISSION_CODES.projectList) ||
    can(authorities, PERMISSION_CODES.classList) ||
    can(authorities, PERMISSION_CODES.repoList) ||
    can(authorities, PERMISSION_CODES.projectReport) ||
    can(authorities, PERMISSION_CODES.answerList) ||
    can(authorities, PERMISSION_CODES.templateList);
  if (teacher) return ['teacher'];
  const student =
    roles.has('role_student') ||
    can(authorities, PERMISSION_CODES.portalStudent) ||
    can(authorities, PERMISSION_CODES.projectAnswer) ||
    can(authorities, PERMISSION_CODES.exerciseList);
  return student ? ['student'] : [];
}
