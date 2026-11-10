package cn.surveyking.server.domain.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.util.Date;

/**
 * @author javahuang
 * @date 2022/4/27
 */
@Data
public class RepoRequest {

	private String id;

	/**
	 * 标题
	 */
	private String name;

	/**
	 * 备注
	 */
	private String description;

	/**
	 * 标签
	 */
	private String[] tag;

	/**
	 * 排序优先级
	 */
	private Integer priority;

	/**
	 * 设置
	 */
	private String setting;

	/**
	 * 题库类型
	 */
	private String mode;

	private Boolean shared;

	/**
	 * 题库分类
	 */
	@NotBlank(message = "题库分类不能为空")
	private String category;

	/**
	 * 是否是练习题库
	 */
	private Boolean isPractice;

	/** 全局开放期开始；为空表示不限（前端传 epoch 毫秒） */
	private Date openStartAt;

	/** 全局开放期结束；为空表示不限（前端传 epoch 毫秒） */
	private Date openEndAt;

}
