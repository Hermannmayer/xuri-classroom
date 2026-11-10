package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 新建题库分类/文件夹（不挂题库也能建，用于先把目录搭出来）。
 */
@Data
public class RepoCategoryRequest {

	/** 分类名（单段，不能包含 /）；前后空格会被 trim */
	private String name;

	/**
	 * 上级目录 id（t_repo_category.id）。
	 *
	 * <p>与 {@link #parentPath} 二选一，parentId 优先；都不传表示建在根上。
	 */
	private String parentId;

	/**
	 * 上级目录路径（如 "保育员/初级"）。
	 *
	 * <p>给「t_repo.category 里已存在、但还没登记到 t_repo_category」的层级用：
	 * 这些节点在列表里只有 path 没有 id。
	 */
	private String parentPath;

}
