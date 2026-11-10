package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 考试/问卷分类（列表页筛选用）：分类名 + 该分类下当前用户可见的项目数。
 *
 * <p>空/空白分类统一归到 name = 「未分类」；排序按 count 降序、name 升序。
 */
@Data
public class ProjectCategoryView {

	private String name;

	private Integer count;

}
