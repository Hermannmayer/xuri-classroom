package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

/**
 * @author javahuang
 * @date 2022/2/1
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class SelectUserRequest extends PageQuery {

	private String name;

	private String projectId;

	private String deptId;

	private List<String> selected = new ArrayList<>();

	/**
	 * 只返回「可以作为项目协作者」的用户（具备 collaboratorAuthority 权限，默认 project:create）。
	 * 学员没有这个权限，因此不会出现在协作者候选列表里。
	 */
	private Boolean collaboratorOnly;

	public String getName() {
		if (name != null) {
			return "%" + name + "%";
		}
		return null;
	}

}
