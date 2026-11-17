package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.domain.dto.DownloadQuery;
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

import javax.validation.ValidationException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 班级答卷批量导出 PDF（异步任务版）。
 *
 * <p>
 * 单独一个 Controller 而不是往 {@code AnswerApi} 里塞：按班导出 PDF 的入口、权限口径
 * （班级可见 + 导出密码）和生命周期（建任务 → 轮询 → 取文件）都与现有的同步下载不同，
 * 混在一起会让 AnswerApi 更难读，也更容易在合并时冲突。
 *
 * <p>
 * 权限：
 * <ul>
 * <li>三个接口都要求 {@code answer:export}；</li>
 * <li>创建任务和取文件都要 {@code ClassService#assertVisible(String)}：老师只能导出自己看得见的班；</li>
 * <li>导出密码沿用 {@code ExportGuardService}：优先一次性 token（{@code /api/answer/export/token}），
 * 兼容旧的 {@code exportPassword} 参数；没配置密码时直接放行；</li>
 * <li>任务只能被发起人（或管理员）查看/下载/取消。</li>
 * </ul>
 */
@RestController
@RequestMapping("${api.prefix}/answer/export")
@RequiredArgsConstructor
public class AnswerExportApi {

	/** 导出密码 + 审计 + 一次性 token 的唯一实现，不要在这里另写一套 */
	private final ExportGuardService exportGuardService;

	/** 班级可见性闸门 */
	private final ClassService classService;

	/**
	 * PDF 任务（内存任务表 + 线程池 + ZIP 产物）。
	 *
	 * <p>
	 * 注入的是 shared 里的接口而不是 rdbms 的实现类：{@code AnswerPdfJobServiceImpl} 用到
	 * MyBatis-Plus，而它在 rdbms 是 {@code implementation} 依赖，api 的编译类路径上看不到，
	 * 按实现类注入会编译失败。校验与范围固化都收在
	 * {@link AnswerPdfJobService#createJob(DownloadQuery)} 里，这里直接调用不会绕过校验。
	 */
	private final AnswerPdfJobService answerPdfJobService;

	/**
	 * 创建「按班导出答卷 PDF」任务。
	 *
	 * <p>
	 * 返回 {@code {jobId}} 后前端每 2 秒轮询 {@code GET /pdf-job/{id}} 拿进度，完成后再走
	 * {@code GET /pdf-job/{id}/file} 下载 ZIP。任务创建是瞬间返回的，不会因为几十份答卷把 HTTP 请求拖住。
	 * @param query 导出范围：projectId、classId 必填；attemptNo / startTime / endTime 可选；
	 * includeAnalysis（默认关，考试没结束放解析等于泄题）、includeImages 可选
	 * @param exportToken 一次性导出令牌（优先）
	 * @param exportPassword 导出密码（兼容旧调用）
	 * @return {jobId}
	 */
	@PostMapping("/pdf-job")
	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> createPdfJob(@RequestBody DownloadQuery query,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {
		// 先过导出密码：没有密码的人连渲染任务都不该建（渲染同样吃 CPU）
		assertExportAllowed(exportToken, exportPassword);
		if (query == null || !StringUtils.hasText(query.getClassId())) {
			throw new ValidationException("按班级导出 PDF 需要班级 id");
		}
		// 班级可见性：学员即使有 answer:export，也只能导自己可见的班
		classService.assertVisible(query.getClassId());
		String jobId = answerPdfJobService.createJob(query);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/**
	 * 查任务进度：{status, done, total, failed, bytes, error, message, fileName, progress}。
	 *
	 * <p>
	 * status 取值：queued / running / done / failed / canceled。任务在内存里（不建表），
	 * 进程重启后会返回「导出任务不存在或已过期」。
	 */
	@GetMapping("/pdf-job/{id}")
	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> getPdfJob(@PathVariable("id") String id) {
		return answerPdfJobService.describeJob(id);
	}

	/**
	 * 下载产物 ZIP（每份答卷一个 PDF）。
	 *
	 * <p>
	 * 权限复查：任务归属 + 班级可见性 + 导出令牌/密码都要过；文件被清理或还没生成时按
	 * {@link ErrorCode#FileNotExists} 返回明确提示，不能给一个 0 字节的 zip。
	 */
	@GetMapping("/pdf-job/{id}/file")
	@PreAuthorize("hasAuthority('answer:export')")
	public ResponseEntity<Resource> downloadPdfJob(@PathVariable("id") String id,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {
		assertExportAllowed(exportToken, exportPassword);
		// describeJob 里带归属校验：任务不是自己的（且不是管理员）会直接 403
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
				? "答卷PDF.zip" : String.valueOf(fileNameValue);
		Object doneValue = job.get("done");
		int done = doneValue instanceof Number ? ((Number) doneValue).intValue() : 0;
		Object projectIdValue = job.get("projectId");
		// 真正的数据出口留审计：谁在什么时候导出了哪个班的多少份
		exportGuardService.record(ExportGuardService.EXPORT_ANSWER,
				projectIdValue == null ? null : String.valueOf(projectIdValue), null, "导出答卷 PDF（" + done + " 份）");
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(fileName))
				.contentType(MediaType.parseMediaType("application/zip")).contentLength(size)
				.body(new InputStreamResource(stream));
	}

	/**
	 * 取消任务（前端关掉弹窗时调用）：正在渲染的会在下一份之前停下并删掉半成品；
	 * 已经完成的会把产物一起删掉，避免白占 24 小时磁盘。
	 */
	@DeleteMapping("/pdf-job/{id}")
	@PreAuthorize("hasAuthority('answer:export')")
	public void cancelPdfJob(@PathVariable("id") String id) {
		answerPdfJobService.cancelJob(id);
	}

	/** 与 {@code /api/answer/download} 同一套校验：优先一次性 token，其次密码，没配置密码时放行 */
	private void assertExportAllowed(String exportToken, String exportPassword) {
		if (StringUtils.hasText(exportToken)) {
			exportGuardService.assertTokenAllowed(exportToken);
		}
		else {
			exportGuardService.assertExportAllowed(exportPassword);
		}
	}

}
