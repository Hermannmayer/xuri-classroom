package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.export.AnswerConfirmSheetExporter;
import cn.surveyking.server.core.export.AnswerImageExporter;
import cn.surveyking.server.core.export.AnswerPdfExporter;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.SysInfo;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.SysInfoMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.storage.StorageProperties;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;




























@Service
@RequiredArgsConstructor
@Slf4j
public class AnswerPdfJobServiceImpl implements AnswerPdfJobService {


	public static final String STATUS_QUEUED = "queued";


	public static final String STATUS_RUNNING = "running";


	public static final String STATUS_DONE = "done";


	public static final String STATUS_FAILED = "failed";


	public static final String STATUS_CANCELED = "canceled";


	private static final String EXPORT_DIR = "export";


	private static final long ARTIFACT_TTL_MILLIS = 24L * 60L * 60L * 1000L;


	private static final int QUEUE_CAPACITY = 2;

	private static final int MIN_CONCURRENCY = 1;

	private static final int MAX_CONCURRENCY = 2;


	private static final int DEFAULT_CONCURRENCY = 1;


	private static final int PAGE_SIZE = 50;


	private static final long INTERVAL_SLEEP_MILLIS = 30L;


	private static final int MAX_JOBS = 30;


	private static final String SYS_INFO_ID = "1";


	private static final ConcurrentHashMap<String, ExportJob> JOBS = new ConcurrentHashMap<>();

	private final AnswerMapper answerMapper;

	private final AnswerViewMapper answerViewMapper;

	private final ProjectMapper projectMapper;

	private final DeptMapper deptMapper;

	private final UserMapper userMapper;

	private final SysInfoMapper sysInfoMapper;

	private final FileService fileService;

	private final StorageProperties storageProperties;


	private final AnswerAccessGuard answerAccessGuard;





	private final ThreadPoolExecutor pool = new ThreadPoolExecutor(DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY, 60L,
			TimeUnit.SECONDS, new ArrayBlockingQueue<>(QUEUE_CAPACITY), runnable -> {
				Thread thread = new Thread(runnable, "answer-pdf-export");
				thread.setDaemon(true);
				return thread;
			}, new ThreadPoolExecutor.AbortPolicy());

