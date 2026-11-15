package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/** 从其他班级把已有学员加入当前班（作为兼报班）。 */
@Data
public class AddExistingStudentsRequest {

	/** 目标教学班 id */
	private String deptId;

	/** 来源教学班 id：只允许从当前用户可见的班里挑人 */
	private String sourceDeptId;

	private List<String> userIds;

}
