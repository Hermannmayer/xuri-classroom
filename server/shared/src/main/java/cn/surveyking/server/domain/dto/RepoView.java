package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;





@Data
public class RepoView {

	private String id;




	private String name;




	private String description;




	private String mode;




	private String[] tag;




	private Integer priority;




	private String setting;

	private Long total;




	private List<TemplateTagTotalView> templateTags;




	private List<RepoQuestionTypeTotalView> repoQuestionTypes;

	private Boolean shared;

	private String category;

	private Boolean isPractice;


	private Date openStartAt;


	private Date openEndAt;

	private String createBy;

}
