package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;





@Data
public class TemplateView {

	private String id;

	private String name;

	private SurveySchema.QuestionType questionType;

	private SurveySchema template;

	private ProjectModeEnum mode;

	private String[] tag;

	private String chapter;

	private String difficulty;

	private String category;




	private boolean owner;

	private String previewUrl;

	private Date createAt;

	private String repoName;

	private String repoId;

	private Integer wrongTimes;

	private Integer correctTimes;

	private String note;

}
