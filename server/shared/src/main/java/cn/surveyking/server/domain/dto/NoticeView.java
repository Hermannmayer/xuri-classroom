package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 公告中心的一行（列表与详情共用）。
 *
 * <p>列表接口不返回 {@link #content}（正文是 longtext，一页 20 条没必要全下发），只给
 * {@link #summary} 做列表预览；打开详情再取全文。
 *
 * <p>{@link #read} / {@link #manageable} 都是「针对当前登录用户」算出来的，前端不用再自己推断：
 * 前者决定未读点，后者决定这一行要不要显示编辑/发布/归档/删除按钮。
 */
@Data
public class NoticeView {

	private String id;

	private String title;

	/** 正文纯文本摘要（120 字内，剥掉 HTML 标签），列表预览用 */
	private String summary;

	/** 正文富文本（已消毒）；只有详情接口返回，列表为 null */
	private String content;

	/** notice / system_update / ai_result */
	private String type;

	/** all / admin / teacher / student */
	private String audience;

	/** 空 = 全站；class = 某个班 */
	private String scopeType;

	private String scopeId;

	/** 范围名称（scope_type=class 时为班级名），便于前端直接展示 */
	private String scopeName;

	private Boolean pinned;

	private Boolean requireAck;

	/** draft / published / archived */
	private String status;

	private Date publishAt;

	private Date expireAt;

	private String createBy;

	private String createByName;

	private Date createAt;

	private Date updateAt;

	/** 当前用户是否已读 */
	private Boolean read;

	private Date readAt;

	/** 当前用户能否编辑/发布/归档/删除这条公告 */
	private Boolean manageable;

}
