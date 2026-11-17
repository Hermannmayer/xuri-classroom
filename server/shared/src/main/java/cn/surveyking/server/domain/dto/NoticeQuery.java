package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 公告列表查询条件。
 *
 * <p>默认只返回「已发布且在有效期内」的公告，并按 {@code audience} / {@code scope} 过滤出当前用户看得到的
 * （规则见 {@code NoticeServiceImpl#visibleQuery}）。{@link #status} 只有能管理公告的人才生效，
 * 用来在管理视角看草稿或已归档的记录。
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class NoticeQuery extends PageQuery {

	/** 只看未读 */
	private Boolean onlyUnread;

	/** notice / system_update / ai_result */
	private String type;

	/** draft / published / archived；只有持 notice:manage:* 时生效 */
	private String status;

	/** all / admin / teacher / student */
	private String audience;

	/** 空 / class */
	private String scopeType;

	/** 标题关键字 */
	private String keyword;

}
