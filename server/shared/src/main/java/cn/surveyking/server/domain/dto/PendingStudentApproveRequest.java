package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 审核通过自己注册的学员：启用账号，并可选地分配到班级。
 *
 * <p>注册接口只会建 status=0 的待审核账号；本请求是管理员/班主任在「待审核学员」里
 * 点「通过」时提交的。deptId 为空表示暂不分配班级（学员可登录，但看不到按班考试）。
 *
 * @author 守夜人
 */
@Data
public class PendingStudentApproveRequest {

	/** 待审核学员的用户 id（t_user.id） */
	private String userId;

	/** 审核通过后进入的班级 id（t_dept.id，dept_type=class）；为空表示暂不分配 */
	private String deptId;

}
