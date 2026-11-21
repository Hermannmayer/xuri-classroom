package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;





@Data
public class SelectDeptRequest {

	private String name;


	private String deptType;

	private String projectId;

	private List<String> selected = new ArrayList<>();

}
