package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import lombok.Data;

import java.util.Date;





@Data
public class ExerciseView {

	private String id;

	private String projectId;

	private String projectName;




	private Integer tempSave;




	private Long percent;

	private Date createAt;

	private ExamExerciseTypeEnum examExerciseType;

	private String repoId;

	private String answerId;

}
