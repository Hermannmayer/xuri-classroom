package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 组卷结果（{@code GET /api/ai/paper/job/{jobId}} 的 result）。
 *
 * @author ai-actions
 */
@Data
public class AiPaperPickView {

	/** 可直接写进画布的题目：id / examScore / examCorrectAnswer 都按题库原样带过来 */
	private List<SurveySchema> questions = new ArrayList<>();

	private AiPaperJobView.Stats stats;

	/** 每道题的挑选理由（模型挑的才有；随机补齐的 reason 为「按条件随机补齐」） */
	private List<Note> notes = new ArrayList<>();

	/** 中文摘要，例如「从 2 个题库的 86 道候选题里挑了 20 题，覆盖 6 个章节」 */
	private String summary;

	/** 实际参与挑选的候选题数 */
	private Integer candidates;

	/** 题库里不够的题数（>0 表示条件太窄，需要放宽章节/难度或换题库） */
	private Integer missing;

	@Data
	public static class Note {

		private String questionId;

		private String title;

		private String reason;

	}

}
