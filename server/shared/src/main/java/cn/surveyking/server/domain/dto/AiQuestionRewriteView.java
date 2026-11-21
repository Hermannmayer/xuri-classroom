package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;








@Data
public class AiQuestionRewriteView {

	private List<Suggestion> suggestions = new ArrayList<>();

	@Data
	public static class Suggestion {


		private String text;


		private String reason;

	}

}
