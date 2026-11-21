package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;






@Data
public class ClassMemberView {

	private String id;

	private String name;


	private String username;


	private Integer status;

	private String deptId;

	private String deptName;


	private String primaryDeptId;

	private String primaryDeptName;


	private List<String> extraDeptIds;

	private List<String> extraDeptNames;


	private Boolean primary;


	private Integer classCount;


	private Boolean canAssign;

	private String phone;

	private String email;

	private Date createAt;

	private List<String> roleNames;

}
