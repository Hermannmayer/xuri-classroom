package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.Date;

/**
 * 通知公告：管理员全站公告与老师班级公告共用一张表（见 db/migration/V2.2.2__notice.sql）。
 *
 * <p>一张表 + 两个维度，不要拆成两张表：
 * <ul>
 * <li>{@link #audience} 决定「谁能在公告中心看到」：all 所有人 / admin 仅管理员 / teacher 教职工 /
 * student 学员；</li>
 * <li>{@link #scopeType} + {@link #scopeId} 决定「范围」：空 = 全站，class = 某个班（按用户所属班组链判定），
 * project = 某场考试（表里预留，接口暂未开放）。</li>
 * </ul>
 *
 * <p><b>刻意不继承 BaseModel</b>：t_notice 有 create_at / update_at / is_deleted，但没有 update_by 列。
 * 继承 BaseModel 后 {@code MyMetaObjectHandler} 的 updateFill 会把 update_by 填进去，
 * 任何 updateById 都会拼出「Unknown column 'update_by'」，所以这里按列逐个声明
 * （与 {@code RepoCategory} 同样的取舍）。
 */
@Data
@TableName("t_notice")
public class Notice {

	/** 普通公告（人工发布） */
	public static final String TYPE_NOTICE = "notice";

	/** 系统更新提醒：只由「检查更新」写入，同版本只插一条 */
	public static final String TYPE_SYSTEM_UPDATE = "system_update";

	/** AI 任务结果（P4 预留） */
	public static final String TYPE_AI_RESULT = "ai_result";

	/** 所有人可见 */
	public static final String AUDIENCE_ALL = "all";

	/** 仅管理员可见 */
	public static final String AUDIENCE_ADMIN = "admin";

	/** 教职工（含管理员）可见 */
	public static final String AUDIENCE_TEACHER = "teacher";

	/** 仅学员可见 */
	public static final String AUDIENCE_STUDENT = "student";

	/** 全站公告（scope 为空） */
	public static final String SCOPE_CLASS = "class";

	/** 按考试定向（表里预留，接口暂未开放） */
	public static final String SCOPE_PROJECT = "project";

	/** 草稿：只有能管理公告的人看得到 */
	public static final String STATUS_DRAFT = "draft";

	/** 已发布 */
	public static final String STATUS_PUBLISHED = "published";

	/** 已归档：不再出现在任何列表里，但记录保留 */
	public static final String STATUS_ARCHIVED = "archived";

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	/** 标题 */
	private String title;

	/** 正文富文本；入库前统一过 {@code RichTextSanitizer} */
	private String content;

	/** notice / system_update / ai_result */
	private String type;

	/** all / admin / teacher / student */
	private String audience;

	/** 空 = 全站；class = 某个班；project = 某场考试（预留） */
	private String scopeType;

	/** scopeType 对应的 id（班级 id / 项目 id） */
	private String scopeId;

	/** 是否置顶（列表按置顶优先排序） */
	private Boolean pinned;

	/** 是否要求已读回执；P2 只做记录，不做强制拦截 */
	private Boolean requireAck;

	/** draft / published / archived */
	private String status;

	/** 发布时间；为空表示立即生效，晚于当前时间表示定时发布 */
	private Date publishAt;

	/** 过期时间；为空表示长期有效 */
	private Date expireAt;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;

	/** 逻辑删除标记，普通查询自动带 is_deleted = 0 */
	@TableLogic
	@JsonIgnore
	@TableField(value = "is_deleted", select = false)
	private Boolean deleted = false;

}
