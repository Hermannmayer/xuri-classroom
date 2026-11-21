package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;







@Data
public class ClassNodeView {

	private String id;

	private String name;

	private String parentId;


	private String managerId;


	private String managerName;


	private long memberCount;


	private List<String> roleIds;


	private Boolean allowRegister;


	private String classKind;


	private java.util.Date validFrom;

	private java.util.Date validTo;







	private boolean accessible = true;








	private boolean manageable;

	private List<ClassNodeView> children;

}
