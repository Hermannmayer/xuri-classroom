package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ReportService;
import cn.surveyking.server.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@RestController
@RequestMapping("${api.prefix}/report")
@RequiredArgsConstructor
public class ReportApi {

	private final ReportService reportService;

	private final SurveyService surveyService;

	private final ClassService classService;

	/**
	 * 答卷分布统计。
	 *
	 * <p>
	 * 原来挂在 {@code SurveyApi} 的 {@code /api/public} 前缀下（那个前缀只是"不要求登录"），
	 * 结果一个需要报表权限的管理接口长着公开答题接口的 URL。现在移到报表域，URL 与所需权限一致。
	 */
	@PostMapping("/statistics")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public PublicStatisticsView statProject(@RequestBody ProjectQuery query) {
		return surveyService.statProject(query);
	}

	/** 班级报表：班级可见即可看本班，不要求项目协作者；只统计该班（含班级链接匿名）；可按提交时间过滤。 */
	@GetMapping("/class/{shortId}")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public ReportData getClassData(@PathVariable String shortId, @RequestParam("classId") String classId,
			@RequestParam(value = "includeAnonymous", defaultValue = "true") boolean includeAnonymous,
			@RequestParam(value = "startTime", required = false)
			@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date startTime,
			@RequestParam(value = "endTime", required = false)
			@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date endTime) {
		classService.assertVisible(classId);
		return reportService.getData(shortId, includeAnonymous, classId, startTime, endTime);
	}

	/**
	 * 项目报表。classId / startTime / endTime 都可选。
	 *
	 * <p>classId 这里只做窄化，不再单独校验班级可见性：能走到这里的人已经由 {@code @EnableDataPerm}
	 * 保证「看得到整个项目」，按班筛选不会比全项目看到更多；需要「班级可见即可看」的入口是
	 * {@code /report/class/{shortId}}，那里才有 {@link ClassService#assertVisible(String)}。
	 */
	@GetMapping("/{shortId}")
	@PreAuthorize("hasAuthority('project:report')")
	@EnableDataPerm(key = "#shortId")
	public ReportData getData(@PathVariable String shortId,
			@RequestParam(value = "includeAnonymous", defaultValue = "false") boolean includeAnonymous,
			@RequestParam(value = "classId", required = false) String classId,
			@RequestParam(value = "startTime", required = false)
			@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date startTime,
			@RequestParam(value = "endTime", required = false)
			@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date endTime) {
		return reportService.getData(shortId, includeAnonymous, classId, startTime, endTime);
	}

}
