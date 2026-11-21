package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;





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


	private String sortBy;


	private Boolean sortDesc;

}
