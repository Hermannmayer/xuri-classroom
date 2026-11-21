package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.ClassResource;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.UserDeptScopeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;







class AnswerAccessGuardScopeTest {

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final ProjectPartnerMapper projectPartnerMapper = mock(ProjectPartnerMapper.class);

	private final UserDeptScopeService userDeptScopeService = mock(UserDeptScopeService.class);

	private final DeptMapper deptMapper = mock(DeptMapper.class);

	private final ClassPartnerMapper classPartnerMapper = mock(ClassPartnerMapper.class);

	private final ClassResourceMapper classResourceMapper = mock(ClassResourceMapper.class);

	private final AnswerAccessGuard guard = new AnswerAccessGuard(answerMapper, projectPartnerMapper,
			userDeptScopeService, deptMapper, classPartnerMapper, classResourceMapper);

	@BeforeAll
	static void initTableInfo() {
		for (Class<?> type : List.of(Dept.class, ClassPartner.class, ClassResource.class, Answer.class)) {
			TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
					type);
			LambdaUtils.installCache(tableInfo);
		}
	}

	@AfterEach
	void clear() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("老师带了这个班、考试也分配给了这个班：能读这场考试，班级范围只有这一个班")
	void classTeacherCanReadAssignedProject() {
		login("teacher-1", "project:report", "class:detail");
		stubClasses(teachingClass("c1", "5级", null));
		stubPartner("c1");
		stubResources(resource("c1", "p1"));

		Set<String> scope = guard.readableClassIds("p1");

		assertEquals(Set.of("c1"), scope);
		assertTrue(guard.canReadProject("p1"), "有班级级权限就该放行，否则班级抽屉点进去 403");
		assertEquals(Set.of("c1"), guard.readableClassIds("p1"));
	}

	@Test
	@DisplayName("考试没分配给自己的班：读不到，也不会因为可见别的班而放宽")
	void classTeacherCannotReadUnassignedProject() {
		login("teacher-1", "project:report", "class:detail");
		stubClasses(teachingClass("c1", "5级", null), teachingClass("c2", "6级", null));
		stubPartner("c1");
		stubResources(resource("c2", "p1"));

		assertTrue(guard.readableClassIds("p1").isEmpty());
		assertFalse(guard.canReadProject("p1"));
		assertThrows(AccessDeniedException.class, () -> guard.assertProjectAccess("p1"));
	}

	@Test
	@DisplayName("班级级老师只能打开自己班的答卷，换个班的答卷要拒绝")
	void classTeacherCannotOpenOtherClassAnswer() {
		login("teacher-1", "project:report", "class:detail");
		stubClasses(teachingClass("c1", "5级", null), teachingClass("c2", "6级", null));
		stubPartner("c1");
		stubResources(resource("c1", "p1"), resource("c2", "p1"));

		Answer mine = answer("a1", "p1", "c1", "student-1");
		Answer other = answer("a2", "p1", "c2", "student-2");
		guard.assertAnswerAccess(mine);
		assertThrows(AccessDeniedException.class, () -> guard.assertAnswerAccess(other));
	}

	@Test
	@DisplayName("管理员不受班级范围限制")
	void adminSeesEverything() {
		login("admin-1", AppConsts.ROLE_ADMIN);
		assertTrue(guard.canReadProject("p1"));
		guard.assertProjectAccess("p1");
	}

	@Test
	@DisplayName("学员看自己的答卷永远放行；看别人的被拒")
	void studentSeesOwnAnswerOnly() {
		login("student-1", "answer:detail");
		stubClasses();
		guard.assertAnswerAccess(answer("a1", "p1", "c1", "student-1"));
		assertThrows(AccessDeniedException.class, () -> guard.assertAnswerAccess(answer("a2", "p1", "c1", "student-2")));
	}

	/* ====== helpers ====== */

	private void stubClasses(Dept... classes) {
		when(deptMapper.selectList(any())).thenReturn(Arrays.asList(classes));
		when(projectPartnerMapper.selectCount(any())).thenReturn(0L);
		when(userDeptScopeService.resolveDeptScope(any())).thenReturn(Collections.emptySet());
	}

	private void stubPartner(String... deptIds) {
		List<ClassPartner> rows = new java.util.ArrayList<>();
		for (String deptId : deptIds) {
			ClassPartner partner = new ClassPartner();
			partner.setDeptId(deptId);
			partner.setUserId("teacher-1");
			rows.add(partner);
		}
		when(classPartnerMapper.selectList(any())).thenReturn(rows);
	}

	private void stubResources(ClassResource... resources) {
		when(classResourceMapper.selectList(any())).thenReturn(Arrays.asList(resources));
	}

	private ClassResource resource(String classId, String projectId) {
		ClassResource resource = new ClassResource();
		resource.setClassId(classId);
		resource.setResourceId(projectId);
		resource.setResourceType("project");
		return resource;
	}

	private Dept teachingClass(String id, String name, String parentId) {
		Dept dept = new Dept();
		dept.setId(id);
		dept.setName(name);
		dept.setDeptType(Dept.TYPE_CLASS);
		dept.setParentId(parentId);
		return dept;
	}

	private Answer answer(String id, String projectId, String classId, String createBy) {
		Answer answer = new Answer();
		answer.setId(id);
		answer.setProjectId(projectId);
		answer.setClassId(classId);
		answer.setCreateBy(createBy);
		return answer;
	}

	private void login(String userId, String... authorities) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		List<GrantedAuthority> granted = Arrays.stream(authorities)
				.map(SimpleGrantedAuthority::new).map(GrantedAuthority.class::cast).toList();
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

}