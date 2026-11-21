package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;








@Data
public class StudentClassAssignRequest {

	private String userId;


	private String primaryDeptId;


	private List<String> extraDeptIds;

}
