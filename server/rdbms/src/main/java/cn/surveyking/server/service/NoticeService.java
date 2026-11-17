package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeReadRequest;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.domain.dto.UpdateCheckView;

/**
 * 通知公告（管理员全站公告 + 老师班级公告）。
 *
 * <p>边界（照 docs/ops/2026-11-17-AI与产品化-实施计划.md 第 4 节）：
 * <ul>
 * <li>一张表 {@code t_notice} 装两类公告，靠 {@code audience}（给谁看）与
 * {@code scope_type/scope_id}（什么范围）两个维度区分；</li>
 * <li>权限在 Service 层再判一次，不只靠 {@code @PreAuthorize}：班级公告要
 * {@code notice:manage:class} + 班可见，其余范围要 {@code notice:manage:system}；</li>
 * <li>读接口按 audience + scope 过滤，正文入库前过 {@code RichTextSanitizer}；</li>
 * <li>「检查更新」发现新版本时，由 {@link #recordSystemUpdate} 往公告表写一条系统消息（同版本只写一次）。</li>
 * </ul>
 */
public interface NoticeService {

	/**
	 * 公告列表：默认只返回已发布且在有效期内的公告，并按当前用户的受众/范围过滤。
	 *
	 * @param query 分页与筛选条件；status 只有持 notice:manage:* 的人才能用来查草稿/归档
	 */
	PaginationResponse<NoticeView> list(NoticeQuery query);

	/** 当前用户的未读数：可见公告里没有已读记录的数量 */
	long unreadCount();

	/**
	 * 公告详情（顺带标记已读）。
	 *
	 * <p>看不到的公告一律按「不存在」处理，避免按 id 探测别人的公告。
	 * @throws jakarta.validation.ValidationException 公告不存在、已下线或当前用户看不到
	 */
	NoticeView detail(String id);

	/** 批量标记已读（幂等）：只标记当前用户看得到的公告 */
	void read(NoticeReadRequest request);

	/**
	 * 新建公告，落库为草稿。
	 * @return 新公告 id
	 * @throws org.springframework.security.access.AccessDeniedException 没有对应范围的发布权限
	 */
	String create(NoticeRequest request);

	/** 修改公告（不会改变发布状态） */
	void update(NoticeRequest request);

	/** 发布：status=published，首次发布时补 publish_at */
	void publish(String id);

	/** 归档：status=archived，不再出现在任何列表里（记录保留，便于追溯） */
	void archive(String id);

	/** 删除（逻辑删除） */
	void delete(String id);

	/**
	 * 把「检查更新」的结果写成管理员公告。
	 *
	 * <p>只在 {@code hasUpdate=true} 且有 latestVersion 时写入；标题里带版本号，
	 * 同版本靠「type=system_update + title 相同」去重，不会每次都刷一条。
	 * 写入失败不应该影响更新检查本身，调用方（SystemApi）负责兜异常。
	 */
	void recordSystemUpdate(UpdateCheckView view);

}
