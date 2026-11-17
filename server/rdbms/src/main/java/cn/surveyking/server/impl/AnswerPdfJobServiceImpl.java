package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
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

/**
 * 班级答卷批量导出 PDF：内存任务 + 受控线程池 + 进度轮询 + ZIP 产物。
 *
 * <p>
 * 为什么是内存任务而不是建表：一次导出是「老师点一下、几十秒、下载完就不要了」的短生命周期任务，
 * 建表要配迁移、清理、多实例一致性，收益不抵成本。进程重启后未完成的任务直接消失（前端轮询会拿到
 * 「任务不存在或已过期」，重新导出即可）。
 *
 * <p>
 * 资源约束（这台机器只有 4 核，学生可能还在答题）：
 * <ul>
 * <li>并发数从系统设置 {@code answerPdfConcurrency} 读（默认 1，上限 2），改了设置下次创建任务即生效；</li>
 * <li>等待队列只有 {@link #QUEUE_CAPACITY} 个，满了直接拒绝并给出中文提示，不把 JVM 拖死；</li>
 * <li>每份之间 {@link #INTERVAL_SLEEP_MILLIS} ms 的让出，避免持续吃满一个核；</li>
 * <li>逐份渲染、逐份写 ZIP，内存里只留一份 PDF（题目逐页写 content stream）。</li>
 * </ul>
 *
 * <p>
 * 考试期间暂停：系统设置 {@code pauseAnswerPdfDuringExam} 为真（默认）时，只要存在
 * {@code status=1} 且 examSetting 时间窗覆盖当前时刻的考试，就拒绝创建任务。Excel 明细导出不受影响
 * （它走的是另一条同步路径）。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnswerPdfJobServiceImpl implements AnswerPdfJobService {

	/** 排队中 */
	public static final String STATUS_QUEUED = "queued";

	/** 渲染中 */
	public static final String STATUS_RUNNING = "running";

	/** 完成，可以下载 */
	public static final String STATUS_DONE = "done";

	/** 失败（详情见 error/message） */
	public static final String STATUS_FAILED = "failed";

	/** 已取消 */
	public static final String STATUS_CANCELED = "canceled";

	/** 产物目录（相对 file-storage.local.root-path，与上传附件同一块盘） */
	private static final String EXPORT_DIR = "export";

	/** 产物保留 24 小时 */
	private static final long ARTIFACT_TTL_MILLIS = 24L * 60L * 60L * 1000L;

	/** 等待队列容量：2 个排队 + 1~2 个在跑，再多就拒绝 */
	private static final int QUEUE_CAPACITY = 2;

	private static final int MIN_CONCURRENCY = 1;

	private static final int MAX_CONCURRENCY = 2;

	/** 默认并发：4 核小机器上一次只渲染一份 */
	private static final int DEFAULT_CONCURRENCY = 1;

	/** 每页取多少份答卷（分页取，避免一次把整场答卷读进内存） */
	private static final int PAGE_SIZE = 50;

	/** 每份之间的让出时间 */
	private static final long INTERVAL_SLEEP_MILLIS = 30L;

	/** 内存里最多保留多少个任务记录（防止被刷爆） */
	private static final int MAX_JOBS = 30;

	/** t_sys_info 只有一条记录 */
	private static final String SYS_INFO_ID = "1";

	/** 任务表：进程内，不建库表 */
	private static final ConcurrentHashMap<String, ExportJob> JOBS = new ConcurrentHashMap<>();

	private final AnswerMapper answerMapper;

	private final AnswerViewMapper answerViewMapper;

	private final ProjectMapper projectMapper;

	private final DeptMapper deptMapper;

	private final UserMapper userMapper;

	private final SysInfoMapper sysInfoMapper;

	private final FileService fileService;

	private final StorageProperties storageProperties;

	/**
	 * 渲染线程池：核心/最大线程数跟着系统设置走（见 {@link #applyConcurrency(int)}），
	 * 守护线程，队列满直接抛 {@link RejectedExecutionException}（调用方翻译成中文提示）。
	 */
	private final ThreadPoolExecutor pool = new ThreadPoolExecutor(DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY, 60L,
			TimeUnit.SECONDS, new ArrayBlockingQueue<>(QUEUE_CAPACITY), runnable -> {
				Thread thread = new Thread(runnable, "answer-pdf-export");
				thread.setDaemon(true);
				return thread;
			}, new ThreadPoolExecutor.AbortPolicy());

	@PostConstruct
	public void init() {
		// 空闲线程该回收就回收，别在这台 4 核机器上白占栈
		pool.allowCoreThreadTimeOut(true);
		if (!AnswerPdfExporter.isFontAvailable()) {
			log.error("答卷 PDF 字体缺失（{}），导出接口会直接报错：{}", AnswerPdfExporter.FONT_RESOURCE,
					AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
	}

	/* ======================= 对外 API ======================= */

	/**
	 * 从导出请求创建任务（Controller 与 {@code AnswerServiceImpl#downloadPdfByClass} 共用）：
	 * 校验项目/班级/类型后固化成 {@link ExportSpec} 快照，再交给线程池。
	 *
	 * <p>
	 * 之所以把这段放在这里而不是 Controller：任务一旦创建就在后台线程里按 spec 取数，
	 * 校验与取数必须用同一份范围定义，否则「建任务时校验 projectId、跑任务时却用别的 classId」
	 * 这类漏洞迟早会出现。
	 * <p>
	 * classId 是可选的：不传 = 整个项目（可再用 ids / 时间范围收窄），对应「勾选若干份导出」和
	 * 「整卷导出」。ids 为空数组同样按「不限」处理，所以空选不会导出一份空 ZIP 之外的意外内容。
	 * @param query 导出请求（projectId 必填；classId / ids / 时间范围 / 轮次可选）
	 * @return 任务 id
	 */
	@Override
	public String createJob(DownloadQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "导出答卷 PDF 需要项目 id");
		}
		if (query.getType() != null && query.getType() != DownloadQuery.DownloadType.answerPdf) {
			// 与 downloadByClass 同样的原则：宁可报错，也不要回一份「不是你要的格式」的文件
			throw new ErrorCodeException(ErrorCode.ValidationError, "按班级导出 PDF 只支持 answerPdf 类型");
		}
		if (projectMapper.selectById(query.getProjectId()) == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "项目不存在");
		}
		ExportSpec spec = new ExportSpec().projectId(query.getProjectId()).classId(query.getClassId())
				.ids(query.getIds()).attemptNo(query.getAttemptNo()).startTime(query.getStartTime())
				.endTime(query.getEndTime()).includeAnalysis(Boolean.TRUE.equals(query.getIncludeAnalysis()))
				.includeImages(Boolean.TRUE.equals(query.getIncludeImages()));
		return createJob(spec);
	}

	/**
	 * 创建导出任务。
	 * @param spec 导出范围（项目必填；班级 / 勾选 id / 轮次 / 时间范围 / 选项可选）
	 * @return 任务 id
	 */
	public String createJob(ExportSpec spec) {
		if (spec == null || !StringUtils.hasText(spec.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "导出答卷 PDF 需要项目 id");
		}
		if (!AnswerPdfExporter.isFontAvailable()) {
			// 部署问题：提前报错，别让老师等 30 秒才看到一堆失败
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
		log.info("创建答卷 PDF 导出任务: jobId={}, projectId={}, classId={}, attemptNo={}, operator={}", job.getId(),
				spec.getProjectId(), spec.getClassId(), spec.getAttemptNo(), job.getOperatorId());
		return job.getId();
	}

	/**
	 * 查任务状态（带归属校验：只能看自己发起的，管理员除外）。
	 *
	 * <p>返回 Map 而不是内部任务对象：接口在 shared 模块，不能反向依赖 rdbms 的任务类型；
	 * 另外 projectId/classId 一起带出来，Controller 据此做「取文件时再查一次班级可见性」和审计。
	 */
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
			// 还排在队列里没开始跑：直接落终态，否则前端会一直轮询一个永远不会变的 queued
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
		int total = job.getTotal();
		view.put("progress", Integer.valueOf(total <= 0 ? 0 : Math.min(100, job.getDone() * 100 / total)));
		return view;
	}

	/* ======================= 任务执行 ======================= */

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
				// 不选班级时范围是整个项目（或一段时间 / 一批勾选的 id），说「这个班」会让人以为选错了班
				job.setError(StringUtils.hasText(job.getSpec().getClassId())
						? "这个班还没有可导出的答卷（暂存草稿不会生成成绩单）"
						: "这个范围里还没有可导出的答卷（暂存草稿不会生成成绩单）");
				job.touchFinished();
				return;
			}
			Path dir = exportDirectory();
			Files.createDirectories(dir);
			temp = Files.createTempFile(dir, job.getId() + "-", ".part");
			Set<String> usedNames = new HashSet<>();
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
						renderOne(zip, projectView, className, answers.get(i), views.get(i), usedNames, job);
						sleepBetweenAnswers();
					}
					if (answers.size() < PAGE_SIZE) {
						break;
					}
					page = page + 1;
				}
			}
			assertNotCanceled(job);
			Path target = exportFile(job.getId());
			Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
			temp = null;
			job.setBytes(Files.size(target));
			job.setFileName(zipFileName(project, className));
			job.setMessage(summary(job));
			job.setStatus(STATUS_DONE);
			job.touchFinished();
			log.info("答卷 PDF 导出完成: jobId={}, done={}, failed={}, bytes={}", job.getId(), job.getDone(),
					job.getFailed(), job.getBytes());
		}
		catch (CanceledException e) {
			job.setStatus(STATUS_CANCELED);
			job.setMessage("已取消");
			job.touchFinished();
			log.info("答卷 PDF 导出已取消: jobId={}", job.getId());
		}
		catch (ErrorCodeException e) {
			job.setStatus(STATUS_FAILED);
			job.setError(e.getMessage());
			job.touchFinished();
			log.warn("答卷 PDF 导出失败: jobId={}, {}", job.getId(), e.getMessage());
		}
		catch (Exception e) {
			job.setStatus(STATUS_FAILED);
			job.setError("生成答卷 PDF 失败：" + e.getMessage());
			job.touchFinished();
			log.error("答卷 PDF 导出异常: jobId={}", job.getId(), e);
		}
		finally {
			if (temp != null) {
				deleteQuietly(temp);
			}
		}
	}

	/** 渲染一份，写进 ZIP；单份失败只记失败数，不中断整批 */
	private void renderOne(ZipOutputStream zip, ProjectView project, String className, Answer answer, AnswerView view,
			Set<String> usedNames, ExportJob job) {
		String displayName = displayName(answer);
		try {
			AnswerPdfExporter.PdfOptions options = new AnswerPdfExporter.PdfOptions()
					.attemptNo(answer.getAttemptNo()).includeAnalysis(job.getSpec().isIncludeAnalysis())
					.includeImages(job.getSpec().isIncludeImages()).classLabel(className)
					.imageLoader(this::loadFileBytes);
			byte[] pdf = AnswerPdfExporter.renderAnswer(project, view, options);
			String entryName = uniqueEntryName(usedNames, entryBaseName(answer));
			zip.putNextEntry(new ZipEntry(entryName));
			zip.write(pdf);
			zip.closeEntry();
			job.incDone();
		}
		catch (Exception e) {
			job.incFailed(displayName);
			log.warn("答卷 PDF 渲染失败，已跳过: answerId={}, name={}, {}", answer.getId(), displayName, e.getMessage());
		}
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
		text.append("成功 ").append(job.getDone()).append(" 份");
		if (job.getFailed() > 0) {
			text.append("，失败 ").append(job.getFailed()).append(" 份");
			List<String> names = job.getFailedNames();
			if (!names.isEmpty()) {
				text.append("（").append(String.join("、", names)).append("）");
			}
		}
		return text.toString();
	}

	/* ======================= 取数 ======================= */

	private LambdaQueryWrapper<Answer> baseWrapper(ExportSpec spec) {
		return Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, spec.getProjectId())
				// 答题时所在班级：学员换班后历史答卷仍留在原班。
				// classId 为空表示「不分班」：整卷导出 / 勾选 ids 导出 / 只按时间范围导出，
				// 这里必须是有值才加条件，否则 eq(class_id, null) 永远查不到数据
				.eq(StringUtils.hasText(spec.getClassId()), Answer::getClassId, spec.getClassId())
				.isNotNull(Answer::getAnswer)
				// 只导已交卷的：暂存草稿没有成绩，生成成绩单没有意义
				.and(wrapper -> wrapper.eq(Answer::getTempSave, 1).or().isNull(Answer::getTempSave))
				.in(spec.getIds() != null && !spec.getIds().isEmpty(), Answer::getId, spec.getIds())
				.eq(spec.getAttemptNo() != null, Answer::getAttemptNo, spec.getAttemptNo())
				.gt(spec.getStartTime() != null, Answer::getCreateAt, spec.getStartTime())
				.lt(spec.getEndTime() != null, Answer::getCreateAt, spec.getEndTime());
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

	/* ======================= 文件名 / 产物 ======================= */

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

	private String uniqueEntryName(Set<String> usedNames, String baseName) {
		String safe = sanitizeEntryName(baseName);
		String candidate = safe + ".pdf";
		int index = 2;
		while (!usedNames.add(candidate)) {
			candidate = safe + "(" + index + ").pdf";
			index = index + 1;
		}
		return candidate;
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

	private String zipFileName(Project project, String className) {
		StringBuilder name = new StringBuilder();
		name.append(StringUtils.hasText(project.getName()) ? project.getName() : "答卷");
		if (StringUtils.hasText(className)) {
			name.append("-").append(className);
		}
		name.append("-答卷PDF-").append(new SimpleDateFormat("yyyyMMddHHmm").format(new Date())).append(".zip");
		return name.toString();
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

	/* ======================= 图片加载 ======================= */

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

	/* ======================= 系统设置 / 并发 / 考试闸门 ======================= */

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

	/**
	 * 考试期间暂停：只要有一场「已发布 + 时间窗覆盖当前时刻」的考试在跑，就不让 PDF 导出抢 CPU。
	 * Excel 明细导出不走这里，因此不受影响（提示里也说清楚）。
	 */
	private void assertNotDuringExam() {
		SystemInfo.SystemSetting setting = systemSetting();
		// 缺省视为开启：只有管理员显式关掉才放开
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

	/* ======================= 清理 ======================= */

	/**
	 * 每小时清理一次：JOBS 里超过 24h 的记录连同产物一起删掉；目录里超过 24h 的孤儿文件（进程重启后
	 * JOBS 是空的）也一并清掉。
	 */
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

	/* ======================= 归属校验 ======================= */

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

	/* ======================= 内部类型 ======================= */

	/** 内部取消信号：只用于线程内跳出，不暴露给上层 */
	private static final class CanceledException extends RuntimeException {

		private static final long serialVersionUID = 1L;

		private CanceledException() {
			super("canceled");
		}

	}

	/**
	 * 导出范围。字段和 {@code DownloadQuery} 对齐，但独立成一个类型，避免把 DTO 传进任务线程后
	 * 被调用方继续改（线程里读的是快照）。
	 */
	public static final class ExportSpec {

		private String projectId;

		/** 班级 id；为空表示不按班限定（整卷 / 勾选 ids / 时间范围导出） */
		private String classId;

		/** 指定导出的答卷 id；为空表示不限（即整个范围内的全部答卷） */
		private List<String> ids;

		private Integer attemptNo;

		private Date startTime;

		private Date endTime;

		private boolean includeAnalysis;

		private boolean includeImages;

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

		public ExportSpec includeAnalysis(boolean includeAnalysis) {
			this.includeAnalysis = includeAnalysis;
			return this;
		}

		public ExportSpec includeImages(boolean includeImages) {
			this.includeImages = includeImages;
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

		public Integer getAttemptNo() {
			return attemptNo;
		}

		public Date getStartTime() {
			return startTime;
		}

		public Date getEndTime() {
			return endTime;
		}

		public boolean isIncludeAnalysis() {
			return includeAnalysis;
		}

		public boolean isIncludeImages() {
			return includeImages;
		}

	}

	/** 一个导出任务的可变状态：字段是 volatile，轮询线程读到的进度不会因可见性问题停住 */
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

		private volatile long bytes;

		private volatile String error;

		private volatile String message;

		private volatile String fileName;

		private volatile boolean canceled;

		private volatile long finishedAt;

		private volatile Future<?> future;

		private ExportJob(String id, ExportSpec spec) {
			this.id = id;
			this.spec = spec;
			this.operatorId = SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : null;
		}

		private void incDone() {
			done = done + 1;
		}

		private void incFailed(String name) {
			failed = failed + 1;
			if (failedNames.size() < 20 && StringUtils.hasText(name)) {
				failedNames.add(name);
			}
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

		private void setTotal(int total) {
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