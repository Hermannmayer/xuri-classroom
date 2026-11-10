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

	private String repoId;

	private String password;

	private String name;

	/** 分类过滤：普通值精确匹配；__UNCATEGORIZED__ = 未分类；空 = 不过滤 */
	private String category;

	private String parentId;

	private ProjectModeEnum mode;

	private LinkedHashMap<String, Object> answer;

	private String answerId;

	private ExamExerciseTypeEnum examExerciseType;

	public void setAnswer(LinkedHashMap<String, Object> answer) {
		this.answer = answer;

	}

}
