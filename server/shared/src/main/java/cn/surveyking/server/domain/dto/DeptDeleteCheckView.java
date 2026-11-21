package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;









@Data
public class DeptDeleteCheckView {

	private String id;


	private String name;


	private int childCount;


	private List<String> childNames;


	private long primaryMemberCount;


	private long extraMemberCount;


	private List<String> memberNames;


	private boolean lastDept;

}