	@PostConstruct
	public void init() {

		pool.allowCoreThreadTimeOut(true);
		if (!AnswerPdfExporter.isFontAvailable()) {
			log.error("答卷 PDF 字体缺失（{}），导出接口会直接报错：{}", AnswerPdfExporter.FONT_RESOURCE,
					AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
	}



	/** 从导出请求创建任务（Controller 与 AnswerServiceImpl#downloadPdfByClass 共用）： 校验项目/班级/类型后固化成 ExportSpec 快照，再交给线程池；返回 任务 id */
	@Override
	public String createJob(DownloadQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "导出答卷需要项目 id");
		}
		List<DownloadQuery.DownloadType> outputs = resolveOutputs(query);
		if (projectMapper.selectById(query.getProjectId()) == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "项目不存在");
		}
		return createJob(specOf(query, outputs));
	}

	/** 把导出请求固化成任务快照；返回 任务快照 */
	static ExportSpec specOf(DownloadQuery query, List<DownloadQuery.DownloadType> outputs) {
		return new ExportSpec().projectId(query.getProjectId()).classId(query.getClassId()).ids(query.getIds())
				.attemptNo(query.getAttemptNo()).startTime(query.getStartTime()).endTime(query.getEndTime())
				.gradeStatus(query.getGradeStatus()).createByName(query.getCreateByName())
				.minScore(query.getMinScore()).maxScore(query.getMaxScore())
				.includeAnonymous(query.getIncludeAnonymous())
				.includeAnalysis(Boolean.TRUE.equals(query.getIncludeAnalysis()))

				.includeImages(true).outputs(outputs);
	}


	private static final List<DownloadQuery.DownloadType> ANSWER_OUTPUT_TYPES = Collections
			.unmodifiableList(Arrays.asList(DownloadQuery.DownloadType.answerPdf,
					DownloadQuery.DownloadType.answerSheetPdf, DownloadQuery.DownloadType.answerImage,
					DownloadQuery.DownloadType.confirmSheetPdf));

	/** 把导出台账（outputs / type）归一成真正要生成的文件类型列表；返回 去重后的格式列表（顺序即渲染顺序），永不为空 */
	static List<DownloadQuery.DownloadType> resolveOutputs(DownloadQuery query) {
		List<DownloadQuery.DownloadType> requested = query == null ? null : query.getOutputs();
		if (requested == null || requested.isEmpty()) {

			DownloadQuery.DownloadType type = query == null || query.getType() == null
					? DownloadQuery.DownloadType.answerPdf : query.getType();
			assertAnswerOutput(type);
			return Collections.singletonList(type);
		}
		List<DownloadQuery.DownloadType> resolved = new ArrayList<>();
		for (DownloadQuery.DownloadType output : requested) {

			assertAnswerOutput(output);
			if (!resolved.contains(output)) {
				resolved.add(output);
			}
		}
		return Collections.unmodifiableList(resolved);
	}

	private static void assertAnswerOutput(DownloadQuery.DownloadType type) {
		if (type == null || !ANSWER_OUTPUT_TYPES.contains(type)) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"答卷导出任务只支持答卷相关导出类型（成绩单 PDF / 答题卷 PDF / 长图 PNG / 成绩确认单 PDF）");
		}
	}

	/** 创建导出任务；返回 任务 id */
	public String createJob(ExportSpec spec) {
		if (spec == null || !StringUtils.hasText(spec.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "导出答卷需要项目 id");
		}
		if (spec.getOutputs() == null || spec.getOutputs().isEmpty()) {

			spec.outputs(Collections.singletonList(DownloadQuery.DownloadType.answerPdf));
		}


		if (spec.getClassScope() == null && !answerAccessGuard.canManageProject(spec.getProjectId())) {
			Set<String> scope = answerAccessGuard.readableClassIds(spec.getProjectId());
			spec.classScope(scope.isEmpty() ? Collections.emptyList() : new ArrayList<>(scope));
		}
		for (DownloadQuery.DownloadType output : spec.getOutputs()) {
			assertAnswerOutput(output);
		}
		if (!AnswerPdfExporter.isFontAvailable()) {

			throw new InternalServerError(AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
		assertNotDuringExam();
		applyConcurrency(concurrency());
		pruneExpired();
		if (JOBS.size() >= MAX_JOBS) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "当前 PDF 导出任务过多，请稍后再试");
		}
		ExportJob job = new ExportJob(UUID.randomUUID().toString().replace("-", ""), spec);
		JOBS.put(job.getId(), job);
		try {
			job.setFuture(pool.submit(() -> run(job)));
		}
		catch (RejectedExecutionException rejected) {
			JOBS.remove(job.getId());
			throw new ErrorCodeException(ErrorCode.ValidationError, "当前 PDF 导出任务过多，请稍后再试");
		}
		log.info("创建答卷导出任务: jobId={}, projectId={}, classId={}, attemptNo={}, outputs={}, operator={}",
				job.getId(), spec.getProjectId(), spec.getClassId(), spec.getAttemptNo(), spec.getOutputs(),
				job.getOperatorId());
		return job.getId();
	}

	/** 查任务状态（带归属校验：只能看自己发起的，管理员除外） */
	@Override
	public Map<String, Object> describeJob(String jobId) {
		ExportJob job = JOBS.get(jobId);
		if (job == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "导出任务不存在或已过期，请重新导出");
		}
		assertOwner(job);
		Map<String, Object> view = describe(job);
		view.put("projectId", job.getSpec().getProjectId());
		view.put("classId", job.getSpec().getClassId());
		return view;
	}

	/** 取消任务：正在跑的会在下一份之前停下；已经完成的直接删产物 */
	@Override
	public boolean cancelJob(String jobId) {
		ExportJob job = JOBS.get(jobId);
		if (job == null) {
			return false;
		}
		assertOwner(job);
		job.setCanceled(true);
		Future<?> future = job.getFuture();
		if (future != null && !future.isDone()) {
			future.cancel(true);
		}
		if (STATUS_QUEUED.equals(job.getStatus())) {

			job.setStatus(STATUS_CANCELED);
			job.setMessage("已取消");
			job.touchFinished();
		}
		if (STATUS_DONE.equals(job.getStatus())) {
			deleteArtifact(jobId);
			JOBS.remove(jobId);
		}
		log.info("取消答卷 PDF 导出任务: jobId={}", jobId);
		return true;
	}

	/** 产物是否就绪 */
	@Override
	public boolean isArtifactReady(String jobId) {
		ExportJob job = JOBS.get(jobId);
		return job != null && STATUS_DONE.equals(job.getStatus()) && Files.isRegularFile(exportFile(jobId));
	}

	/** 打开产物（流由调用方关闭）；文件不在按「附件不存在」返回 */
	@Override
	public InputStream openArtifact(String jobId) {
		Path file = exportFile(jobId);
		if (!Files.isRegularFile(file)) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		try {
			return Files.newInputStream(file);
		}
		catch (IOException e) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
	}

	@Override
	public long artifactSize(String jobId) {
		try {
			return Files.size(exportFile(jobId));
		}
		catch (IOException e) {
			return 0L;
		}
	}

	/** 转成前端要的字段：{status, done, total, failed, bytes, error, message, fileName, progress} */
	private Map<String, Object> describe(ExportJob job) {
		Map<String, Object> view = new LinkedHashMap<>();
		view.put("jobId", job.getId());
		view.put("status", job.getStatus());
		view.put("total", Integer.valueOf(job.getTotal()));
		view.put("done", Integer.valueOf(job.getDone()));
		view.put("failed", Integer.valueOf(job.getFailed()));
		view.put("bytes", Long.valueOf(job.getBytes()));
		view.put("error", job.getError());
		view.put("message", job.getMessage());
		view.put("fileName", job.getFileName());

		view.put("outputs", outputNames(job.getSpec().getOutputs()));
		int total = job.getTotal();
		view.put("progress", Integer.valueOf(total <= 0 ? 0 : Math.min(100, job.getDone() * 100 / total)));
		return view;
	}

	/** 格式枚举名列表（审计/前端用英文枚举，别把中文目录名当接口字段） */
	private static List<String> outputNames(List<DownloadQuery.DownloadType> outputs) {
		List<String> names = new ArrayList<>();
		if (outputs != null) {
			for (DownloadQuery.DownloadType output : outputs) {
				names.add(output == null ? "" : output.name());
			}
		}
		return names;
	}

	/** ======================= 任务执行 ======================= */

	private void run(ExportJob job) {
		job.setStatus(STATUS_RUNNING);
		Path temp = null;
		try {
			Project project = projectMapper.selectById(job.getSpec().getProjectId());
			if (project == null) {
				throw new ErrorCodeException(ErrorCode.ProjectNotFound);
			}
			ProjectView projectView = toProjectView(project);
			String className = className(job.getSpec().getClassId());
			int total = countAnswers(job.getSpec());
			job.setTotal(total);
			if (total <= 0) {
				job.setStatus(STATUS_FAILED);

				job.setError(StringUtils.hasText(job.getSpec().getClassId())
						? "这个班还没有可导出的答卷（暂存草稿不会生成导出文件）"
						: "这个范围里还没有可导出的答卷（暂存草稿不会生成导出文件）");
				job.touchFinished();
				return;
			}
			Path dir = exportDirectory();
			Files.createDirectories(dir);
			temp = Files.createTempFile(dir, job.getId() + "-", ".part");
			Set<String> usedNames = new HashSet<>();

			boolean withRoster = hasOutput(job.getSpec(), DownloadQuery.DownloadType.confirmSheetPdf);
			List<AnswerConfirmSheetExporter.Entry> rosterRows = new ArrayList<>();
			AnswerConfirmSheetExporter.ConfirmOptions confirmOptions = new AnswerConfirmSheetExporter.ConfirmOptions();

			Map<String, String> classLabels = new LinkedHashMap<>();
			try (OutputStream fileOut = Files.newOutputStream(temp, StandardOpenOption.WRITE,
					StandardOpenOption.TRUNCATE_EXISTING);
					ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(fileOut))) {
				int page = 1;
				while (true) {
					assertNotCanceled(job);
					List<Answer> answers = queryAnswers(job.getSpec(), page);
					if (answers.isEmpty()) {
						break;
					}
					List<AnswerView> views = toViews(answers);
					for (int i = 0; i < views.size(); i++) {
						assertNotCanceled(job);
						Answer answer = answers.get(i);
						AnswerView view = views.get(i);
						renderOne(zip, projectView, className, answer, view, usedNames, job);
						if (withRoster) {

							rosterRows.add(AnswerConfirmSheetExporter.entryOf(projectView, view,
									classLabelOf(answer, className, classLabels), confirmOptions));
						}
						sleepBetweenAnswers();
					}
					if (answers.size() < PAGE_SIZE) {
						break;
					}
					page = page + 1;
				}
				assertNotCanceled(job);
				if (withRoster) {
					writeRoster(zip, usedNames, projectView, className, rosterRows, job);
				}
			}
			assertNotCanceled(job);
			if (allFailed(job)) {


				job.setStatus(STATUS_FAILED);
				job.setError("全部 " + job.getTotal() + " 份答卷都生成失败：" + failedDetail(job));
				job.touchFinished();
				log.warn("答卷导出全部失败: jobId={}, failed={}", job.getId(), Integer.valueOf(job.getFailed()));
				return;
			}
			Path target = exportFile(job.getId());
			Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
			temp = null;
			job.setBytes(Files.size(target));
			job.setFileName(zipFileName(project, className, job.getSpec().getOutputs()));
			job.setMessage(summary(job));
			job.setStatus(STATUS_DONE);
			job.touchFinished();
			log.info("答卷导出完成: jobId={}, done={}, files={}, failed={}, bytes={}", job.getId(),
					Integer.valueOf(job.getDone()), Integer.valueOf(job.getFilesWritten()),
					Integer.valueOf(job.getFailed()), Long.valueOf(job.getBytes()));
		}
		catch (CanceledException e) {
			job.setStatus(STATUS_CANCELED);
			job.setMessage("已取消");
			job.touchFinished();
			log.info("答卷导出已取消: jobId={}", job.getId());
		}
		catch (ErrorCodeException e) {
			job.setStatus(STATUS_FAILED);
			job.setError(e.getMessage());
			job.touchFinished();
			log.warn("答卷导出失败: jobId={}, {}", job.getId(), e.getMessage());
		}
		catch (Exception e) {
			job.setStatus(STATUS_FAILED);
			job.setError("生成答卷导出文件失败：" + e.getMessage());
			job.touchFinished();
			log.error("答卷导出异常: jobId={}", job.getId(), e);
		}
		finally {
			if (temp != null) {
				deleteQuietly(temp);
			}
		}
	}

	/** 渲染一份答卷的所有格式（真渲染器），逐个写进 ZIP；单份/单格式失败只记失败数，不中断整批 */
	void renderOne(ZipOutputStream zip, ProjectView project, String className, Answer answer, AnswerView view,
			Set<String> usedNames, ExportJob job) throws IOException {
		renderOne(zip, project, className, answer, view, usedNames, job, this::renderOutput);
	}

	/** 渲染一份答卷的所有格式（包内可见，单测用假渲染器替换真正的 PDF/PNG 生成） */
	void renderOne(ZipOutputStream zip, ProjectView project, String className, Answer answer, AnswerView view,
			Set<String> usedNames, ExportJob job, OutputRenderer renderer) throws IOException {
		String displayName = displayName(answer);
		boolean anyOk = false;
		for (DownloadQuery.DownloadType output : job.getSpec().getOutputs()) {
			if (output == DownloadQuery.DownloadType.confirmSheetPdf) {

				continue;
			}
			try {
				byte[] bytes = renderer.render(output, project, view, answer, className, job.getSpec());


				String entryName = uniqueEntryName(usedNames, outputDir(output), output, entryBaseName(answer));
				zip.putNextEntry(new ZipEntry(entryName));
				zip.write(bytes);
				zip.closeEntry();
				anyOk = true;
				job.incWritten();
			}
			catch (Exception e) {


				job.incFailed(displayName + "（" + outputDir(output) + "）");
				log.warn("答卷导出失败，已跳过: answerId={}, name={}, output={}, {}", answer.getId(), displayName, output,
						e.getMessage());
			}
		}
		if (anyOk) {
			job.incDone();
		}
	}

	/** 名册：整班/整卷一张表，只写一个文件（确认单不再一人一页） */
	void writeRoster(ZipOutputStream zip, Set<String> usedNames, ProjectView project, String className,
			List<AnswerConfirmSheetExporter.Entry> rows, ExportJob job) throws IOException {
		try {
			byte[] pdf = AnswerConfirmSheetExporter.renderRoster(project, rows, className,
					new AnswerConfirmSheetExporter.ConfirmOptions());
			DownloadQuery.DownloadType rosterType = DownloadQuery.DownloadType.confirmSheetPdf;
			String entryName = uniqueEntryName(usedNames, outputDir(rosterType), rosterType,
					rosterBaseName(project, className));
			zip.putNextEntry(new ZipEntry(entryName));
			zip.write(pdf);
			zip.closeEntry();
			job.incWritten();


			job.incDone(job.getTotal() - job.getDone());
		}
		catch (Exception e) {
			job.incFailed("成绩确认单");
			log.warn("成绩确认单名册生成失败，已跳过: jobId={}, rows={}, {}", job.getId(),
					Integer.valueOf(rows.size()), e.getMessage());
		}
	}

	/** 名册文件名主体：成绩确认单--（去重与扩展名交给 uniqueEntryName） */
	private String rosterBaseName(ProjectView project, String className) {
		String scope = StringUtils.hasText(className) ? className
				: (project != null && StringUtils.hasText(project.getName()) ? project.getName() : "答卷");
		return "成绩确认单-" + scope + "-" + new SimpleDateFormat("yyyyMMddHHmm").format(new Date());
	}

	/** 名册「班级」列：按班导出时全班同名（直接用任务上的班级名）； 整卷/勾选导出时每份答卷各自的班不同，去查一次班级名并缓存（一个班只查一次） */
	private String classLabelOf(Answer answer, String jobClassName, Map<String, String> cache) {
		if (StringUtils.hasText(jobClassName)) {
			return jobClassName;
		}
		String classId = answer.getClassId();
		if (!StringUtils.hasText(classId)) {
			return null;
		}
		if (cache.containsKey(classId)) {
			return cache.get(classId);
		}
		String name = className(classId);
		cache.put(classId, name);
		return name;
	}

	private static boolean hasOutput(ExportSpec spec, DownloadQuery.DownloadType type) {
		return spec != null && spec.getOutputs() != null && spec.getOutputs().contains(type);
	}

	/** 渲染单个格式的字节：四种格式对应四个导出器，这里只负责把选项装好 */
	private byte[] renderOutput(DownloadQuery.DownloadType output, ProjectView project, AnswerView view, Answer answer,
			String className, ExportSpec spec) {
		// 导出任务按需取字段；视图缺分/缺答案时用原始 Answer 兜底，避免 PDF 显示 0 分/全错
		if (view != null && answer != null) {
			if (view.getExamScore() == null) {
				view.setExamScore(answer.getExamScore());
			}
			if (view.getExamInfo() == null || view.getExamInfo().getQuestionScore() == null
					|| view.getExamInfo().getQuestionScore().isEmpty()) {
				view.setExamInfo(answer.getExamInfo());
			}
			if (view.getGradeStatus() == null) {
				view.setGradeStatus(answer.getGradeStatus());
			}
			if (view.getAnswer() == null) {
				view.setAnswer(answer.getAnswer());
			}
		}
		AnswerPdfExporter.PdfOptions options = new AnswerPdfExporter.PdfOptions().attemptNo(answer.getAttemptNo())
				.includeAnalysis(spec.isIncludeAnalysis())

				.includeImages(true).classLabel(className).imageLoader(this::loadFileBytes);
		switch (output) {
			case answerSheetPdf:
				return AnswerPdfExporter.renderAnswer(project, view,
						options.style(AnswerPdfExporter.Style.ANSWER_SHEET));
			case answerImage:

				return AnswerImageExporter.renderAnswerImage(project, view, options);
			case confirmSheetPdf:

				return AnswerConfirmSheetExporter.renderConfirmSheet(project, view, className,
						new AnswerConfirmSheetExporter.ConfirmOptions().attemptNo(answer.getAttemptNo()));
			case answerPdf:
			default:
				return AnswerPdfExporter.renderAnswer(project, view,
						options.style(AnswerPdfExporter.Style.GRADE_REPORT));
		}
	}





	interface OutputRenderer {

		byte[] render(DownloadQuery.DownloadType output, ProjectView project, AnswerView view, Answer answer,
				String className, ExportSpec spec);

	}

	/** 全部文件都失败才算整任务失败：有任何一个格式成功，任务就是 done（失败数照实报） */
	static boolean allFailed(ExportJob job) {
		return job != null && job.getFilesWritten() <= 0 && job.getFailed() > 0;
	}

	/** 失败明细：优先列「谁（哪种格式）」，一条都没有时给一句可查的提示 */
	private String failedDetail(ExportJob job) {
		List<String> names = job.getFailedNames();
		return names.isEmpty() ? "请检查答卷数据与服务端日志" : "失败项：" + String.join("、", names);
	}

	private void assertNotCanceled(ExportJob job) {
		if (job.isCanceled() || Thread.currentThread().isInterrupted()) {
			throw new CanceledException();
		}
	}

	/** 每份之间让一下 CPU：学生可能正在答题，渲染不该把 4 核全吃掉 */
	private void sleepBetweenAnswers() {
		try {
			Thread.sleep(INTERVAL_SLEEP_MILLIS);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new CanceledException();
		}
	}

	private String summary(ExportJob job) {
		StringBuilder text = new StringBuilder();

		text.append("成功 ").append(job.getDone()).append(" 份（").append(job.getFilesWritten()).append(" 个文件）");
		if (job.getFailed() > 0) {
			text.append("，失败 ").append(job.getFailed()).append(" 个");
			List<String> names = job.getFailedNames();
			if (!names.isEmpty()) {
				text.append("（").append(String.join("、", names)).append("）");
			}
		}
		return text.toString();
	}



	/** 导出取数条件：与数据页列表（AnswerServiceImpl#listAnswer）逐条同口径 */
	private LambdaQueryWrapper<Answer> baseWrapper(ExportSpec spec) {
		return Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, spec.getProjectId())



				.eq(StringUtils.hasText(spec.getClassId()), Answer::getClassId, spec.getClassId())

				.in(spec.getClassScope() != null && !spec.getClassScope().isEmpty(), Answer::getClassId,
						spec.getClassScope())
				.isNotNull(Answer::getAnswer)

				.and(wrapper -> wrapper.eq(Answer::getTempSave, 1).or().isNull(Answer::getTempSave))
				.in(spec.getIds() != null && !spec.getIds().isEmpty(), Answer::getId, spec.getIds())
				.eq(spec.getAttemptNo() != null, Answer::getAttemptNo, spec.getAttemptNo())

				.eq(StringUtils.hasText(spec.getGradeStatus()), Answer::getGradeStatus, spec.getGradeStatus())


				.ge(spec.getMinScore() != null, Answer::getExamScore, spec.getMinScore())
				.le(spec.getMaxScore() != null, Answer::getExamScore, spec.getMaxScore())


				.and(StringUtils.hasText(spec.getCreateByName()), filter -> {
					String like = answererNameLike(spec.getCreateByName());
					filter.apply("answerer_name like {0}", like).or()
							.apply("create_by in (select id from t_user where name like {0})", like);
				})


				.eq(Boolean.FALSE.equals(spec.getIncludeAnonymous()), Answer::getIsAnonymous, false)
				.gt(spec.getStartTime() != null, Answer::getCreateAt, spec.getStartTime())
				.lt(spec.getEndTime() != null, Answer::getCreateAt, spec.getEndTime());
	}

	/** 姓名模糊查询的 LIKE 模式串：转义 \ % _，让「张_」只按字面量匹配 （MySQL LIKE 的默认转义符就是 \） */
	static String answererNameLike(String keyword) {
		String text = keyword.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
		return "%" + text + "%";
	}

	private int countAnswers(ExportSpec spec) {
		long total = answerMapper.selectCount(baseWrapper(spec)).longValue();
		if (total > Integer.MAX_VALUE) {
			return Integer.MAX_VALUE;
		}
		return (int) total;
	}

	/** 分页取答卷：大字段 survey/temp_answer 一律不读，避免把整场答卷读进内存 */
	private List<Answer> queryAnswers(ExportSpec spec, int page) {
		LambdaQueryWrapper<Answer> wrapper = baseWrapper(spec)
				.select(Answer::getId, Answer::getProjectId, Answer::getClassId, Answer::getCreateBy,
						Answer::getAnswererName, Answer::getAnswer, Answer::getMetaInfo, Answer::getExamScore,
						Answer::getExamInfo, Answer::getTempSave, Answer::getAttemptNo, Answer::getGradeStatus,
						Answer::getIsAnonymous, Answer::getCreateAt)
				.orderByAsc(Answer::getCreateAt);
		return answerMapper.selectPage(new Page<>(page, PAGE_SIZE), wrapper).getRecords();
	}

	/** 模型转视图 + 批量补答题人姓名（一页一次 in 查询，不做 N+1） */
	private List<AnswerView> toViews(List<Answer> answers) {
		List<AnswerView> views = answerViewMapper.toView(answers);
		Set<String> userIds = new HashSet<>();
		for (Answer answer : answers) {
			if (StringUtils.hasText(answer.getCreateBy())) {
				userIds.add(answer.getCreateBy());
			}
		}
		if (userIds.isEmpty()) {
			return views;
		}
		Map<String, String> names = new LinkedHashMap<>();
		List<User> users = userMapper.selectBatchIds(userIds);
		if (users != null) {
			for (User user : users) {
				if (user != null && StringUtils.hasText(user.getName())) {
					names.put(user.getId(), user.getName());
				}
			}
		}
		for (AnswerView view : views) {
			if (view != null && StringUtils.hasText(view.getCreateBy())) {
				view.setCreateByName(names.get(view.getCreateBy()));
			}
		}
		return views;
	}

	private ProjectView toProjectView(Project project) {
		ProjectView view = new ProjectView();
		BeanUtils.copyProperties(project, view);
		return view;
	}

	private String className(String classId) {
		if (!StringUtils.hasText(classId)) {
			return null;
		}
		Dept dept = deptMapper.selectById(classId);
		return dept == null ? null : dept.getName();
	}

	/** ======================= 文件名 / 产物 ======================= */

	private String displayName(Answer answer) {
		if (StringUtils.hasText(answer.getAnswererName())) {
			return answer.getAnswererName().trim();
		}
		if (Boolean.TRUE.equals(answer.getIsAnonymous())) {
			return "匿名";
		}
		return StringUtils.hasText(answer.getCreateBy()) ? "账号" + answer.getCreateBy() : "答卷";
	}

	private String entryBaseName(Answer answer) {
		StringBuilder name = new StringBuilder(displayName(answer));
		Integer attemptNo = answer.getAttemptNo();
		if (attemptNo != null && attemptNo.intValue() > 0) {
			name.append("_第").append(attemptNo.intValue() + 1).append("次");
		}
		return name.toString();
	}

	/** ZIP 条目名：子目录/姓名.扩展名，重名在同一个子目录里加 (2)、(3)… */
	private String uniqueEntryName(Set<String> usedNames, String dir, DownloadQuery.DownloadType output,
			String baseName) {
		String ext = outputExt(output);
		String safe = sanitizeEntryName(baseName);
		String prefix = StringUtils.hasText(dir) ? dir + "/" : "";
		String candidate = prefix + safe + "." + ext;
		int index = 2;
		while (!usedNames.add(candidate)) {
			candidate = prefix + safe + "(" + index + ")." + ext;
			index = index + 1;
		}
		return candidate;
	}

	/** ZIP 子目录名 */
	static String outputDir(DownloadQuery.DownloadType output) {
		switch (output) {
			case answerSheetPdf:
				return "答题卷";
			case answerImage:
				return "长图";
			case confirmSheetPdf:
				return "确认单";
			case answerPdf:
			default:
				return "成绩单";
		}
	}

	/** 长图是 PNG，其余都是 PDF：扩展名错了 Windows 会拿错程序打开（也发不进微信九宫格） */
	static String outputExt(DownloadQuery.DownloadType output) {
		return output == DownloadQuery.DownloadType.answerImage ? "png" : "pdf";
	}

	/** ZIP 条目名：去掉路径分隔符与 Windows 非法字符，最长 120 字 */
	private String sanitizeEntryName(String name) {
		String text = StringUtils.hasText(name) ? name.replace('\\', '_').replace('/', '_') : "答卷";
		StringBuilder safe = new StringBuilder();
		for (int i = 0; i < text.length(); i++) {
			char ch = text.charAt(i);
			if (ch < 0x20 || ch == 0x7f || ch == ':' || ch == '*' || ch == '?' || ch == '"' || ch == '<' || ch == '>'
					|| ch == '|') {
				safe.append('_');
			}
			else {
				safe.append(ch);
			}
		}
		String result = safe.toString().replace("..", "_").trim();
		if (!StringUtils.hasText(result)) {
			result = "答卷";
		}
		return result.length() > 120 ? result.substring(0, 120) : result;
	}

	/** ZIP 文件名：项目名[-班级]-格式标签-时间.zip */
	private String zipFileName(Project project, String className, List<DownloadQuery.DownloadType> outputs) {
		StringBuilder name = new StringBuilder();
		name.append(StringUtils.hasText(project.getName()) ? project.getName() : "答卷");
		if (StringUtils.hasText(className)) {
			name.append("-").append(className);
		}
		name.append("-").append(zipFormatTag(outputs)).append("-")
				.append(new SimpleDateFormat("yyyyMMddHHmm").format(new Date())).append(".zip");
		return name.toString();
	}

	/** ZIP 名里的格式标签（见 #zipFileName），单独抽出来是为了能被单测直接盯住 */
	static String zipFormatTag(List<DownloadQuery.DownloadType> outputs) {
		if (outputs == null || outputs.isEmpty()) {
			return "答卷PDF";
		}
		if (outputs.size() == 1) {
			DownloadQuery.DownloadType only = outputs.get(0);
			return only == DownloadQuery.DownloadType.answerPdf ? "答卷PDF" : outputDir(only);
		}
		List<String> tags = new ArrayList<>();
		for (DownloadQuery.DownloadType output : outputs) {
			tags.add(outputDir(output));
		}
		return String.join("+", tags);
	}

	/** 产物目录：跟着 file-storage.local.root-path 走（不硬编码），没配就放系统临时目录 */
	private Path exportDirectory() {
		StorageProperties.LocalStorage local = storageProperties.getLocal();
		String root = local == null ? null : local.getRootPath();
		Path base = StringUtils.hasText(root) ? Paths.get(root)
				: Paths.get(System.getProperty("java.io.tmpdir"), "surveyking");
		return base.toAbsolutePath().normalize().resolve(EXPORT_DIR);
	}

	private Path exportFile(String jobId) {
		return exportDirectory().resolve(sanitizeEntryName(jobId) + ".zip");
	}

	private void deleteArtifact(String jobId) {
		deleteQuietly(exportFile(jobId));
	}

	private void deleteQuietly(Path path) {
		if (path == null) {
			return;
		}
		try {
			Files.deleteIfExists(path);
		}
		catch (IOException e) {
			log.warn("删除 PDF 导出产物失败: {}, {}", path, e.getMessage());
		}
	}



	/** fileId -> 原图字节：签名题/上传题的图片要靠 FileService 从存储读 */
	private byte[] loadFileBytes(String fileId) {
		if (!StringUtils.hasText(fileId)) {
			return null;
		}
		try {
			ResponseEntity<Resource> response = fileService.loadFile(new FileQuery(fileId));
			Resource resource = response == null ? null : response.getBody();
			if (resource == null) {
				return null;
			}
			try (InputStream in = resource.getInputStream();
					ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
				byte[] buffer = new byte[8192];
				int read;
				while ((read = in.read(buffer)) > 0) {
					out.write(buffer, 0, read);
				}
				return out.toByteArray();
			}
		}
		catch (Exception e) {
			log.warn("读取答卷附件失败（跳过该图片）: fileId={}, {}", fileId, e.getMessage());
			return null;
		}
	}

	/** ======================= 系统设置 / 并发 / 考试闸门 ======================= */

	private SystemInfo.SystemSetting systemSetting() {
		SysInfo info = sysInfoMapper.selectById(SYS_INFO_ID);
		return info == null ? null : info.getSetting();
	}

	private int concurrency() {
		SystemInfo.SystemSetting setting = systemSetting();
		Integer configured = setting == null ? null : setting.getAnswerPdfConcurrency();
		int value = configured == null ? DEFAULT_CONCURRENCY : configured.intValue();
		return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, value));
	}

	/** 动态调整线程池：调大先改 max 再改 core，调小反过来，避免 setCorePoolSize > max 抛异常 */
	private synchronized void applyConcurrency(int target) {
		int current = pool.getCorePoolSize();
		if (target == current) {
			return;
		}
		if (target > current) {
			pool.setMaximumPoolSize(target);
			pool.setCorePoolSize(target);
		}
		else {
			pool.setCorePoolSize(target);
			pool.setMaximumPoolSize(target);
		}
	}

	/** 考试期间暂停：只要有一场「已发布 + 时间窗覆盖当前时刻」的考试在跑，就不让 PDF 导出抢 CPU */
	private void assertNotDuringExam() {
		SystemInfo.SystemSetting setting = systemSetting();

		if (setting != null && Boolean.FALSE.equals(setting.getPauseAnswerPdfDuringExam())) {
			return;
		}
		long now = System.currentTimeMillis();
		List<Project> projects = projectMapper.selectList(Wrappers.<Project>lambdaQuery()
				.select(Project::getId, Project::getName, Project::getSetting).eq(Project::getStatus, 1));
		if (projects == null) {
			return;
		}
		for (Project project : projects) {
			ProjectSetting projectSetting = project.getSetting();
			ProjectSetting.ExamSetting examSetting = projectSetting == null ? null : projectSetting.getExamSetting();
			if (examSetting == null || examSetting.getStartTime() == null || examSetting.getEndTime() == null) {
				continue;
			}
			long start = examSetting.getStartTime().longValue();
			long end = examSetting.getEndTime().longValue();
			if (start > 0L && end > start && now >= start && now <= end) {
				log.info("考试进行中，拒绝创建答卷 PDF 导出任务: projectId={}, name={}", project.getId(), project.getName());
				throw new ErrorCodeException(ErrorCode.SurveySuspend,
						"当前有考试进行中，答卷 PDF 导出已暂停（可在系统设置里关闭）。Excel 明细导出不受影响。");
			}
		}
	}



	/** 每小时清理一次：JOBS 里超过 24h 的记录连同产物一起删掉；目录里超过 24h 的孤儿文件（进程重启后 JOBS 是空的）也一并清掉 */
	@Scheduled(cron = "0 17 * * * ?")
	public void cleanupExpiredArtifacts() {
		long deadline = System.currentTimeMillis() - ARTIFACT_TTL_MILLIS;
		for (ExportJob job : new ArrayList<>(JOBS.values())) {
			if (job.getFinishedAt() > 0L && job.getFinishedAt() < deadline) {
				deleteArtifact(job.getId());
				JOBS.remove(job.getId());
			}
		}
		Path dir = exportDirectory();
		if (!Files.isDirectory(dir)) {
			return;
		}
		try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
			for (Path path : stream) {
				try {
					if (Files.getLastModifiedTime(path).toMillis() < deadline) {
						Files.deleteIfExists(path);
					}
				}
				catch (IOException e) {
					log.warn("清理 PDF 导出产物失败: {}, {}", path, e.getMessage());
				}
			}
		}
		catch (IOException e) {
			log.warn("扫描 PDF 导出目录失败: {}", e.getMessage());
		}
	}

	/** 创建任务时顺手清一遍过期记录，避免「定时任务没跑到」时内存无限涨 */
	private void pruneExpired() {
		long deadline = System.currentTimeMillis() - ARTIFACT_TTL_MILLIS;
		for (ExportJob job : new ArrayList<>(JOBS.values())) {
			if (job.getFinishedAt() > 0L && job.getFinishedAt() < deadline) {
				deleteArtifact(job.getId());
				JOBS.remove(job.getId());
			}
		}
	}

	/** ======================= 归属校验 ======================= */

	private void assertOwner(ExportJob job) {
		String operatorId = job.getOperatorId();
		String currentUserId = SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : null;
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		if (operatorId != null && currentUserId != null && !Objects.equals(operatorId, currentUserId)) {
			throw new AccessDeniedException("无权访问该导出任务");
		}
	}




	private static final class CanceledException extends RuntimeException {

		private static final long serialVersionUID = 1L;

		private CanceledException() {
			super("canceled");
		}

	}









	public static final class ExportSpec {

		private String projectId;


		private String classId;


		private List<String> ids;





		private List<String> classScope;

		private Integer attemptNo;

		private Date startTime;

		private Date endTime;





		private String gradeStatus;


		private String createByName;


		private Double minScore;


		private Double maxScore;





		private Boolean includeAnonymous;

		private boolean includeAnalysis;

		private boolean includeImages;





		private List<DownloadQuery.DownloadType> outputs;

		public ExportSpec projectId(String projectId) {
			this.projectId = projectId;
			return this;
		}

		public ExportSpec classId(String classId) {
			this.classId = classId;
			return this;
		}

		public ExportSpec ids(List<String> ids) {
			this.ids = ids;
			return this;
		}

		public ExportSpec classScope(List<String> classScope) {
			this.classScope = classScope;
			return this;
		}

		public ExportSpec attemptNo(Integer attemptNo) {
			this.attemptNo = attemptNo;
			return this;
		}

		public ExportSpec startTime(Date startTime) {
			this.startTime = startTime;
			return this;
		}

		public ExportSpec endTime(Date endTime) {
			this.endTime = endTime;
			return this;
		}

		public ExportSpec gradeStatus(String gradeStatus) {
			this.gradeStatus = gradeStatus;
			return this;
		}

		public ExportSpec createByName(String createByName) {
			this.createByName = createByName;
			return this;
		}

		public ExportSpec minScore(Double minScore) {
			this.minScore = minScore;
			return this;
		}

		public ExportSpec maxScore(Double maxScore) {
			this.maxScore = maxScore;
			return this;
		}

		public ExportSpec includeAnonymous(Boolean includeAnonymous) {
			this.includeAnonymous = includeAnonymous;
			return this;
		}

		public ExportSpec includeAnalysis(boolean includeAnalysis) {
			this.includeAnalysis = includeAnalysis;
			return this;
		}

		public ExportSpec includeImages(boolean includeImages) {
			this.includeImages = includeImages;
			return this;
		}

		public ExportSpec outputs(List<DownloadQuery.DownloadType> outputs) {
			this.outputs = outputs;
			return this;
		}

		public String getProjectId() {
			return projectId;
		}

		public String getClassId() {
			return classId;
		}

		public List<String> getIds() {
			return ids;
		}

		public List<String> getClassScope() {
			return classScope;
		}

		public Integer getAttemptNo() {
			return attemptNo;
		}

		public Date getStartTime() {
			return startTime;
		}

		public Date getEndTime() {
			return endTime;
		}

		public String getGradeStatus() {
			return gradeStatus;
		}

		public String getCreateByName() {
			return createByName;
		}

		public Double getMinScore() {
			return minScore;
		}

		public Double getMaxScore() {
			return maxScore;
		}

		public Boolean getIncludeAnonymous() {
			return includeAnonymous;
		}

		public boolean isIncludeAnalysis() {
			return includeAnalysis;
		}

		public boolean isIncludeImages() {
			return includeImages;
		}

		public List<DownloadQuery.DownloadType> getOutputs() {
			return outputs;
		}

	}


	public static final class ExportJob {

		private final String id;

		private final ExportSpec spec;

		private final String operatorId;

		private final long createdAtMillis = System.currentTimeMillis();

		private final List<String> failedNames = Collections.synchronizedList(new ArrayList<String>());

		private volatile String status = STATUS_QUEUED;

		private volatile int total;

		private volatile int done;

		private volatile int failed;


		private volatile int filesWritten;

		private volatile long bytes;

		private volatile String error;

		private volatile String message;

		private volatile String fileName;

		private volatile boolean canceled;

		private volatile long finishedAt;

		private volatile Future<?> future;

		ExportJob(String id, ExportSpec spec) {
			this.id = id;
			this.spec = spec;
			this.operatorId = SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : null;
		}

		/** 一份答卷（至少有一种格式成功）算一份；包内可见是为了单测能直接喂失败场景 */
		void incDone() {
			done = done + 1;
		}

		/** 批量补 done：名册一次覆盖全班答卷，写成功后把还没计入的份数补齐 */
		void incDone(int count) {
			if (count > 0) {
				done = done + count;
			}
		}

		/** 一个文件失败记一次；明细最多留 20 条，避免几万条把人名列表撑爆 */
		void incFailed(String name) {
			failed = failed + 1;
			if (failedNames.size() < 20 && StringUtils.hasText(name)) {
				failedNames.add(name);
			}
		}

		/** 成功写出一个文件（份数不变）；包内可见同上 */
		void incWritten() {
			filesWritten = filesWritten + 1;
		}

		public int getFilesWritten() {
			return filesWritten;
		}

		private void touchFinished() {
			finishedAt = System.currentTimeMillis();
		}

		public String getId() {
			return id;
		}

		public ExportSpec getSpec() {
			return spec;
		}

		public String getOperatorId() {
			return operatorId;
		}

		public long getCreatedAtMillis() {
			return createdAtMillis;
		}

		public List<String> getFailedNames() {
			return failedNames;
		}

		public String getStatus() {
			return status;
		}

		private void setStatus(String status) {
			this.status = status;
		}

		public int getTotal() {
			return total;
		}

		/** 包内可见：单测要造一个「已知份数」的任务来验证名册补 done */
		void setTotal(int total) {
			this.total = total;
		}

		public int getDone() {
			return done;
		}

		public int getFailed() {
			return failed;
		}

		public long getBytes() {
			return bytes;
		}

		private void setBytes(long bytes) {
			this.bytes = bytes;
		}

		public String getError() {
			return error;
		}

		private void setError(String error) {
			this.error = error;
		}

		public String getMessage() {
			return message;
		}

		private void setMessage(String message) {
			this.message = message;
		}

		public String getFileName() {
			return fileName;
		}

		private void setFileName(String fileName) {
			this.fileName = fileName;
		}

		public boolean isCanceled() {
			return canceled;
		}

		private void setCanceled(boolean canceled) {
			this.canceled = canceled;
		}

		public long getFinishedAt() {
			return finishedAt;
		}

		private Future<?> getFuture() {
			return future;
		}

		private void setFuture(Future<?> future) {
			this.future = future;
		}

	}

}