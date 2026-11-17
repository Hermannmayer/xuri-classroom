package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * AI 用量记账（表 {@code t_ai_usage}，见 db/migration/V2.2.4__ai_usage.sql）。
 *
 * <p>只记「谁、哪个场景、哪个模型、烧了多少 token、多久、成没成」，<b>不记 prompt 正文，也不记答案正文</b>：
 * 记账的目的是对账与排障，不是留证据链，存正文既贵又多一个隐私面。
 *
 * <p><b>刻意不继承 BaseModel</b>：t_ai_usage 只有 create_at，没有 update_at / update_by 列。
 * 继承之后 {@code MyMetaObjectHandler} 的 updateFill 会往不存在的列写值，任何 update 都会报
 * {@code Unknown column 'update_by'}（与 {@code Notice} / {@code RepoCategory} 同样的取舍）。
 *
 * @author p4-backend
 */
@Data
@TableName("t_ai_usage")
public class AiUsage {

	/** 调用成功 */
	public static final String STATUS_OK = "ok";

	/** 调用失败（未启用、限流、网络/模型报错） */
	public static final String STATUS_ERROR = "error";

	/** 被拦下（内容校验不通过；token 已经花掉了，所以照样记一条） */
	public static final String STATUS_REJECTED = "rejected";

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	/** 调用人（t_user.id）；后台线程里拿不到 SecurityContext，由场景显式传入 */
	private String userId;

	/** 场景：paper_generate / question_rewrite / grade_suggest / report_summary */
	private String scene;

	/** 模型 id */
	private String model;

	private Integer promptTokens;

	private Integer completionTokens;

	private Integer totalTokens;

	/** 耗时（毫秒，含重试） */
	private Long costMs;

	/** ok / error / rejected */
	private String status;

	/** 失败原因摘要（截断到 500 字，够定位问题又不至于把库撑爆） */
	private String error;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
