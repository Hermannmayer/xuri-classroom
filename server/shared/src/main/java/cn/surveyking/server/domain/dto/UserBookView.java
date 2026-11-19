package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

/**
 * @author javahuang
 * @date 2022/9/9
 */
@Data
public class UserBookView {

	private String id;

	/**
	 * 模板ID
	 */
	private String templateId;

	/**
	 * 问题名称
	 */
	private String name;

	/**
	 * 错误次数
	 */
	private Integer wrongTimes;

	/**
	 * 笔记
	 */
	private String note;

	/**
	 * 1标记为简单
	 */
	private Integer status;

	/**
	 * 1我的错题 2我的收藏
	 */
	private Integer type;

	/**
	 * 来源考试 id（题库练习 / 历史数据为空）
	 */
	private String projectId;

	@JsonFormat(pattern = "yyyy-MM-dd HH:mm")
	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm")
	private Date createAt;

	private Date updateAt;

	private Double qscore;

	/**
	 * 这道记录对应的题还能不能打开。
	 * <p>收藏/错题只存了 template_id 快照：题目被删、来自试卷内临时编的题、题库取消分配或窗口关闭后，
	 * 记录还在但题面取不到。前端据此把「练这题」置灰，而不是点进去才看到一句加载失败。
	 */
	private Boolean available;

	/** available=false 时的中文原因，直接展示给用户 */
	private String unavailableReason;

}
