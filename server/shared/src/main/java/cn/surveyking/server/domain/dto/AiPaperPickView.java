package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;






@Data
public class AiPaperPickView {


	private List<SurveySchema> questions = new ArrayList<>();

	private AiPaperJobView.Stats stats;


	private List<Note> notes = new ArrayList<>();


	private String summary;


	private Integer candidates;


	private Integer missing;

	@Data
	public static class Note {

		private String questionId;

		private String title;

		private String reason;

	}

}
