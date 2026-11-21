package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;









@Data
public class AnswerGradeView {

	private String answerId;

	private String projectId;

	private String projectName;


	private String answererName;


	private Boolean anonymous;


	private String gradeStatus;


	private String gradedBy;


	private String gradedByName;


	private Date gradedAt;


	private Date createAt;


	private Integer attemptNo;


	private Double examScore;


	private Double objectiveScore;


	private Double manualScore;


	private Double totalScore;


	private Integer pendingCount;





	private SurveySchema schema;


	private List<AnswerGradeItemView> items = new ArrayList<>();

}
