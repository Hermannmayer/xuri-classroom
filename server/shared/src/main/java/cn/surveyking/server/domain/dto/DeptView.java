package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class DeptView {

	private String id;

	private String parentId;


	private String deptType;


	private Boolean allowRegister;


	private String classKind;

	private String name;

	private String shortName;

	private String code;


	private String managerId;


	private String managerName;

	private String remark;


	private String propertyJson;

	private java.util.Date validFrom;

	private java.util.Date validTo;


	private java.util.List<String> roleIds;


	private java.util.List<String> roleNames;

}
