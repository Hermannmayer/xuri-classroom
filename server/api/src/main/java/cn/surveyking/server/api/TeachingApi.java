package cn.surveyking.server.api;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import cn.surveyking.server.mapper.TeachingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 教学工作台：老师视角的「我的试卷 + 班级作答情况」。
 *
 * <p>与学员的「我的任务」区分开：这里只看自己参与的考试和班级统计，不出现
 * 练习记录 / 我的成绩这类学员入口。
 */
@RestController
@RequestMapping("${api.prefix}/teaching")
@RequiredArgsConstructor
public class TeachingApi {

	private final TeachingMapper teachingMapper;

	@GetMapping("/projects")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public List<TeachingProjectView> myProjects() {
		return teachingMapper.listMyProjects(SecurityContextUtils.getUserId());
	}

	@GetMapping("/classes")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public List<TeachingClassView> classes(@RequestParam String projectId) {
		return teachingMapper.listClasses(projectId);
	}

}
