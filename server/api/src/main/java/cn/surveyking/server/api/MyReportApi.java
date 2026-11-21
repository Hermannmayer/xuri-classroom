package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.MyReportView;
import cn.surveyking.server.service.MyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;





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
