package cn.surveyking.server.api;

import cn.surveyking.server.core.export.PaperDocxExporter;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/** 试卷导出：Word 版与打印页同源 */
@RequiredArgsConstructor
@RestController
public class PaperExportApi {

	private final ProjectService projectService;

	@GetMapping("${api.prefix}/paper/{id}/docx")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public ResponseEntity<byte[]> docx(@PathVariable("id") String id,
			@RequestParam(value = "answers", defaultValue = "false") boolean answers,
			@RequestParam(value = "card", defaultValue = "false") boolean card) {
		ProjectView project = projectService.getProject(id);
		byte[] bytes = PaperDocxExporter.export(project, answers, card);
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(
				MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
		headers.setContentDisposition(ContentDisposition.builder("attachment")
				.filename((project.getName() == null ? "试卷" : project.getName()) + ".docx", StandardCharsets.UTF_8)
				.build());
		return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
	}

}
