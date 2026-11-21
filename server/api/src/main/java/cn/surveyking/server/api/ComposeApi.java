package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.ComposeCreateResult;
import cn.surveyking.server.domain.dto.ComposePickRequest;
import cn.surveyking.server.domain.dto.ComposePlan;
import cn.surveyking.server.domain.dto.ComposeRequest;
import cn.surveyking.server.domain.dto.ComposeStats;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.ComposeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RequiredArgsConstructor
@RestController
@RequestMapping("${api.prefix}/compose")
public class ComposeApi {

	private final ComposeService composeService;

	@GetMapping("/stats")
	@PreAuthorize("hasAnyAuthority('repo:list','project:create','project:update') or hasRole('admin')")
	public ComposeStats stats(@RequestParam(value = "repoIds", required = false) List<String> repoIds) {
		return composeService.stats(repoIds);
	}

	@PostMapping("/plan")
	@PreAuthorize("hasAuthority('project:create') or hasRole('admin')")
	public ComposePlan plan(@RequestBody ComposeRequest request) {
		return composeService.plan(request);
	}

	@PostMapping("/create")
	@PreAuthorize("hasAuthority('project:create') or hasRole('admin')")
	public ComposeCreateResult create(@RequestBody ComposeRequest request) {
		return composeService.create(request);
	}

	@PostMapping("/pick")
	@PreAuthorize("hasAnyAuthority('project:create','project:update') or hasRole('admin')")
	public List<SurveySchema> pick(@RequestBody ComposePickRequest request) {
		return composeService.pick(request);
	}

}
