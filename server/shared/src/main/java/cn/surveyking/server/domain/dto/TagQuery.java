package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.TagCategoryEnum;
import lombok.Data;





@Data
public class TagQuery {

	private String name;

	private TagCategoryEnum category = TagCategoryEnum.repo;




	private Integer shared = 1;

	private SurveySchema.QuestionType questionType;

	private String repoId;

}
