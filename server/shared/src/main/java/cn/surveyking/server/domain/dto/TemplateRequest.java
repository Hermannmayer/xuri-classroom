package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;





@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TemplateRequest {

	private String id;




	private String serialNo;




	private String chapter;




	private String difficulty;




	private String name;




	private SurveySchema.QuestionType questionType;




	private SurveySchema template;




	private ProjectModeEnum mode;




	private String[] tag;




	private String category;




	private String previewUrl;




	private Integer priority;




	private Integer shared;

	private String repoId;

	private List<String> ids;




	@JsonIgnore
	private String sourceSheet;

	@JsonIgnore
	private Integer sourceRow;

}
