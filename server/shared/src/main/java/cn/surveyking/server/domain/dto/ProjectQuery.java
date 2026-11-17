package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.LinkedHashMap;

/**
 * @author javahuang
 * @date 2021/8/31
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class ProjectQuery extends PageQuery {

	/** 「未分类」的查询哨兵：后端翻译成 category IS NULL OR category = '' */
	public static final String UNCATEGORIZED = "__UNCATEGORIZED__";

	private String id;

	/**
	 * 预览模式：设计器里点「预览答题页」时带上。
	 *
	 * <p>预览只要求「当前用户能看这个项目」（管理员 / 所有者 / 协作者），
	 * **不受发布状态、考试时间窗口、班级分配、答卷条数上限**这些「能不能答」的限制——
	 * 否则老师刚建好还没发布的卷子根本点不开预览。
	 * <p>只影响读：提交路径 {@code validateAnswerGate} 照旧校验，预览里交不了卷。
	 */
	private Boolean preview;

	private String repoId;

	private String password;

	private String name;

	/** 分类过滤：普通值精确匹配；__UNCATEGORIZED__ = 未分类；空 = 不过滤 */
	private String category;

	private String parentId;

	/** 班级专属公开链接 token；只由服务端解析，不接受前端传 classId */
	private String classToken;

	/** true=忽略「根目录」限制，返回可见范围内所有层级的项目（学员任务列表用） */
	private Boolean flat;

	private ProjectModeEnum mode;

	private LinkedHashMap<String, Object> answer;

	private String answerId;

	private ExamExerciseTypeEnum examExerciseType;

	public void setAnswer(LinkedHashMap<String, Object> answer) {
		this.answer = answer;

	}

}
