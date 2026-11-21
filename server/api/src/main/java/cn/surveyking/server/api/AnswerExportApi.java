package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.impl.AnswerAccessGuard;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ExportGuardService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.ValidationException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
























@RestController
@RequestMapping("${api.prefix}/answer/export")
@RequiredArgsConstructor
public class AnswerExportApi {


	private final ExportGuardService exportGuardService;


	private final ClassService classService;








	private final AnswerAccessGuard answerAccessGuard;










	private final AnswerPdfJobService answerPdfJobService;
























	@PostMapping("/pdf-job")
	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> createPdfJob(@RequestBody DownloadQuery query,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {

		assertExportAllowed(exportToken, exportPassword);

		if (query == null || !StringUtils.hasText(query.getProjectId())) {
			throw new ValidationException("导出答卷需要项目 id");
		}
		if (StringUtils.hasText(query.getClassId())) {

			classService.assertVisible(query.getClassId());
		}
		else {


			answerAccessGuard.assertProjectAccess(query.getProjectId());
		}
		String jobId = answerPdfJobService.createJob(query);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}








	@GetMapping("/pdf-job/{id}")
	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> getPdfJob(@PathVariable("id") String id) {
		return answerPdfJobService.describeJob(id);
	}








	@GetMapping("/pdf-job/{id}/file")
	@PreAuthorize("hasAuthority('answer:export')")
	public ResponseEntity<Resource> downloadPdfJob(@PathVariable("id") String id,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {
		assertExportAllowed(exportToken, exportPassword);

		Map<String, Object> job = answerPdfJobService.describeJob(id);
		String classId = job.get("classId") == null ? null : String.valueOf(job.get("classId"));
		if (StringUtils.hasText(classId)) {
			classService.assertVisible(classId);
		}
		if (!answerPdfJobService.isArtifactReady(id)) {
			throw new ErrorCodeException(ErrorCode.FileNotExists, "导出文件还没有生成完成，或已被清理，请重新导出");
		}
		InputStream stream = answerPdfJobService.openArtifact(id);
		long size = answerPdfJobService.artifactSize(id);
		Object fileNameValue = job.get("fileName");

		String fileName = fileNameValue == null || !StringUtils.hasText(String.valueOf(fileNameValue))
				? "答卷导出.zip" : String.valueOf(fileNameValue);
		Object doneValue = job.get("done");
		int done = doneValue instanceof Number ? ((Number) doneValue).intValue() : 0;
		Object projectIdValue = job.get("projectId");

		String projectId = projectIdValue == null ? null : String.valueOf(projectIdValue);

		Map<String, Object> exportScope = new LinkedHashMap<>();
		exportScope.put("projectId", projectId);
		exportScope.put("classId", classId);


		exportScope.put("type", outputNames(job.get("outputs")));
		exportScope.put("count", done);
		exportGuardService.record(ExportGuardService.EXPORT_ANSWER, projectId, null, "导出答卷文件（" + done + " 份）",
				exportScope);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(fileName))
				.contentType(MediaType.parseMediaType("application/zip")).contentLength(size)
				.body(new InputStreamResource(stream));
	}





	@DeleteMapping("/pdf-job/{id}")
	@PreAuthorize("hasAuthority('answer:export')")
	public void cancelPdfJob(@PathVariable("id") String id) {
		answerPdfJobService.cancelJob(id);
	}

	/** 任务里记录的格式列表转成审计里的一个字段值： ["answerPdf","answerImage"] → "answerPdf+answerImage" */
	private static String outputNames(Object outputs) {
		if (!(outputs instanceof List<?>) || ((List<?>) outputs).isEmpty()) {
			return "answerPdf";
		}
		StringBuilder text = new StringBuilder();
		for (Object one : (List<?>) outputs) {
			if (text.length() > 0) {
				text.append('+');
			}
			text.append(String.valueOf(one));
		}
		return text.toString();
	}

	/** 与 /api/answer/download 同一套校验：优先一次性 token，其次密码，没配置密码时放行 */
	private void assertExportAllowed(String exportToken, String exportPassword) {
		if (StringUtils.hasText(exportToken)) {
			exportGuardService.assertTokenAllowed(exportToken);
		}
		else {
			exportGuardService.assertExportAllowed(exportPassword);
		}
	}

}
