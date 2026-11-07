package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.MyReportView;
import cn.surveyking.server.service.MyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 我的成绩。单独用 /my-report 而不是挂在 /report 下，
 * 否则会和已有的 GET /api/report/{shortId} 抢同一个路径模式。
 */
@RestController
@RequestMapping("${api.prefix}/my-report")
@RequiredArgsConstructor
public class MyReportApi {

	private final MyReportService myReportService;

	@GetMapping("/list")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public List<MyReportView> listMine() {
		return myReportService.listMine();
	}

}
