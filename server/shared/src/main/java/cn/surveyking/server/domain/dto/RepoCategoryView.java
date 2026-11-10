package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 题库分类/文件夹（**扁平**返回，前端按 {@link #path} 拆 "/" 建树）。
 *
 * <p>数据来源是两处合并：目录登记表 t_repo_category（空文件夹只在这里）+ t_repo 现有 category
 * 的 distinct 值；同一路径只出现一次，count 是该目录下（含子目录）当前用户可见的题库数。
 * 由 t_repo.category 推导出来、还没登记的层级 {@link #id} 为 null（这时前端可以用
 * {@link #path} 当上级传给 {@code POST /repo/categories/create} 的 parentPath）。
 */
@Data
public class RepoCategoryView {

	/** 目录登记表 id；由 t_repo.category 推导出来、还没登记的层级为 null */
	private String id;

	/** 单段名称；「未分类」表示题库没有填分类 */
	private String name;

	/** 上级目录 id（可能为 null，尤其推导出来的层级） */
	private String parentId;

	/** 全路径，用 / 连接；「未分类」为空串 */
	private String path;

	/** 上级路径；根节点为空 */
	private String parentPath;

	/** 该目录下（含子目录）当前用户可见的题库数 */
	private Integer count;

}
