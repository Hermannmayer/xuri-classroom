package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;


@Data
public class AddExistingStudentsRequest {


	private String deptId;


	private String sourceDeptId;

	private List<String> userIds;

}
