package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.service.ReportService;
import cn.surveyking.server.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

	@GetMapping("/{shortId}")
	@PreAuthorize("hasAuthority('project:report')")
	@EnableDataPerm(key = "#shortId")
	public ReportData getData(@PathVariable String shortId) {
		return reportService.getData(shortId);
	}

}
