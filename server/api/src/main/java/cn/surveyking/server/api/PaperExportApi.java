package cn.surveyking.server.api;

import cn.surveyking.server.core.export.PaperDocxExporter;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** 试卷导出：Word 版与打印页同源 */
@RequiredArgsConstructor
@RestController
public class PaperExportApi {

	private final ProjectService projectService;

	@GetMapping("${api.prefix}/paper/{id}/docx")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public void docx(@PathVariable("id") String id, @RequestParam(value = "answers", defaultValue = "false") boolean answers,
			@RequestParam(value = "card", defaultValue = "false") boolean card, HttpServletResponse response)
			throws IOException {
		ProjectView project = projectService.getProject(id);
		byte[] bytes = PaperDocxExporter.export(project, answers, card);
		response.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
		response.setHeader("Content-Disposition", ContentDisposition.builder("attachment")
				.filename((project.getName() == null ? "试卷" : project.getName()) + ".docx", StandardCharsets.UTF_8)
				.build().toString());
		response.setContentLength(bytes.length);
		response.getOutputStream().write(bytes);
		response.flushBuffer();
	}

}
