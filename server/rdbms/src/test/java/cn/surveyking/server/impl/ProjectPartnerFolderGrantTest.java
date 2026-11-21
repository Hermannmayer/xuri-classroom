package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.domain.mapper.ProjectPartnerViewMapper;
import cn.surveyking.server.service.UserDeptScopeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;






class ProjectPartnerFolderGrantTest {

	private final ProjectPartnerMapper partnerMapper = mock(ProjectPartnerMapper.class);

	private final ProjectMapper projectMapper = mock(ProjectMapper.class);

	private final UserServiceImpl userService = mock(UserServiceImpl.class);

	private final UserDeptScopeService userDeptScopeService = mock(UserDeptScopeService.class);

	private final CacheManager cacheManager = mock(CacheManager.class);

	private final ProjectPartnerViewMapper viewMapper = mock(ProjectPartnerViewMapper.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	private final ProjectPartnerServiceImpl service = new ProjectPartnerServiceImpl(userService,
			userDeptScopeService, cacheManager, viewMapper, answerAccessGuard, projectMapper);

	@BeforeAll
	static void initTableInfo() {
		for (Class<?> type : List.of(ProjectPartner.class, Project.class)) {
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
	@DisplayName("授权文件夹后，里面两层以上的考试也算可见（getProjectPerms 展开子孙）")
	void folderGrantExpandsAllDescendants() {
		login("teacher-1");
		ReflectionTestUtils.setField(service, "baseMapper", partnerMapper);
		when(partnerMapper.getProjectPerms("teacher-1")).thenReturn(List.of("folder-1"));
		when(userDeptScopeService.resolveDeptScope("teacher-1")).thenReturn(Collections.emptySet());
		when(projectMapper.selectList(any())).thenReturn(Arrays.asList(project("folder-1", "0", "folder"),
				project("exam-1", "folder-1", "exam"), project("folder-2", "folder-1", "folder"),
				project("exam-2", "folder-2", "exam")));

		Set<String> perms = new java.util.LinkedHashSet<>(service.getProjectPerms());

		assertTrue(perms.contains("exam-1"));
		assertTrue(perms.contains("exam-2"), "第二层文件夹里的考试也要继承：" + perms);
	}

	@Test
	@DisplayName("编辑级别也沿祖先链继承：文件夹授权 level=2 → 里面考试可编辑")
	void accessLevelInheritsFromAncestorFolder() {
		login("teacher-1");
		ReflectionTestUtils.setField(service, "baseMapper", partnerMapper);
		when(userDeptScopeService.resolveDeptScope("teacher-1")).thenReturn(Collections.emptySet());
		when(projectMapper.selectById("exam-2")).thenReturn(project("exam-2", "folder-2", "exam"));
		when(projectMapper.selectById("folder-2")).thenReturn(project("folder-2", "folder-1", "folder"));
		when(projectMapper.selectById("folder-1")).thenReturn(project("folder-1", "0", "folder"));

		when(partnerMapper.selectList(any())).thenReturn(Collections.emptyList(), Collections.emptyList(),
				List.of(collaborator("folder-1", 2)));

		assertEquals(2, service.accessLevel("exam-2"));
	}

	/* ====== helpers ====== */

	private Project project(String id, String parentId, String mode) {
		Project project = new Project();
		project.setId(id);
		project.setParentId(parentId);
		project.setMode(cn.surveyking.server.core.constant.ProjectModeEnum.valueOf(mode));
		return project;
	}

	private ProjectPartner collaborator(String projectId, int level) {
		ProjectPartner partner = new ProjectPartner();
		partner.setProjectId(projectId);
		partner.setType(cn.surveyking.server.core.constant.ProjectPartnerTypeEnum.COLLABORATOR.getType());
		partner.setAccessLevel(level);
		partner.setUserId("teacher-1");
		return partner;
	}

	private void login(String userId) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		List<GrantedAuthority> granted = List.of(new SimpleGrantedAuthority("project:report"));
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

}