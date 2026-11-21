package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ProjectPartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;





@RestController
@RequestMapping("${api.prefix}/answer")
@RequiredArgsConstructor
public class AnswerApi {

	private final AnswerService answerService;


	private final cn.surveyking.server.service.ExportGuardService exportGuardService;


	private final ClassService classService;


	private final ProjectPartnerService projectPartnerService;






	@PreAuthorize("hasAuthority('answer:list')")
	@EnableDataPerm(key = "#query.projectId")
	@GetMapping("/list")
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		return answerService.listAnswer(query);
	}






	@PreAuthorize("hasAuthority('answer:list')")
	@EnableDataPerm(key = "#query.projectId")
	@GetMapping("/trash")
	public List<AnswerView> listAnswerDeleted(AnswerQuery query) {
		return answerService.listAnswerDeleted(query);
	}






	@GetMapping
	@PreAuthorize("hasAuthority('answer:detail')")
	public AnswerView getAnswer(AnswerQuery query) {
		return answerService.getAnswerWithPermission(query);
	}






	@PostMapping("/create")
	@PreAuthorize("hasAuthority('answer:create')")
	@EnableDataPerm(key = "#request.projectId")
	public void saveAnswer(@RequestBody AnswerRequest request) {
		answerService.saveAnswer(request);
	}





	@PostMapping("/update")
	@PreAuthorize("hasAuthority('answer:update')")
	public void updateAnswer(@RequestBody AnswerRequest request) {
		answerService.updateAnswerWithPermission(request);
	}





	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('answer:delete')")
	public void deleteAnswer(@RequestBody AnswerRequest request) {
		answerService.deleteAnswer(request);
	}





	@PreAuthorize("hasAuthority('answer:delete')")
	@PostMapping("/destroy")
	public void batchDestroyAnswer(@RequestBody AnswerRequest request) {
		answerService.batchDestroyAnswer(request);
	}

	/** 从回收站里面恢复答案 */
	@PreAuthorize("hasAuthority('answer:restore') or hasRole('admin')")
	@PostMapping("/restore")
	public void restoreAnswer(@RequestBody AnswerRequest request) {
		answerService.restoreAnswer(request);
	}






	@GetMapping("/download")
	@PreAuthorize("hasAuthority('answer:export')")


	// 之所以不能继续用方法级注解：按班导出面向「班级可见但不是项目协作者」的老师，注解会先把它挡在门外。
	public ResponseEntity<Resource> download(DownloadQuery query,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {

		if (exportToken != null && !exportToken.isEmpty()) {
			exportGuardService.assertTokenAllowed(exportToken);
		}
		else {
			exportGuardService.assertExportAllowed(exportPassword);
		}
		Locale previous = LocaleContextHolder.getLocale();
		setLocale(query.getLocale());
		try {
			ResponseEntity<Resource> response;
			if (StringUtils.hasText(query.getClassId())) {


				classService.assertVisible(query.getClassId());
				response = toResourceResponse(answerService.downloadByClass(query));
			}
			else {
				assertProjectExportAllowed(query.getProjectId());
				response = answerService.download(query);
			}

			exportGuardService.record(cn.surveyking.server.service.ExportGuardService.EXPORT_ANSWER,
					query.getProjectId(), null, "导出答卷",
					cn.surveyking.server.service.ExportGuardService.answerExportScope(query));
			return response;
		}
		finally {
			LocaleContextHolder.setLocale(previous);
		}
	}







	@PostMapping("/export/token")
	@PreAuthorize("hasAuthority('answer:export')")
	public java.util.Map<String, Object> exportToken(
			@RequestBody(required = false) java.util.Map<String, String> body) {
		return exportGuardService.issueToken(body == null ? null : body.get("exportPassword"));
	}

	/** 不带班级范围时的项目数据权限校验，等价于原来的 @EnableDataPerm(key = "#query.projectId")： 管理员放行；其余要求是项目所有者/协作者（含按用户组授权） */
	private void assertProjectExportAllowed(String projectId) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		if (!StringUtils.hasText(projectId)) {
			throw new AccessDeniedException("未找到对应的问卷");
		}
		if (!projectPartnerService.hasProjectAccess(projectId)) {
			throw new AccessDeniedException("没有权限访问本问卷");
		}
	}

	/** 把下载数据包装成下载响应（与 AnswerService#download 的默认实现保持一致的头） */
	private ResponseEntity<Resource> toResourceResponse(DownloadData download) {
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(download.getFileName()))
				.contentType(download.getMediaType()).body(download.getResource());
	}

	private void setLocale(String localeStr) {
		if (!StringUtils.hasText(localeStr)) {
			return;
		}
		String normalized = localeStr.replace('_', '-');
		LocaleContextHolder.setLocale(Locale.forLanguageTag(normalized));
	}
















	@PostMapping("/upload")
	@PreAuthorize("hasAuthority('answer:upload')")
	public AnswerUploadView upload(AnswerUploadRequest request) {
		return answerService.upload(request);
	}

}