package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * @author javahuang
 * @date 2022/2/1
 */
@Data
public class SelectDeptRequest {

	private String name;

	/** 只查某一类组织节点：org=用户组(教职工) class=班级(学员)；为空不过滤 */
	private String deptType;

	private String projectId;

	private List<String> selected = new ArrayList<>();

}
