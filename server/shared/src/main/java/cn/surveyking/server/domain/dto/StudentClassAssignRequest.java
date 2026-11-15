package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 调整学员的班级归属：1 个主班 + 最多 2 个兼报班（总计最多 3 个）。
 *
 * <p>主班写 t_user.dept_id，兼报班写 t_user_dept；所有班必须是 teaching 教学班。
 *
 * @author 守夜人
 */
@Data
public class StudentClassAssignRequest {

	private String userId;

	/** 主班 id（必填） */
	private String primaryDeptId;

	/** 兼报班 id 列表（可空，最多 2 个，不能包含主班） */
	private List<String> extraDeptIds;

}
