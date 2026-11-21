package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;









@Data
public class AiGradeBatchView {


	private Integer answers;


	private Integer items;


	private Integer graded;


	private Integer skipped;


	private Integer failed;


	private List<Low> lowConfidence = new ArrayList<>();


	private String summary;


	private String undoToken;


	private List<String> answerIds = new ArrayList<>();

	@Data
	public static class Low {

		private String answerId;

		private String answererName;

		private String questionId;

		private String questionTitle;

		private Double score;

		private Double maxScore;

		private Double confidence;

		private String reason;

	}

}
