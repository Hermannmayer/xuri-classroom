package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeReadRequest;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.domain.dto.UpdateCheckView;














public interface NoticeService {

	/** 公告列表：默认只返回已发布且在有效期内的公告，并按当前用户的受众/范围过滤 */
	PaginationResponse<NoticeView> list(NoticeQuery query);

	/** 当前用户的未读数：可见公告里没有已读记录的数量 */
	long unreadCount();

	/** 公告详情（顺带标记已读） */
	NoticeView detail(String id);

	/** 批量标记已读（幂等）：只标记当前用户看得到的公告 */
	void read(NoticeReadRequest request);

	/** 新建公告，落库为草稿；返回 新公告 id。 */
	String create(NoticeRequest request);

	/** 修改公告（不会改变发布状态） */
	void update(NoticeRequest request);

	/** 发布：status=published，首次发布时补 publish_at */
	void publish(String id);

	/** 归档：status=archived，不再出现在任何列表里（记录保留，便于追溯） */
	void archive(String id);

	/** 删除（逻辑删除） */
	void delete(String id);

	/** 把「检查更新」的结果写成管理员公告 */
	void recordSystemUpdate(UpdateCheckView view);

}
