package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;





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

	/** 选项 id → Excel 选项列（0 基），只用于把单元格内嵌图片挂到对应选项 */
	@JsonIgnore
	private Map<String, Integer> sourceOptionColumns;

}
