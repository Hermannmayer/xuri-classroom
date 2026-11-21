package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.LinkedHashMap;





@Data
@EqualsAndHashCode(callSuper = false)
public class ProjectQuery extends PageQuery {


	public static final String UNCATEGORIZED = "__UNCATEGORIZED__";

	private String id;









	private Boolean preview;

	private String repoId;

	private String password;

	private String name;


	private String category;

	private String parentId;


	private String classToken;


	private Boolean flat;

	private ProjectModeEnum mode;

	private LinkedHashMap<String, Object> answer;

	private String answerId;

	private ExamExerciseTypeEnum examExerciseType;

	public void setAnswer(LinkedHashMap<String, Object> answer) {
		this.answer = answer;

	}

}
