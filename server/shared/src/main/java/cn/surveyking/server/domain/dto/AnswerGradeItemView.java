package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class AnswerGradeItemView {


	private String questionId;


	private String type;


	private String title;


	private Integer number;


	private Boolean richTitle;


	private Double maxScore;





	private Double score;


	private String comment;


	private Boolean editable;


	private String source;


	private Object answer;


	private String correctAnswer;


	private String analysis;

}
