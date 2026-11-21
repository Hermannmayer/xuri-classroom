package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;









@Data
public class AnswerGradeRequest {




	private String answerId;




	private List<Item> items;






	private Boolean submit;




	private List<String> questionIds;




	@Data
	public static class Item {


		private String questionId;


		private Double score;


		private String comment;





		private String source;

	}

}
