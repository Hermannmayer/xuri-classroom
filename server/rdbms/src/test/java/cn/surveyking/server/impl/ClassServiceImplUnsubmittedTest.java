package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.domain.dto.UnsubmittedStudentView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.RoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import cn.surveyking.server.service.DeptService;
import cn.surveyking.server.service.SystemService;
import cn.surveyking.server.service.UserService;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 未交卷名单的口径回归：谁算本班成员、谁算已交、权限闸门、500 条上限。
 *
 * <p>纯 Mockito，不启动 Spring、不连库。最关键的一条是「已交」按 {@code create_by} 比对而不是
 * {@code t_answer.class_id}：学员换班、兼报班答题时答卷上的 class_id 都不是当前班，
 * 按班级过滤会把已交的人误报成未交，所以这里既断言结果，也断言生成的 SQL 里没有 class_id 条件。
 */
class ClassServiceImplUnsubmittedTest {

	private final DeptMapper deptMapper = mock(DeptMapper.class);

	private final DeptRoleMapper deptRoleMapper = mock(DeptRoleMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	private final AccountMapper accountMapper = mock(AccountMapper.class);

	private final UserDeptMapper userDeptMapper = mock(UserDeptMapper.class);

	private final UserRoleMapper userRoleMapper = mock(UserRoleMapper.class);

	private final RoleMapper roleMapper = mock(RoleMapper.class);

	private final ClassPartnerMapper classPartnerMapper = mock(ClassPartnerMapper.class);

	private final UserService userService = mock(UserService.class);

	private final SystemService systemService = mock(SystemService.class);

	private final DeptService deptService = mock(DeptService.class);

	private final UserDeptMembershipService userDeptMembershipService = mock(UserDeptMembershipService.class);

	private final ClassStudentImportService classStudentImportService = mock(ClassStudentImportService.class);

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	/**
	 * 单测不启动 MyBatis，Lambda 缓存是空的：{@code User::getName} / {@code Answer::getCreateBy}
	 * 解析不出列名，wrapper 拼 SQL 时会抛 "can not find lambda cache"。这里手动登记一次表元数据。
	 */
	@BeforeAll
	static void initTableInfo() {
		for (Class<?> type : List.of(User.class, Answer.class)) {
			TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
					type);
			LambdaUtils.installCache(tableInfo);
		}
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("只列没交的人：已交的按 create_by 认，匿名答卷（create_by 为空）不算任何人已交")
	void listsOnlyStudentsWithoutFormalAnswer() {
		loginAdmin();
		when(deptMapper.selectById("class-1")).thenReturn(teachingClass("class-1"));
		when(userMapper.selectList(any())).thenReturn(List.of(student("u1", "张三", "13800000001"),
				student("u2", "李四", "13800000002"), student("u3", "王五", null)));
		// 投影查询现在走 selectObjs（只取列值）：包含一个 create_by 为空的匿名答卷
		when(answerMapper.selectObjs(any())).thenReturn(java.util.Arrays.<Object>asList("u1", null));

		UnsubmittedStudentView view = service().listUnsubmittedStudents("p1", "class-1");

		assertEquals(3, view.getTotal());
		assertEquals(1, view.getSubmitted());
		assertEquals(List.of("u2", "u3"),
				view.getList().stream().map(UnsubmittedStudentView.Student::getId).toList());
		assertEquals("李四", view.getList().get(0).getName());
		assertEquals("13800000002", view.getList().get(0).getPhone());
		// 项目可读必须过服务层：注解只做粗筛
		verify(answerAccessGuard).assertProjectAccess("p1");
	}

	@Test
	@DisplayName("换班/兼报班：答卷记在别的班也算已交（SQL 不按 class_id 过滤）")
	void answerRecordedOnAnotherClassStillCountsAsSubmitted() {
		loginAdmin();
		when(deptMapper.selectById("class-1")).thenReturn(teachingClass("class-1"));
		when(userMapper.selectList(any())).thenReturn(List.of(student("u1", "张三", null),
				student("u2", "李四", null)));
		Answer moved = answer("u1");
		moved.setClassId("class-2");
		when(answerMapper.selectObjs(any())).thenReturn(List.of("u1"));

		UnsubmittedStudentView view = service().listUnsubmittedStudents("p1", "class-1");

		assertEquals(1, view.getSubmitted());
		assertEquals(List.of("u2"),
				view.getList().stream().map(UnsubmittedStudentView.Student::getId).toList());
		String sql = capturedAnswerSql();
		assertTrue(sql.contains("TEMP_SAVE ="), sql);
		assertTrue(sql.contains("PROJECT_ID ="), sql);
		assertFalse(sql.contains("CLASS_ID"), sql);
	}

	@Test
	@DisplayName("成员口径：主组或兼报组都算本班（EXISTS t_user_dept），按姓名排序，{0} 已参数化")
	void studentQueryCoversExtraDeptAndSortsByName() {
		loginAdmin();
		when(deptMapper.selectById("class-1")).thenReturn(teachingClass("class-1"));
		when(userMapper.selectList(any())).thenReturn(List.of());

		UnsubmittedStudentView view = service().listUnsubmittedStudents("p1", "class-1");

		assertEquals(0, view.getTotal());
		assertEquals(0, view.getSubmitted());
		assertTrue(view.getList().isEmpty());
		String sql = capturedUserSql();
		assertTrue(sql.contains("USER_TYPE ="), sql);
		assertTrue(sql.contains("T_USER_DEPT"), sql);
		assertTrue(sql.contains("ORDER BY NAME ASC"), sql);
		assertFalse(sql.contains("{0}"), sql);
		// 班里没人就不必再查答卷
		verify(answerMapper, never()).selectObjs(any());
	}

	@Test
	@DisplayName("容器班不能查未交名单：按成员列表的口径直接拒绝")
	void containerClassIsRejected() {
		loginAdmin();
		Dept group = teachingClass("class-1");
		group.setClassKind(Dept.CLASS_KIND_GROUP);
		when(deptMapper.selectById("class-1")).thenReturn(group);

		ValidationException ex = assertThrows(ValidationException.class,
				() -> service().listUnsubmittedStudents("p1", "class-1"));
		assertTrue(ex.getMessage().contains("容器班"), ex.getMessage());
		verify(userMapper, never()).selectList(any());
	}

	@Test
	@DisplayName("用户组（org）不是班级：拒绝，且不去查项目权限")
	void orgDeptIsRejected() {
		loginAdmin();
		Dept org = new Dept();
		org.setId("org-1");
		org.setDeptType(Dept.TYPE_ORG);
		when(deptMapper.selectById("org-1")).thenReturn(org);

		ValidationException ex = assertThrows(ValidationException.class,
				() -> service().listUnsubmittedStudents("p1", "org-1"));
		assertTrue(ex.getMessage().contains("不是班级"), ex.getMessage());
		verify(answerAccessGuard, never()).assertProjectAccess(any());
	}

	@Test
	@DisplayName("超过 500 人的班：名单截断到 500，total / submitted 仍是全体口径")
	void listIsCappedButCountsStayFull() {
		loginAdmin();
		when(deptMapper.selectById("class-1")).thenReturn(teachingClass("class-1"));
		List<User> students = new ArrayList<>();
		for (int i = 0; i < 501; i++) {
			students.add(student("u" + i, String.format("学员%03d", i), null));
		}
		when(userMapper.selectList(any())).thenReturn(students);
		when(answerMapper.selectObjs(any())).thenReturn(List.of("u0"));

		UnsubmittedStudentView view = service().listUnsubmittedStudents("p1", "class-1");

		assertEquals(501, view.getTotal());
		assertEquals(1, view.getSubmitted());
		assertEquals(500, view.getList().size());
	}

	@Test
	@DisplayName("缺 projectId / deptId：400，不碰任何 Mapper")
	void blankParamsAreRejected() {
		assertThrows(ValidationException.class, () -> service().listUnsubmittedStudents("", "class-1"));
		assertThrows(ValidationException.class, () -> service().listUnsubmittedStudents("p1", " "));
		verifyNoInteractions(deptMapper, userMapper, answerMapper, answerAccessGuard);
	}

	// ------ helpers

	private ClassServiceImpl service() {
		return new ClassServiceImpl(deptMapper, deptRoleMapper, userMapper, accountMapper, userDeptMapper,
				userRoleMapper, roleMapper, classPartnerMapper, userService, systemService, deptService,
				userDeptMembershipService, classStudentImportService, answerMapper, answerAccessGuard);
	}

	/** 抓成员查询交给 Mapper 的 Wrapper，转成大写 SQL 片段做结构断言 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	private String capturedUserSql() {
		ArgumentCaptor<Wrapper<User>> captor = ArgumentCaptor.forClass((Class) Wrapper.class);
		verify(userMapper, atLeastOnce()).selectList(captor.capture());
		return captor.getValue().getCustomSqlSegment().toUpperCase(Locale.ROOT);
	}

	/** 抓答卷查询交给 Mapper 的 Wrapper */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	private String capturedAnswerSql() {
		ArgumentCaptor<Wrapper<Answer>> captor = ArgumentCaptor.forClass((Class) Wrapper.class);
		verify(answerMapper, atLeastOnce()).selectObjs(captor.capture());
		return captor.getValue().getCustomSqlSegment().toUpperCase(Locale.ROOT);
	}

	private void loginAdmin() {
		login("admin-1", AppConsts.ROLE_ADMIN);
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

	private Dept teachingClass(String id) {
		Dept dept = new Dept();
		dept.setId(id);
		dept.setName("高三一班");
		dept.setDeptType(Dept.TYPE_CLASS);
		dept.setClassKind(Dept.CLASS_KIND_TEACHING);
		return dept;
	}

	private User student(String id, String name, String phone) {
		User user = new User();
		user.setId(id);
		user.setName(name);
		user.setPhone(phone);
		user.setUserType("student");
		return user;
	}

	/** 正式答卷（temp_save=1）；createBy 为空模拟匿名答卷 */
	private Answer answer(String createBy) {
		Answer answer = new Answer();
		answer.setProjectId("p1");
		answer.setCreateBy(createBy);
		answer.setTempSave(1);
		return answer;
	}

}
