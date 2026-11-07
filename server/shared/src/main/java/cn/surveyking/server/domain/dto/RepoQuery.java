package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * @author javahuang
 * @date 2022/4/27
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class RepoQuery extends PageQuery {

	private String id;

	private String password;

	private String name;

	private String mode;

	private String category;

	private Boolean isPractice;

	private Boolean memberOnly;

	/** 排序字段：name / updateAt / createAt（白名单，其它值按 createAt） */
	private String sortBy;

	/** true=倒序 */
	private Boolean sortDesc;

}
