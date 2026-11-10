package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Date;

/**
 * 班级资源分配：一行 = 某个班级 + 某个资源（P1 只有 project：考试/问卷）。
 *
 * <p>班级窗口（{@link #startAt} / {@link #endAt}）为空表示继承项目的全局窗口
 * （{@code ProjectSetting.examSetting.startTime/endTime}）；非空时必须落在全局窗口内，
 * 全局窗口是硬上限。{@link #status} 是班级级手动开关：0=关闭（学生看不到），1=开放。
 *
 * <p>{@code is_deleted} 用的是 BaseModel 的 {@code @TableLogic}，普通查询自动带
 * {@code is_deleted = 0}；手写 SQL 要自己加。
 */
@TableName(value = "t_class_resource", autoResultMap = true)
@Data
@EqualsAndHashCode(callSuper = false)
public class ClassResource extends BaseModel {

	/** 资源类型：考试/问卷（P1 唯一支持的类型） */
	public static final String TYPE_PROJECT = "project";

	/** 班级（t_dept.id，dept_type=class） */
	private String classId;

	/** project=考试/问卷；repo=题库(P2)；course=课程(预留) */
	private String resourceType;

	/** 资源 id（project 时为 t_project.id） */
	private String resourceId;

	/** 0=关闭 1=开放（班级级手动开关） */
	private Integer status;

	/** 本班开始时间；空=继承全局 */
	private Date startAt;

	/** 本班结束时间；空=继承全局 */
	private Date endAt;

	/** 分配人（t_user.id） */
	private String assignedBy;

	/** 预留 */
	private String settings;

}
