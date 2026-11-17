package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;

/**
 * AI 出卷任务进度（{@code GET /api/ai/paper/job/{jobId}}）。
 *
 * <p>状态机沿用「答卷批量导出 PDF」那一套（queued → running → done / failed），前端轮询同一个接口即可；
 * P4 没有做取消接口，所以不会出现 canceled。
 *
 * <p>任务只存在内存里：进程重启后未完成的任务会消失，轮询会拿到 400「任务不存在或已过期」，重新生成即可。
 *
 * @author p4-backend
 */
@Data
public class AiPaperJobView {

	/** 排队中 */
	public static final String STATUS_QUEUED = "queued";

	/** 生成中 */
	public static final String STATUS_RUNNING = "running";

	/** 完成，result 里有题 */
	public static final String STATUS_DONE = "done";

	/** 失败，error 里是中文原因（含内容校验拒收的理由） */
	public static final String STATUS_FAILED = "failed";

	private String jobId;

	/** queued / running / done / failed */
	private String status;

	/** 0~100 */
	private Integer progress;

	/** 失败原因（中文）；成功时为 null */
	private String error;

	/** 成功时才有：题目 + 统计 */
	private Result result;

	@Data
	public static class Result {

		/** 可直接写进画布的题目：id / dataSource / children / examCorrectAnswer / examScore 都已补齐 */
		private List<SurveySchema> questions;

		private Stats stats;

	}

	/** 预览表要的统计数字，后端算好，避免前端再算一遍口径不一致 */
	@Data
	public static class Stats {

		private Integer questionCount;

		private Double totalScore;

		/** 题型 → 题数 */
		private LinkedHashMap<String, Integer> typeCount;

		/** 题型 → 分值小计 */
		private LinkedHashMap<String, Double> typeScore;

	}

}
