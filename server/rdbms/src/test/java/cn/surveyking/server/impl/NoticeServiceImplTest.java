package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.domain.dto.NoticeQuery;
import cn.surveyking.server.domain.dto.NoticeRequest;
import cn.surveyking.server.domain.dto.NoticeView;
import cn.surveyking.server.domain.dto.UpdateCheckView;
import cn.surveyking.server.domain.dto.UserInfo;
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
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 公告服务的规则回归：谁能看、谁能改、正文消毒、检查更新去重。
 *
 * <p>纯 Mockito，不启动 Spring、不连库，因此没有 {@code S2_TEST_DB_URL} 也会跑。
 * 可见性有两套实现：列表靠 Wrapper 拼 SQL（{@code visibleQuery}），详情靠 Java 版 {@code canSee}。
 * 两套口径必须一致，改一处就要改另一处，所以这里两边都测：SQL 侧断言结构（受众 IN / 范围 IS NULL 或 IN /
 * 「我创建的」兜底 / 未读走 NOT EXISTS 子查询），Java 侧断言实际可见性。
 */
class NoticeServiceImplTest {

	private final NoticeMapper noticeMapper = mock(NoticeMapper.class);

	private final NoticeReadMapper noticeReadMapper = mock(NoticeReadMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	private final DeptMapper deptMapper = mock(DeptMapper.class);

	private final UserDeptScopeService userDeptScopeService = mock(UserDeptScopeService.class);

	private final ClassService classService = mock(ClassService.class);

	/**
	 * 单测不启动 MyBatis，Lambda 缓存是空的：{@code Notice::getTitle} 解析不出列名，
	 * {@code getCustomSqlSegment()} 会抛 "can not find lambda cache"。这里手动登记一次表元数据。
	 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				Notice.class);
		// installCache 平时由 MyBatis 启动时解析 Mapper 触发；单测没有这一步，手动补
		LambdaUtils.installCache(tableInfo);
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("老师只有 notice:manage:class：发 audience=all 的全站公告被 403")
	void teacherCannotPublishSiteWideNotice() {
		login("teacher-1", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		AccessDeniedException ex = assertThrows(AccessDeniedException.class,
				() -> service().create(request(Notice.AUDIENCE_ALL, null, null)));
		assertTrue(ex.getMessage().contains("全站"), ex.getMessage());
		verify(noticeMapper, never()).insert(any(Notice.class));
	}

	@Test
	@DisplayName("老师把班级公告发给「全体」同样被 403")
	void teacherCannotSendClassNoticeToEveryone() {
		login("teacher-1", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		assertThrows(AccessDeniedException.class,
				() -> service().create(request(Notice.AUDIENCE_ALL, Notice.SCOPE_CLASS, "class-1")));
		verify(noticeMapper, never()).insert(any(Notice.class));
	}

	@Test
	@DisplayName("班级公告没给班级 id：400")
	void classNoticeRequiresScopeId() {
		login("teacher-1", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		ValidationException ex = assertThrows(ValidationException.class,
				() -> service().create(request(Notice.AUDIENCE_STUDENT, Notice.SCOPE_CLASS, null)));
		assertTrue(ex.getMessage().contains("班级"), ex.getMessage());
	}

	@Test
	@DisplayName("老师发班级公告：校验班可见、正文过消毒、落库为草稿")
	void teacherClassNoticeIsSanitizedAndSavedAsDraft() {
		login("teacher-1", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		NoticeRequest request = request(Notice.AUDIENCE_STUDENT, Notice.SCOPE_CLASS, "class-1");
		request.setContent("<p>明天停课</p><script>alert(1)</script>");
		request.setPinned(true);
		service().create(request);
		verify(classService).assertVisible("class-1");
		ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
		verify(noticeMapper).insert(captor.capture());
		Notice saved = captor.getValue();
		assertEquals(Notice.STATUS_DRAFT, saved.getStatus());
		assertEquals(Notice.AUDIENCE_STUDENT, saved.getAudience());
		assertEquals("class-1", saved.getScopeId());
		assertEquals(Boolean.TRUE, saved.getPinned());
		assertFalse(saved.getContent().contains("<script"), saved.getContent());
		assertTrue(saved.getContent().contains("明天停课"), saved.getContent());
	}

	@Test
	@DisplayName("管理员可以发全站公告")
	void adminCanPublishSiteWideNotice() {
		login("admin-1", "ROLE_admin");
		service().create(request(Notice.AUDIENCE_ALL, null, null));
		verify(noticeMapper).insert(any(Notice.class));
	}

	@Test
	@DisplayName("audience=admin 的公告，学员看不到（按「不存在」处理，且不写已读）")
	void studentCannotSeeAdminOnlyNotice() {
		login("student-1", PermissionEnum.NOTICE_LIST.getCode());
		when(userMapper.selectById("student-1")).thenReturn(user("student-1", "student"));
		when(userDeptScopeService.resolveDeptScope("student-1")).thenReturn(scope("class-1"));
		when(noticeMapper.selectById("n1")).thenReturn(published(Notice.AUDIENCE_ADMIN, null, null));
		ValidationException ex = assertThrows(ValidationException.class, () -> service().detail("n1"));
		assertTrue(ex.getMessage().contains("不存在"), ex.getMessage());
		verify(noticeReadMapper, never()).insert(any(NoticeRead.class));
	}

	@Test
	@DisplayName("本班公告：本班学员看得到，详情顺带写入已读记录")
	void classNoticeVisibleToMemberAndMarksRead() {
		login("student-1", PermissionEnum.NOTICE_LIST.getCode());
		when(userMapper.selectById("student-1")).thenReturn(user("student-1", "student"));
		when(userDeptScopeService.resolveDeptScope("student-1")).thenReturn(scope("class-1"));
		when(noticeMapper.selectById("n1")).thenReturn(published(Notice.AUDIENCE_STUDENT, Notice.SCOPE_CLASS, "class-1"));
		NoticeView view = service().detail("n1");
		assertTrue(view.getRead());
		ArgumentCaptor<NoticeRead> captor = ArgumentCaptor.forClass(NoticeRead.class);
		verify(noticeReadMapper).insert(captor.capture());
		assertEquals("n1", captor.getValue().getNoticeId());
		assertEquals("student-1", captor.getValue().getUserId());
	}

	@Test
	@DisplayName("别班公告：不在该班组链里的人看不到")
	void classNoticeHiddenForOutsider() {
		login("teacher-2", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		when(userMapper.selectById("teacher-2")).thenReturn(user("teacher-2", "staff"));
		when(userDeptScopeService.resolveDeptScope("teacher-2")).thenReturn(scope("org-1"));
		// 公告是别人发的：创建人本来就能看见自己发的公告，这里必须换掉 create_by 才能测范围
		Notice notice = published(Notice.AUDIENCE_TEACHER, Notice.SCOPE_CLASS, "class-1");
		notice.setCreateBy("teacher-9");
		when(noticeMapper.selectById("n1")).thenReturn(notice);
		assertThrows(ValidationException.class, () -> service().detail("n1"));
	}

	@Test
	@DisplayName("老师只能改自己创建的班级公告，别人的一律 403")
	void teacherCannotEditOthersClassNotice() {
		login("teacher-1", PermissionEnum.NOTICE_LIST.getCode(), PermissionEnum.NOTICE_MANAGE_CLASS.getCode());
		when(noticeMapper.selectById("n1")).thenReturn(published(Notice.AUDIENCE_STUDENT, Notice.SCOPE_CLASS, "class-1"));
		assertThrows(AccessDeniedException.class, () -> service().archive("n1"));
	}

	@Test
	@DisplayName("检查更新：发现新版本写管理员公告，同版本只写一次")
	void systemUpdateNoticeIsInsertedOnce() {
		UpdateCheckView view = new UpdateCheckView();
		view.setCurrentVersion("2.2.1");
		view.setLatestVersion("2.2.2");
		view.setHasUpdate(true);
		view.setNotes("<p>修复若干问题</p><script>alert(1)</script>");
		view.setDownloadUrl("https://example.com/releases/2.2.2");
		// 第一次查不到同版本，第二次「查到了」（模拟第一次已经插入成功）
		when(noticeMapper.selectCount(any())).thenReturn(0L, 1L);
		NoticeService service = service();
		service.recordSystemUpdate(view);
		service.recordSystemUpdate(view);
		ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
		verify(noticeMapper, times(1)).insert(captor.capture());
		Notice saved = captor.getValue();
		assertEquals("系统更新：v2.2.2", saved.getTitle());
		assertEquals(Notice.TYPE_SYSTEM_UPDATE, saved.getType());
		assertEquals(Notice.AUDIENCE_ADMIN, saved.getAudience());
		assertEquals(Notice.STATUS_PUBLISHED, saved.getStatus());
		assertEquals(Boolean.TRUE, saved.getPinned());
		assertFalse(saved.getContent().contains("<script"), saved.getContent());
		assertTrue(saved.getContent().contains("修复若干问题"), saved.getContent());
	}

	@Test
	@DisplayName("检查更新：没有新版本时不写公告")
	void noNoticeWhenNoUpdate() {
		UpdateCheckView view = new UpdateCheckView();
		view.setLatestVersion("2.2.2");
		view.setHasUpdate(false);
		service().recordSystemUpdate(view);
		verify(noticeMapper, never()).insert(any(Notice.class));
	}

	@Test
	@DisplayName("列表 SQL：学员按 (受众 AND 范围) OR 我创建的 过滤")
	void listSqlFiltersByAudienceAndScope() {
		login("student-1", PermissionEnum.NOTICE_LIST.getCode());
		when(userMapper.selectById("student-1")).thenReturn(user("student-1", "student"));
		when(userDeptScopeService.resolveDeptScope("student-1")).thenReturn(scope("class-1"));
		when(noticeMapper.selectPage(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
		service().list(new NoticeQuery());
		String sql = capturedListSql();
		assertTrue(sql.contains("AUDIENCE IN"), sql);
		assertTrue(sql.contains("SCOPE_TYPE IS NULL"), sql);
		assertTrue(sql.contains("SCOPE_ID IN"), sql);
		assertTrue(sql.contains("CREATE_BY ="), sql);
		assertTrue(sql.contains("STATUS ="), sql);
	}

	@Test
	@DisplayName("列表 SQL：管理员不追加受众/范围过滤（能看全部，含各班公告）")
	void listSqlForAdminHasNoAudienceFilter() {
		login("admin-1", "ROLE_admin");
		when(noticeMapper.selectPage(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
		service().list(new NoticeQuery());
		String sql = capturedListSql();
		assertFalse(sql.contains("AUDIENCE IN"), sql);
		assertFalse(sql.contains("SCOPE_ID IN"), sql);
		assertTrue(sql.contains("STATUS ="), sql);
	}

	@Test
	@DisplayName("只看未读：走 NOT EXISTS 子查询，{0} 占位符已换成参数绑定")
	void unreadFilterUsesParameterizedSubQuery() {
		login("student-1", PermissionEnum.NOTICE_LIST.getCode());
		when(userMapper.selectById("student-1")).thenReturn(user("student-1", "student"));
		when(userDeptScopeService.resolveDeptScope("student-1")).thenReturn(scope("class-1"));
		when(noticeMapper.selectPage(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
		NoticeQuery query = new NoticeQuery();
		query.setOnlyUnread(true);
		service().list(query);
		String sql = capturedListSql();
		assertTrue(sql.contains("NOT EXISTS"), sql);
		assertTrue(sql.contains("T_NOTICE_READ"), sql);
		assertFalse(sql.contains("{0}"), sql);
	}

	// ------ helpers

	/** 抓 list() 交给 Mapper 的 Wrapper，转成大写 SQL 片段做结构断言 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	private String capturedListSql() {
		ArgumentCaptor<Wrapper<Notice>> captor = ArgumentCaptor.forClass((Class) Wrapper.class);
		verify(noticeMapper, atLeastOnce()).selectPage(any(), captor.capture());
		return captor.getValue().getCustomSqlSegment().toUpperCase(Locale.ROOT);
	}

	private NoticeService service() {
		return new NoticeServiceImpl(noticeMapper, noticeReadMapper, userMapper, deptMapper, userDeptScopeService,
				classService);
	}

	private void login(String userId, String... authorities) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		Set<GrantedAuthority> granted = new HashSet<>();
		Arrays.stream(authorities).forEach(authority -> granted.add(new SimpleGrantedAuthority(authority)));
		info.setAuthorities(granted);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

	private NoticeRequest request(String audience, String scopeType, String scopeId) {
		NoticeRequest request = new NoticeRequest();
		request.setTitle("关于本周停课的通知");
		request.setContent("<p>周四下午停课</p>");
		request.setAudience(audience);
		request.setScopeType(scopeType);
		request.setScopeId(scopeId);
		return request;
	}

	private Notice published(String audience, String scopeType, String scopeId) {
		Notice notice = new Notice();
		notice.setId("n1");
		notice.setTitle("通知");
		notice.setContent("<p>正文</p>");
		notice.setType(Notice.TYPE_NOTICE);
		notice.setAudience(audience);
		notice.setScopeType(scopeType);
		notice.setScopeId(scopeId);
		notice.setStatus(Notice.STATUS_PUBLISHED);
		notice.setPublishAt(new Date(System.currentTimeMillis() - 60_000L));
		notice.setPinned(false);
		notice.setCreateBy("teacher-2");
		return notice;
	}

	private User user(String id, String userType) {
		User user = new User();
		user.setId(id);
		user.setName(id);
		user.setUserType(userType);
		return user;
	}

	private Set<String> scope(String... deptIds) {
		return new LinkedHashSet<>(new ArrayList<>(List.of(deptIds)));
	}

}
