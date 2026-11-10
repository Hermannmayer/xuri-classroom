package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;

/**
 * 班级资源分配的一行（班级资源面板）。
 *
 * <p>两类资源：
 * <ul>
 * <li>{@code project}（考试/问卷）：{@link #startAt} / {@link #endAt} 是班级自己的窗口，为空表示继承项目全局窗口；
 * {@link #globalStartAt} / {@link #globalEndAt} 是项目全局窗口（硬上限），一起下发给前端做提示；</li>
 * <li>{@code repo}（题库）：没有全局窗口，{@link #globalStartAt} / {@link #globalEndAt} 恒为 null，
 * {@link #answerCount} 恒为 0；{@link #resourceMode} 由题库的 mode 字符串转换，转不了就是 null。</li>
 * </ul>
 */
@Data
public class ClassResourceView {

	private String id;

	private String classId;

	private String className;

	/** project=考试/问卷 repo=题库 */
	private String resourceType;

	private String resourceId;

	/** 资源名称（考试名 / 题库名） */
	private String resourceName;

	/** 资源模式：exam / survey；题库的 mode 转不过来时为 null（前端按 resourceType 显示「题库」） */
	private ProjectModeEnum resourceMode;

	/** 班级级手动开关：0=关闭 1=开放 */
	private Integer status;

	/** 班级窗口开始；空=继承全局 */
	private Date startAt;

	/** 班级窗口结束；空=继承全局 */
	private Date endAt;

	/** 项目全局窗口开始（硬上限）；题库没有全局窗口，恒为 null */
	private Date globalStartAt;

	/** 项目全局窗口结束（硬上限）；题库没有全局窗口，恒为 null */
	private Date globalEndAt;

	private String assignedBy;

	private String assignedByName;

	/** 本班已交卷数（t_answer 按 project_id + class_id + temp_save=1） */
	private long answerCount;

	/** 当前对学生而言的实际状态：CLOSED / NOT_STARTED / OPEN / ENDED */
	private String effectiveStatus;

}
