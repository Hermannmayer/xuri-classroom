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

	/** PDF 导出选项：是否附上签名题/上传题的图片 */
	private Boolean includeImages;

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
		 * 每人一份答卷 PDF（题目 + 作答 + 得分 + 可选解析 + 可选签名图），整体打成 ZIP。
		 */
		answerPdf,

		/**
		 * 全班一份「成绩册」PDF：每人一行，列出姓名 / 分数 / 用时 / 逐题得分。
		 */
		gradeBookPdf

	}

}
