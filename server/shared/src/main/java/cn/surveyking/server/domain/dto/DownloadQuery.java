package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.NotNull;
import java.util.Date;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/9/17
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class DownloadQuery extends PageQuery {

	/**
	 * 问卷 id
	 */
	@NotNull
	private String projectId;

	/**
	 * 当前答案id
	 */
	private String answerId;

	/**
	 * 导出附件命名表达式
	 */
	private String nameExp;

	/**
	 * 答案ids
	 */
	private List<String> ids;

	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date startTime;

	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date endTime;

	/** 按班级导出（t_answer.class_id）；为空导出全部 */
	private String classId;

	/**
	 * 按「第几次作答」导出（t_answer.attempt_no，从 0 开始）；为空导出全部轮次。
	 * <p>补考场景下老师通常只要某一轮。
	 */
	private Integer attemptNo;

	/**
	 * PDF 导出选项：是否附上答案解析。默认 false —— 考试未结束时放解析等于泄题，
	 * 老师显式勾选才放。
	 */
	private Boolean includeAnalysis;

	/**
	 * 导出选项：是否附上签名题/上传题的图片。
	 *
	 * <p>
	 * <b>已废弃，总是包含图片</b>：签名/上传图是学员作答的一部分，摘掉它等于给了一张不完整的答卷，
	 * 所以导出任务一律按 true 处理（字段保留只为兼容旧调用方，传 false 也不再生效）。
	 */
	private Boolean includeImages;

	/**
	 * 一次导出要产出哪些文件（成绩单 PDF / 答题卷 PDF / 长图 PNG / 确认单 PDF）。
	 *
	 * <p>
	 * 为什么不是「一次一种格式」：老师通常同时要「发给学员的确认单 + 归档的答题卷」，
	 * 拆成多次导出等于把同一批答卷重复渲染两三遍（这台机器只有 4 核，学生还在答题），
	 * 而且前端要轮询好几个任务、下载好几个 ZIP。列在这里，后台一次渲染完、打一个 ZIP 分目录。
	 *
	 * <p>
	 * 为空时回退成 {@code [type]}：老的调用方（只传 type=answerPdf）行为不变。
	 */
	private List<DownloadType> outputs;

	/**
	 * 是否包含匿名答卷。不传时导出默认包含（修复匿名答卷「导出为空」）；
	 * 显式传 false 才只导出实名答卷，数据页「仅实名」即此口径。
	 */
	private Boolean includeAnonymous;

	/**
	 * 导出范围与数据页筛选保持一致：批改状态 / 答题人姓名（模糊）/ 分数段。
	 *
	 * <p>为什么放在 DownloadQuery 而不是复用 AnswerQuery：下载接口的 query string 就是它的入参，
	 * 这几个字段加在这里，Excel 导出才会遵守老师当前看到的筛选条件（否则「筛了 60 分以下」
	 * 却导出一整场），口径会当场对不上。
	 */
	private String gradeStatus;

	private String createByName;

	private Double minScore;

	private Double maxScore;

	@NotNull
	private DownloadType type;

	/**
	 * 浏览器语言
	 */
	private String locale;

	public enum DownloadType {

		/**
		 * 问卷答案、问卷答案+附件、问卷附件
		 */
		answer, answerAttachment, attachment,

		/**
		 * 每人一份「成绩单」PDF（题目 + 作答 + 得分 + 可选解析 + 签名图），整体打成 ZIP。
		 *
		 * <p>
		 * 这是线上一直在用的版式，行为保持不变（{@code AnswerPdfExporter.Style.GRADE_REPORT}）。
		 */
		answerPdf,

		/**
		 * 每人一份「答题卷还原」PDF：和学员答题时看到的样子一致（选中项打勾、不标对错、不给每题得分），
		 * 用来归档/复核「他当时到底怎么答的」。
		 */
		answerSheetPdf,

		/**
		 * 每人一张长图 PNG：把答题卷逐页拼成一张竖图，发给学员用手机看不用缩放（也省打印纸）。
		 */
		answerImage,

		/**
		 * 每人一页 A4「成绩确认单」：总分 + 客观/主观小计 + 签字栏，打印出来给学员核对签字。
		 */
		confirmSheetPdf,

		/**
		 * 全班一份「成绩册」PDF：每人一行，列出姓名 / 分数 / 用时 / 逐题得分。
		 *
		 * <p>
		 * 它是「一个班一份」，和上面几种「每人一份」不是一类东西，所以导出任务不接受它。
		 */
		gradeBookPdf

	}

}
