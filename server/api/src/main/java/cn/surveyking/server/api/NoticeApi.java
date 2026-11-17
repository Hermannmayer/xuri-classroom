package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeReadRequest;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

/**
 * 通知公告接口（计划 §4.5）。
 *
 * <p>读接口只要 {@code notice:list}；写接口的入口注解放行 {@code notice:manage:*}，真正的范围判定在
 * {@code NoticeServiceImpl}（班级公告要班可见、全站公告要 {@code notice:manage:system}），
 * 这样老师能进写接口但发不了全站公告，不会出现「注解挡在前面、错误信息说不清」的情况。
 *
 * <p>管理员按仓库既有惯例直接用 {@code hasRole('admin')} 兜底（同 {@code AnswerGradeApi}），
 * 避免角色还没勾新权限点时管理员自己也进不去。
 */
@RestController
@RequestMapping("${api.prefix}/notice")
@RequiredArgsConstructor
public class NoticeApi {

	private final NoticeService noticeService;

	/**
	 * 公告列表：默认只返回已发布且在有效期内的，按 audience / scope 过滤。
	 * @param query 分页 + 筛选（onlyUnread / type / status / audience / scopeType / keyword）
	 */
	@PreAuthorize("hasAuthority('notice:list') or hasRole('admin')")
	@GetMapping("/list")
	public PaginationResponse<NoticeView> list(NoticeQuery query) {
		return noticeService.list(query);
	}

	/**
	 * 未读数：顶栏铃铛的红点。
	 * @return {@code {count: n}}
	 */
	@PreAuthorize("hasAuthority('notice:list') or hasRole('admin')")
	@GetMapping("/unread-count")
	public Map<String, Long> unreadCount() {
		return Collections.singletonMap("count", noticeService.unreadCount());
	}

	/**
	 * 公告详情（顺带标记已读）。
	 * @param id 公告 id
	 */
	@PreAuthorize("hasAuthority('notice:list') or hasRole('admin')")
	@GetMapping({ "", "/detail" })
	public NoticeView detail(@RequestParam String id) {
		return noticeService.detail(id);
	}

	/**
	 * 批量标记已读。
	 * @param request {@code {id}} 或 {@code {ids: []}}，两者合并去重
	 */
	@PreAuthorize("hasAuthority('notice:list') or hasRole('admin')")
	@PostMapping("/read")
	public void read(@RequestBody NoticeReadRequest request) {
		noticeService.read(request);
	}

	/**
	 * 新建公告（落草稿）。
	 * @return {@code {id: 新公告 id}}
	 */
	@PreAuthorize("hasAnyAuthority('notice:manage:system','notice:manage:class') or hasRole('admin')")
	@PostMapping("/create")
	public Map<String, String> create(@RequestBody NoticeRequest request) {
		return Collections.singletonMap("id", noticeService.create(request));
	}

	/** 修改公告（不改发布状态） */
	@PreAuthorize("hasAnyAuthority('notice:manage:system','notice:manage:class') or hasRole('admin')")
	@PostMapping("/update")
	public void update(@RequestBody NoticeRequest request) {
		noticeService.update(request);
	}

	/**
	 * 发布公告。
	 * @param request 只用到 id
	 */
	@PreAuthorize("hasAnyAuthority('notice:manage:system','notice:manage:class') or hasRole('admin')")
	@PostMapping("/publish")
	public void publish(@RequestBody NoticeRequest request) {
		noticeService.publish(request == null ? null : request.getId());
	}

	/**
	 * 归档公告（不再出现在任何列表里，记录保留）。
	 * @param request 只用到 id
	 */
	@PreAuthorize("hasAnyAuthority('notice:manage:system','notice:manage:class') or hasRole('admin')")
	@PostMapping("/archive")
	public void archive(@RequestBody NoticeRequest request) {
		noticeService.archive(request == null ? null : request.getId());
	}

	/**
	 * 删除公告（逻辑删除）。
	 * @param request 只用到 id
	 */
	@PreAuthorize("hasAnyAuthority('notice:manage:system','notice:manage:class') or hasRole('admin')")
	@PostMapping("/delete")
	public void delete(@RequestBody NoticeRequest request) {
		noticeService.delete(request == null ? null : request.getId());
	}

}
