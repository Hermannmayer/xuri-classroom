package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.uitls.RichTextSanitizer;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeReadRequest;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.domain.dto.UpdateCheckView;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Notice;
import cn.surveyking.server.domain.model.NoticeRead;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.NoticeMapper;
import cn.surveyking.server.mapper.NoticeReadMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.NoticeService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
















@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService {


	private static final int SUMMARY_LENGTH = 120;






	private static final String NOT_READ_SQL = "NOT EXISTS (SELECT 1 FROM t_notice_read nr "
			+ "WHERE nr.notice_id = t_notice.id AND nr.user_id = {0})";


	private static final Object SYSTEM_UPDATE_LOCK = new Object();

	private final NoticeMapper noticeMapper;

	private final NoticeReadMapper noticeReadMapper;

	private final UserMapper userMapper;

	private final DeptMapper deptMapper;

	private final UserDeptScopeService userDeptScopeService;


	private final ClassService classService;

	// ------ 读

	@Override
	public PaginationResponse<NoticeView> list(NoticeQuery query) {
		NoticeQuery condition = query == null ? new NoticeQuery() : query;
		String userId = currentUserId();
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {

			return new PaginationResponse<>(0L, new ArrayList<>());
		}
		User user = loadUser(userId);

		LambdaQueryWrapper<Notice> wrapper = visibleQuery(condition, userId, user).orderByDesc(Notice::getPinned)
				.orderByDesc(Notice::getPublishAt).orderByDesc(Notice::getCreateAt);
		Page<Notice> page = new Page<>(condition.getCurrent(), condition.getPageSize());
		Page<Notice> result = noticeMapper.selectPage(page, wrapper);
		List<NoticeView> views = toViews(result.getRecords(), userId, user, resolveDeptScope(userId), false);
		return new PaginationResponse<>(result.getTotal(), views);
	}

	@Override
	public long unreadCount() {
		String userId = currentUserId();
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return 0L;
		}
		User user = loadUser(userId);
		LambdaQueryWrapper<Notice> wrapper = visibleQuery(new NoticeQuery(), userId, user);
		wrapper.apply(NOT_READ_SQL, userId);
		Long count = noticeMapper.selectCount(wrapper);
		return count == null ? 0L : count;
	}

	@Override
	public NoticeView detail(String id) {
		String noticeId = trim(id);
		if (!StringUtils.hasText(noticeId)) {
			throw new ValidationException("缺少公告 id");
		}
		String userId = currentUserId();
		User user = loadUser(userId);
		Set<String> deptScope = resolveDeptScope(userId);
		Notice notice = noticeMapper.selectById(noticeId);
		if (notice == null || !canSee(notice, userId, user, deptScope)) {
			throw new ValidationException("公告不存在或已下线");
		}

		if (!isOnline(notice) && !canManage(notice, userId)) {
			throw new ValidationException("公告不存在或已下线");
		}
		markRead(userId, notice.getId());
		NoticeView view = toViews(Collections.singletonList(notice), userId, user, deptScope, true).get(0);

		if (!Boolean.TRUE.equals(view.getRead())) {
			view.setRead(true);
			view.setReadAt(view.getReadAt() == null ? new Date() : view.getReadAt());
		}
		return view;
	}

	@Override
	public void read(NoticeReadRequest request) {
		String userId = currentUserId();
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			throw new AccessDeniedException("请先登录后再标记公告已读");
		}
		List<String> noticeIds = collectNoticeIds(request);
		if (noticeIds.isEmpty()) {
			throw new ValidationException("请选择要标记已读的公告");
		}
		User user = loadUser(userId);
		Set<String> deptScope = resolveDeptScope(userId);
		Set<String> alreadyRead = loadReadIds(userId, noticeIds);
		for (Notice notice : noticeMapper.selectBatchIds(noticeIds)) {

			if (notice == null || alreadyRead.contains(notice.getId()) || !canSee(notice, userId, user, deptScope)) {
				continue;
			}
			insertRead(userId, notice.getId());
		}
	}

	// ------ 写

	@Override
	@Transactional(rollbackFor = Exception.class)
	public String create(NoticeRequest request) {
		Notice notice = new Notice();
		applyRequest(notice, request);

		notice.setStatus(Notice.STATUS_DRAFT);
		noticeMapper.insert(notice);
		return notice.getId();
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public void update(NoticeRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少公告 id");
		}
		Notice existing = requireNotice(request.getId());
		assertCanEdit(existing);


		Notice merged = new Notice();
		applyRequest(merged, request);
		noticeMapper.update(null, Wrappers.<Notice>lambdaUpdate().eq(Notice::getId, existing.getId())
				.set(Notice::getTitle, merged.getTitle()).set(Notice::getContent, merged.getContent())
				.set(Notice::getType, merged.getType()).set(Notice::getAudience, merged.getAudience())
				.set(Notice::getScopeType, merged.getScopeType()).set(Notice::getScopeId, merged.getScopeId())
				.set(Notice::getPinned, merged.getPinned()).set(Notice::getRequireAck, merged.getRequireAck())
				.set(Notice::getExpireAt, merged.getExpireAt()).set(Notice::getUpdateAt, new Date()));
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public void publish(String id) {
		Notice notice = requireNotice(id);
		assertCanEdit(notice);
		Date now = new Date();

		Date publishAt = notice.getPublishAt() == null ? now : notice.getPublishAt();
		noticeMapper.update(null, Wrappers.<Notice>lambdaUpdate().eq(Notice::getId, notice.getId())
				.set(Notice::getStatus, Notice.STATUS_PUBLISHED).set(Notice::getPublishAt, publishAt)
				.set(Notice::getUpdateAt, now));
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public void archive(String id) {
		Notice notice = requireNotice(id);
		assertCanEdit(notice);
		noticeMapper.update(null, Wrappers.<Notice>lambdaUpdate().eq(Notice::getId, notice.getId())
				.set(Notice::getStatus, Notice.STATUS_ARCHIVED).set(Notice::getUpdateAt, new Date()));
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public void delete(String id) {
		Notice notice = requireNotice(id);
		assertCanEdit(notice);

		noticeMapper.deleteById(notice.getId());
	}

	@Override
	public void recordSystemUpdate(UpdateCheckView view) {
		if (view == null || !view.isHasUpdate()) {
			return;
		}
		String version = trim(view.getLatestVersion());
		if (!StringUtils.hasText(version)) {
			return;
		}
		String title = "系统更新：v" + version;
		synchronized (SYSTEM_UPDATE_LOCK) {
			Long exists = noticeMapper.selectCount(Wrappers.<Notice>lambdaQuery()
					.eq(Notice::getType, Notice.TYPE_SYSTEM_UPDATE).eq(Notice::getTitle, title));
			if (exists != null && exists > 0) {

				return;
			}
			Notice notice = new Notice();
			notice.setTitle(title);
			notice.setContent(buildSystemUpdateContent(view, version));
			notice.setType(Notice.TYPE_SYSTEM_UPDATE);

			notice.setAudience(Notice.AUDIENCE_ADMIN);
			notice.setPinned(true);
			notice.setRequireAck(false);
			notice.setStatus(Notice.STATUS_PUBLISHED);
			notice.setPublishAt(new Date());
			noticeMapper.insert(notice);
		}
	}



	/** 把请求写进实体，同时做全部业务校验（标题/正文、类型、受众、范围权限） */
	private void applyRequest(Notice notice, NoticeRequest request) {
		if (request == null) {
			throw new ValidationException("缺少公告内容");
		}
		String title = trim(request.getTitle());
		if (!StringUtils.hasText(title)) {
			throw new ValidationException("公告标题不能为空");
		}
		if (title.length() > 200) {
			throw new ValidationException("公告标题不能超过 200 字");
		}
		if (!StringUtils.hasText(request.getContent())) {
			throw new ValidationException("公告正文不能为空");
		}
		String type = normalizeType(request.getType());
		String audience = normalizeAudience(request.getAudience());
		String scopeType = normalizeScopeType(request.getScopeType());
		String scopeId = trim(request.getScopeId());
		if (Notice.SCOPE_CLASS.equals(scopeType)) {
			if (!StringUtils.hasText(scopeId)) {
				throw new ValidationException("请选择公告所属班级");
			}
			if (!canManageSystem()) {
				if (!canManageClass()) {
					throw new AccessDeniedException("没有发布班级公告的权限");
				}
				if (Notice.AUDIENCE_ALL.equals(audience) || Notice.AUDIENCE_ADMIN.equals(audience)) {
					throw new AccessDeniedException("只有管理员能把公告发给全体或管理员");
				}
			}

			classService.assertVisible(scopeId);
		}
		else if (!canManageSystem()) {
			throw new AccessDeniedException("没有发布全站公告的权限");
		}
		notice.setTitle(title);

		notice.setContent(RichTextSanitizer.clean(request.getContent()));
		notice.setType(type);
		notice.setAudience(audience);
		notice.setScopeType(scopeType);
		notice.setScopeId(Notice.SCOPE_CLASS.equals(scopeType) ? scopeId : null);
		notice.setPinned(Boolean.TRUE.equals(request.getPinned()));
		notice.setRequireAck(Boolean.TRUE.equals(request.getRequireAck()));
		notice.setExpireAt(toDate(request.getExpireAt()));
	}

	/** 类型：只允许人工写 notice / ai_result；system_update 由「检查更新」独占 */
	private String normalizeType(String type) {
		if (!StringUtils.hasText(type)) {
			return Notice.TYPE_NOTICE;
		}
		String value = type.trim().toLowerCase(Locale.ROOT);
		if (Notice.TYPE_SYSTEM_UPDATE.equals(value)) {
			throw new ValidationException("系统更新公告由「检查更新」自动生成，不能手工创建");
		}
		if (!Notice.TYPE_NOTICE.equals(value) && !Notice.TYPE_AI_RESULT.equals(value)) {
			throw new ValidationException("不支持的公告类型：" + type);
		}
		return value;
	}

	private String normalizeAudience(String audience) {
		if (!StringUtils.hasText(audience)) {
			return Notice.AUDIENCE_ALL;
		}
		String value = audience.trim().toLowerCase(Locale.ROOT);
		if (!Notice.AUDIENCE_ALL.equals(value) && !Notice.AUDIENCE_ADMIN.equals(value)
				&& !Notice.AUDIENCE_TEACHER.equals(value) && !Notice.AUDIENCE_STUDENT.equals(value)) {
			throw new ValidationException("不支持的公告受众：" + audience);
		}
		return value;
	}

	/** 范围：空 = 全站；class = 班级 */
	private String normalizeScopeType(String scopeType) {
		if (!StringUtils.hasText(scopeType)) {
			return null;
		}
		String value = scopeType.trim().toLowerCase(Locale.ROOT);
		if (Notice.SCOPE_CLASS.equals(value)) {
			return value;
		}
		if (Notice.SCOPE_PROJECT.equals(value)) {
			throw new ValidationException("暂不支持按考试定向的公告");
		}
		throw new ValidationException("不支持的公告范围：" + scopeType);
	}

	private Notice requireNotice(String id) {
		String noticeId = trim(id);
		if (!StringUtils.hasText(noticeId)) {
			throw new ValidationException("缺少公告 id");
		}
		Notice notice = noticeMapper.selectById(noticeId);
		if (notice == null) {
			throw new ValidationException("公告不存在或已删除");
		}
		return notice;
	}

	/** 编辑/发布/归档/删除的闸门 */
	private void assertCanEdit(Notice notice) {
		if (canManage(notice, currentUserId())) {
			return;
		}
		throw new AccessDeniedException("没有管理这条公告的权限");
	}



	/** 列表查询条件：状态、筛选、受众、范围、未读，全在这里拼 */
	private LambdaQueryWrapper<Notice> visibleQuery(NoticeQuery query, String userId, User user) {
		LambdaQueryWrapper<Notice> wrapper = Wrappers.lambdaQuery();
		String status = trim(query.getStatus());
		if (StringUtils.hasText(status) && (canManageSystem() || canManageClass())) {
			wrapper.eq(Notice::getStatus, status.toLowerCase(Locale.ROOT));
		}
		else {
			Date now = new Date();
			wrapper.eq(Notice::getStatus, Notice.STATUS_PUBLISHED)
					.and(w -> w.isNull(Notice::getPublishAt).or().le(Notice::getPublishAt, now))
					.and(w -> w.isNull(Notice::getExpireAt).or().gt(Notice::getExpireAt, now));
		}
		if (StringUtils.hasText(query.getType())) {
			wrapper.eq(Notice::getType, query.getType().trim().toLowerCase(Locale.ROOT));
		}
		if (StringUtils.hasText(query.getAudience())) {
			wrapper.eq(Notice::getAudience, query.getAudience().trim().toLowerCase(Locale.ROOT));
		}
		if (StringUtils.hasText(query.getScopeType())) {
			wrapper.eq(Notice::getScopeType, query.getScopeType().trim().toLowerCase(Locale.ROOT));
		}
		if (StringUtils.hasText(query.getKeyword())) {
			wrapper.like(Notice::getTitle, query.getKeyword().trim());
		}
		if (Boolean.TRUE.equals(query.getOnlyUnread())) {
			wrapper.apply(NOT_READ_SQL, userId);
		}
		applyVisibility(wrapper, userId, user);
		return wrapper;
	}

	/** 受众 + 范围过滤：((audience 命中 AND 范围命中) OR 我创建的) */
	private void applyVisibility(LambdaQueryWrapper<Notice> wrapper, String userId, User user) {
		if (canManageSystem()) {

			return;
		}
		List<String> audiences = visibleAudiences(user);
		Set<String> deptScope = resolveDeptScope(userId);
		wrapper.and(w -> w.and(a -> a.in(Notice::getAudience, audiences).and(s -> scopeFilter(s, deptScope)))
				.or(o -> o.eq(Notice::getCreateBy, userId)));
	}

	private void scopeFilter(LambdaQueryWrapper<Notice> wrapper, Set<String> deptScope) {
		wrapper.isNull(Notice::getScopeType);
		if (!CollectionUtils.isEmpty(deptScope)) {
			wrapper.or(w -> w.eq(Notice::getScopeType, Notice.SCOPE_CLASS).in(Notice::getScopeId, deptScope));
		}
	}

	/** 当前用户能看到的 audience 集合：管理员额外含 admin，教职工含 teacher，学员含 student */
	private List<String> visibleAudiences(User user) {
		if (isAdmin()) {
			return Arrays.asList(Notice.AUDIENCE_ALL, Notice.AUDIENCE_ADMIN, Notice.AUDIENCE_TEACHER);
		}
		if (user != null && "student".equals(user.getUserType())) {
			return Arrays.asList(Notice.AUDIENCE_ALL, Notice.AUDIENCE_STUDENT);
		}
		return Arrays.asList(Notice.AUDIENCE_ALL, Notice.AUDIENCE_TEACHER);
	}

	/** 单条公告的可见性（详情 / 标记已读用；与列表的 SQL 口径保持一致） */
	private boolean canSee(Notice notice, String userId, User user, Set<String> deptScope) {
		if (notice == null) {
			return false;
		}
		if (canManageSystem() || Objects.equals(userId, notice.getCreateBy())) {
			return true;
		}
		if (!visibleAudiences(user).contains(notice.getAudience())) {
			return false;
		}
		String scopeType = trim(notice.getScopeType());
		if (!StringUtils.hasText(scopeType)) {
			return true;
		}
		if (Notice.SCOPE_CLASS.equals(scopeType)) {
			return StringUtils.hasText(notice.getScopeId()) && deptScope.contains(notice.getScopeId());
		}
		return false;
	}

	/** 已发布 + 已到发布时间 + 未过期 */
	private boolean isOnline(Notice notice) {
		if (notice == null || !Notice.STATUS_PUBLISHED.equals(notice.getStatus())) {
			return false;
		}
		long now = System.currentTimeMillis();
		if (notice.getPublishAt() != null && notice.getPublishAt().getTime() > now) {
			return false;
		}
		return notice.getExpireAt() == null || notice.getExpireAt().getTime() > now;
	}

	/** 能管理这条公告吗（决定前端是否显示编辑/归档按钮，也决定草稿能否被预览） */
	private boolean canManage(Notice notice, String userId) {
		if (notice == null) {
			return false;
		}
		if (canManageSystem()) {
			return true;
		}
		return canManageClass() && Objects.equals(userId, notice.getCreateBy())
				&& Notice.SCOPE_CLASS.equals(trim(notice.getScopeType()));
	}

	private boolean canManageSystem() {
		return isAdmin() || SecurityContextUtils.hasAuthority(PermissionEnum.NOTICE_MANAGE_SYSTEM.getCode());
	}

	private boolean canManageClass() {
		return isAdmin() || SecurityContextUtils.hasAuthority(PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
	}

	// ------ 已读

	private void markRead(String userId, String noticeId) {
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return;
		}
		if (StringUtils.hasText(noticeId) && !loadReadIds(userId, Collections.singletonList(noticeId)).isEmpty()) {
			return;
		}
		insertRead(userId, noticeId);
	}

	private void insertRead(String userId, String noticeId) {
		NoticeRead row = new NoticeRead();
		row.setNoticeId(noticeId);
		row.setUserId(userId);
		row.setReadAt(new Date());
		try {
			noticeReadMapper.insert(row);
		}
		catch (DuplicateKeyException e) {

			log.debug("公告已读记录已存在 noticeId={} userId={}", noticeId, userId);
		}
	}

	private Set<String> loadReadIds(String userId, List<String> noticeIds) {
		Set<String> result = new LinkedHashSet<>();
		if (!StringUtils.hasText(userId) || CollectionUtils.isEmpty(noticeIds)) {
			return result;
		}
		noticeReadMapper
				.selectList(Wrappers.<NoticeRead>lambdaQuery().eq(NoticeRead::getUserId, userId)
						.in(NoticeRead::getNoticeId, noticeIds))
				.forEach(row -> result.add(row.getNoticeId()));
		return result;
	}

	private Map<String, Date> loadReadAt(String userId, List<String> noticeIds) {
		Map<String, Date> result = new HashMap<>();
		if (!StringUtils.hasText(userId) || CollectionUtils.isEmpty(noticeIds)) {
			return result;
		}
		noticeReadMapper
				.selectList(Wrappers.<NoticeRead>lambdaQuery().eq(NoticeRead::getUserId, userId)
						.in(NoticeRead::getNoticeId, noticeIds))
				.forEach(row -> result.put(row.getNoticeId(), row.getReadAt()));
		return result;
	}

	// ------ 视图装配

	private List<NoticeView> toViews(List<Notice> notices, String userId, User user, Set<String> deptScope,
			boolean withContent) {
		List<NoticeView> views = new ArrayList<>();
		if (CollectionUtils.isEmpty(notices)) {
			return views;
		}
		List<String> noticeIds = notices.stream().map(Notice::getId).filter(StringUtils::hasText)
				.collect(Collectors.toList());
		Map<String, Date> readAt = loadReadAt(userId, noticeIds);
		Map<String, String> scopeNames = loadScopeNames(notices);
		Map<String, String> creatorNames = loadCreatorNames(notices);
		for (Notice notice : notices) {
			if (notice == null) {
				continue;
			}
			NoticeView view = new NoticeView();
			view.setId(notice.getId());
			view.setTitle(notice.getTitle());
			view.setSummary(summary(notice.getContent()));
			if (withContent) {
				view.setContent(notice.getContent());
			}
			view.setType(notice.getType());
			view.setAudience(notice.getAudience());
			view.setScopeType(notice.getScopeType());
			view.setScopeId(notice.getScopeId());
			view.setScopeName(scopeNames.get(notice.getScopeId()));
			view.setPinned(Boolean.TRUE.equals(notice.getPinned()));
			view.setRequireAck(Boolean.TRUE.equals(notice.getRequireAck()));
			view.setStatus(notice.getStatus());
			view.setPublishAt(notice.getPublishAt());
			view.setExpireAt(notice.getExpireAt());
			view.setCreateBy(notice.getCreateBy());
			view.setCreateByName(creatorNames.get(notice.getCreateBy()));
			view.setCreateAt(notice.getCreateAt());
			view.setUpdateAt(notice.getUpdateAt());
			Date readTime = readAt.get(notice.getId());
			view.setRead(readTime != null);
			view.setReadAt(readTime);
			view.setManageable(canManage(notice, userId));
			views.add(view);
		}
		return views;
	}

	/** 班级名只在 scope_type=class 时才需要查，一次 IN 查回来 */
	private Map<String, String> loadScopeNames(List<Notice> notices) {
		List<String> classIds = notices.stream()
				.filter(notice -> notice != null && Notice.SCOPE_CLASS.equals(notice.getScopeType()))
				.map(Notice::getScopeId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (classIds.isEmpty()) {
			return new HashMap<>();
		}
		Map<String, String> names = new HashMap<>();
		for (Dept dept : deptMapper.selectBatchIds(classIds)) {
			if (dept != null && StringUtils.hasText(dept.getId())) {
				names.put(dept.getId(), StringUtils.hasText(dept.getName()) ? dept.getName() : "");
			}
		}
		return names;
	}

	private Map<String, String> loadCreatorNames(List<Notice> notices) {
		List<String> userIds = notices.stream().map(Notice::getCreateBy).filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		if (userIds.isEmpty()) {
			return new HashMap<>();
		}
		Map<String, String> names = new HashMap<>();
		for (User creator : userMapper.selectBatchIds(userIds)) {
			if (creator != null && StringUtils.hasText(creator.getId())) {
				names.put(creator.getId(), StringUtils.hasText(creator.getName()) ? creator.getName() : "");
			}
		}
		return names;
	}

	/** 正文 → 纯文本摘要：剥标签、压空白，超长截断 */
	private String summary(String html) {
		if (!StringUtils.hasText(html)) {
			return "";
		}
		String text = html.replaceAll("<[^>]*>", " ").replace("&nbsp;", " ").replaceAll("\\s+", " ").trim();
		return text.length() <= SUMMARY_LENGTH ? text : text.substring(0, SUMMARY_LENGTH) + "…";
	}



	/** 系统更新公告正文：版本号、当前版本、Release 说明、下载地址 */
	private String buildSystemUpdateContent(UpdateCheckView view, String version) {
		StringBuilder html = new StringBuilder();
		html.append("<p>检测到新版本 <strong>v").append(escapeHtml(version)).append("</strong>");
		if (StringUtils.hasText(view.getCurrentVersion())) {
			html.append("（当前版本 v").append(escapeHtml(view.getCurrentVersion())).append("）");
		}
		html.append("，可在「系统设置 → 检查更新」查看并下载。</p>");
		if (StringUtils.hasText(view.getNotes())) {
			html.append("<p>").append(RichTextSanitizer.clean(view.getNotes())).append("</p>");
		}
		String downloadUrl = trim(view.getDownloadUrl());
		if (StringUtils.hasText(downloadUrl)
				&& (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://"))) {
			html.append("<p><a href=\"").append(escapeHtml(downloadUrl)).append("\">下载地址</a></p>");
		}
		return RichTextSanitizer.clean(html.toString());
	}

	private String escapeHtml(String value) {
		if (value == null) {
			return "";
		}
		return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
	}

	// ------ 小工具

	private List<String> collectNoticeIds(NoticeReadRequest request) {
		Set<String> ids = new LinkedHashSet<>();
		if (request != null) {
			String single = trim(request.getId());
			if (StringUtils.hasText(single)) {
				ids.add(single);
			}
			if (request.getIds() != null) {
				request.getIds().stream().map(this::trim).filter(StringUtils::hasText).forEach(ids::add);
			}
		}
		return new ArrayList<>(ids);
	}

	private String currentUserId() {
		return SecurityContextUtils.getUserId();
	}

	private boolean isAdmin() {
		return SecurityContextUtils.isAdmin();
	}

	private Set<String> resolveDeptScope(String userId) {
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return new LinkedHashSet<>();
		}
		Set<String> scope = userDeptScopeService.resolveDeptScope(userId);
		return scope == null ? new LinkedHashSet<>() : scope;
	}

	private User loadUser(String userId) {
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return null;
		}
		return userMapper.selectById(userId);
	}

	private Date toDate(Long millis) {
		return millis == null ? null : new Date(millis);
	}

	private String trim(String value) {
		return value == null ? null : value.trim();
	}

}
