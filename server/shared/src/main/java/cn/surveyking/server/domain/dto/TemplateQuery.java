package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;





@Data
@EqualsAndHashCode(callSuper = false)
public class TemplateQuery extends PageQuery {




	private SurveySchema.QuestionType questionType;

	private String name;




	private Integer shared;

	private List<String> categories = new ArrayList<>();

	private List<String> tag = new ArrayList<>();

	private String repoId;

	private List<String> chapter = new ArrayList<>();

	private List<String> difficulty = new ArrayList<>();


	private String keyword;

	private ProjectModeEnum mode;

	private String id;

}
