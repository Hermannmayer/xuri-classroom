package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 新建 / 修改一条公告。
 *
 * <p>权限与范围校验不只看 {@code @PreAuthorize}：{@code scopeType=class} 要求
 * {@code notice:manage:class} 且班级对当前用户可见，其余范围要求 {@code notice:manage:system}，
 * 规则在 {@code NoticeServiceImpl} 里（见 {@code applyRequest}）。
 */
@Data
public class NoticeRequest {

	/** 修改时必填；新建留空 */
	private String id;

	private String title;

	/** 正文富文本；服务端入库前过 RichTextSanitizer，前端消毒只是第一道 */
	private String content;

	/** notice（默认）/ ai_result；system_update 只能由「检查更新」写入 */
	private String type;

	/** all（默认）/ admin / teacher / student */
	private String audience;

	/** 空 = 全站公告；class = 班级公告（必须同时给 scopeId） */
	private String scopeType;

	/** scopeType=class 时为班级 id */
	private String scopeId;

	/** 是否置顶 */
	private Boolean pinned;

	/** 是否要求已读回执 */
	private Boolean requireAck;

	/** 过期时间（epoch 毫秒）；空 = 长期有效 */
	private Long expireAt;

}
