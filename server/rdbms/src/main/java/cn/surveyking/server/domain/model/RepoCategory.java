package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * 题库分类（目录登记表，含只有名字、还没放题库的空文件夹）。
 *
 * <p>t_repo.category 是自由文本；这张表登记「目录」，让空文件夹也能存在、同名目录只出现一次。
 *
 * <p>刻意不继承 {@code BaseModel}：表里没有 is_deleted / update_at / update_by，也没有逻辑删除
 * （删目录就是真删，题库自己的 category 字段不受影响）。createAt / createBy 由
 * {@code MyMetaObjectHandler} 插入时自动填。
 *
 * @author surveyking
 */
@Data
@TableName("t_repo_category")
public class RepoCategory {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	/** 分类名（单段，不含 /） */
	private String name;

	/** 上级分类 id；为空表示根 */
	private String parentId;

	/** 全路径，用 / 连接（如 保育员/初级）；唯一键 uk_repo_category_path */
	private String path;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

}
