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

/**
 * 班级答卷批量导出 PDF：内存任务 + 受控线程池 + 进度轮询 + ZIP 产物。
 *
 * <p>
 * 为什么是内存任务而不是建表：一次导出是「老师点一下、几十秒、下载完就不要了」的短生命周期任务，
 * 建表要配迁移、清理、多实例一致性，收益不抵成本。进程重启后未完成的任务直接消失（前端轮询会拿到
 * 「任务不存在或已过期」，重新导出即可）。
 *
 * <p>
 * 一次任务可以产出多种格式（成绩单 PDF / 答题卷 PDF / 长图 PNG / 成绩确认单 PDF），
 * 由 {@code DownloadQuery.outputs} 决定，ZIP 内按格式分子目录。为什么不拆成四个任务：
 * 同一批答卷要渲染四遍、前端要轮询四个任务、老师要下载四个 ZIP —— 在 4 核机器上纯属浪费。
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

	/** 取数范围要跟着权限走：班级级老师只能导自己带的班（见 {@link ExportSpec#getClassScope()}） */
	private final AnswerAccessGuard answerAccessGuard;

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
	 *
	 * <p>
	 * 数据页 / 班级抽屉上筛过的条件（批改状态、答题人姓名、分数段、是否含匿名）也要一起固化进
	 * {@link ExportSpec}：PDF / 答题卷 / 长图 / 确认单的取数条件必须和屏幕上的列表逐条相同。
	 * 少带一条，老师「筛了 60 分以下」却拿到整场答卷，这就是最容易被当成「系统算错」的隐患。
	 *
	 * <p>
	 * 格式由 {@code outputs} 决定（见 {@link #resolveOutputs(DownloadQuery)}）：不传就按 {@code type}
	 * 走老逻辑（只出成绩单），传了就按列出的顺序全部生成。includeImages 一律按 true 处理，
	 * DTO 里那个字段已经废弃。
	 * @param query 导出请求（projectId 必填；classId / ids / 时间范围 / 轮次 / 筛选条件 / outputs 可选）
	 * @return 任务 id
	 */
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

	/**
	 * 把导出请求固化成任务快照。
	 *
	 * <p>包内可见是为了让单测能直接盯住「DTO → 快照」这一步：漏拷一个筛选字段，任务状态照样是
	 * done、文件也照样生成，只是里面多了一堆不该出现的答卷 —— 这种错没有任何报错可查。
	 *
	 * <p>屏幕上筛过的条件原样带进来：批改状态 / 姓名 / 分数段 / 仅实名。空值一律表示「不限」，
	 * 语义与 {@link DownloadQuery} 一致（不传就不会多出条件）。
	 * @param query 导出请求
	 * @param outputs 已经归一过的格式列表
	 * @return 任务快照
	 */
	static ExportSpec specOf(DownloadQuery query, List<DownloadQuery.DownloadType> outputs) {
		return new ExportSpec().projectId(query.getProjectId()).classId(query.getClassId()).ids(query.getIds())
				.attemptNo(query.getAttemptNo()).startTime(query.getStartTime()).endTime(query.getEndTime())
				.gradeStatus(query.getGradeStatus()).createByName(query.getCreateByName())
				.minScore(query.getMinScore()).maxScore(query.getMaxScore())
				.includeAnonymous(query.getIncludeAnonymous())
				.includeAnalysis(Boolean.TRUE.equals(query.getIncludeAnalysis()))
				// 签名/上传图片是学员作答的一部分，永远带上；DTO 的 includeImages 已废弃，传 false 不生效
				.includeImages(true).outputs(outputs);
	}

	/** 导出任务能产出的四种格式（都是「每人一份」的答卷产物，全班一份的成绩册不在此列） */
	private static final List<DownloadQuery.DownloadType> ANSWER_OUTPUT_TYPES = Collections
			.unmodifiableList(Arrays.asList(DownloadQuery.DownloadType.answerPdf,
					DownloadQuery.DownloadType.answerSheetPdf, DownloadQuery.DownloadType.answerImage,
					DownloadQuery.DownloadType.confirmSheetPdf));

	/**
	 * 把导出台账（outputs / type）归一成真正要生成的文件类型列表。
	 *
	 * <p>
	 * 独立成静态方法是为了能被单测直接盯住：这里错一次，老师拿到的就是一包缺格式的 ZIP，
	 * 而任务状态还是 done —— 这种「静默少文件」比报错更难发现。
	 * @param query 导出请求
	 * @return 去重后的格式列表（顺序即渲染顺序），永不为空
	 */
	static List<DownloadQuery.DownloadType> resolveOutputs(DownloadQuery query) {
		List<DownloadQuery.DownloadType> requested = query == null ? null : query.getOutputs();
		if (requested == null || requested.isEmpty()) {
			// 老调用方只传 type（McpTools / 按班导出入口）：按它走，type 也缺省时是线上的成绩单
			DownloadQuery.DownloadType type = query == null || query.getType() == null
					? DownloadQuery.DownloadType.answerPdf : query.getType();
			assertAnswerOutput(type);
			return Collections.singletonList(type);
		}
		List<DownloadQuery.DownloadType> resolved = new ArrayList<>();
		for (DownloadQuery.DownloadType output : requested) {
			// null 混在数组里按脏数据拒掉：悄悄补一个默认值，前端就会以为「不就是没选吗」
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

	/**
	 * 创建导出任务。
	 * @param spec 导出范围（项目必填；班级 / 勾选 id / 轮次 / 时间范围 / 选项可选）
	 * @return 任务 id
	 */
	public String createJob(ExportSpec spec) {
		if (spec == null || !StringUtils.hasText(spec.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "导出答卷需要项目 id");
		}
		if (spec.getOutputs() == null || spec.getOutputs().isEmpty()) {
			// 直接调 createJob(ExportSpec) 的内部调用方可能没设格式：默认成绩单，和线上行为一致
			spec.outputs(Collections.singletonList(DownloadQuery.DownloadType.answerPdf));
		}
		// 班级级老师（不是项目协作者，只是把这场考试分配给了自己带的班）导出时只能带本班答卷。
		// 必须在这里算：任务跑在导出线程里，SecurityContext 已经不在，取不到当前用户。
		if (spec.getClassScope() == null && !answerAccessGuard.canManageProject(spec.getProjectId())) {
			Set<String> scope = answerAccessGuard.readableClassIds(spec.getProjectId());
			spec.classScope(scope.isEmpty() ? Collections.emptyList() : new ArrayList<>(scope));
		}
		for (DownloadQuery.DownloadType output : spec.getOutputs()) {
			assertAnswerOutput(output);
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
		log.info("创建答卷导出任务: jobId={}, projectId={}, classId={}, attemptNo={}, outputs={}, operator={}",
				job.getId(), spec.getProjectId(), spec.getClassId(), spec.getAttemptNo(), spec.getOutputs(),
				job.getOperatorId());
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
		// 导出的是哪几种格式：审计要逐项记清（不能一律记成 answerPdf），前端也能按它显示「生成了什么」
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
						? "这个班还没有可导出的答卷（暂存草稿不会生成导出文件）"
						: "这个范围里还没有可导出的答卷（暂存草稿不会生成导出文件）");
				job.touchFinished();
				return;
			}
			Path dir = exportDirectory();
			Files.createDirectories(dir);
			temp = Files.createTempFile(dir, job.getId() + "-", ".part");
			Set<String> usedNames = new HashSet<>();
			// 成绩确认单是「整班一张表」：逐份循环里只攒数据，等全部答卷过完再画一次
			boolean withRoster = hasOutput(job.getSpec(), DownloadQuery.DownloadType.confirmSheetPdf);
			List<AnswerConfirmSheetExporter.Entry> rosterRows = new ArrayList<>();
			AnswerConfirmSheetExporter.ConfirmOptions confirmOptions = new AnswerConfirmSheetExporter.ConfirmOptions();
			// 整卷导出时每份答卷可能在不同班，页面上要显示班级名；一个班只查一次
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
							// 名册行在这里就算好：视图已经在手，不用再查一次库
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
				// 一份都没生成出来（通常是环境问题，例如字体之外还缺了渲染依赖）：
				// 不发布一个空 ZIP，整任务按失败处理并给出能查的那部分原因，让前端直接显示 error
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

	/**
	 * 渲染一份答卷的所有格式（真渲染器），逐个写进 ZIP；单份/单格式失败只记失败数，不中断整批。
	 *
	 * <p>
	 * 包内可见：单测既可以用它走一遍真链路（四种格式真的出 PDF/PNG），
	 * 也可以走下面那个带渲染函数的重载替换掉渲染器。
	 */
	void renderOne(ZipOutputStream zip, ProjectView project, String className, Answer answer, AnswerView view,
			Set<String> usedNames, ExportJob job) throws IOException {
		renderOne(zip, project, className, answer, view, usedNames, job, this::renderOutput);
	}

	/**
	 * 渲染一份答卷的所有格式（包内可见，单测用假渲染器替换真正的 PDF/PNG 生成）。
	 *
	 * <p>
	 * 失败粒度是「学员 × 格式」：长图因为某张图坏了失败，不该把同一份的成绩单 PDF 也一起丢掉；
	 * 反过来，某个学员所有格式都失败时，他就不算 done，失败明细里也会带上格式名，
	 * 老师才知道去找哪一份的哪一种。
	 */
	void renderOne(ZipOutputStream zip, ProjectView project, String className, Answer answer, AnswerView view,
			Set<String> usedNames, ExportJob job, OutputRenderer renderer) throws IOException {
		String displayName = displayName(answer);
		boolean anyOk = false;
		for (DownloadQuery.DownloadType output : job.getSpec().getOutputs()) {
			if (output == DownloadQuery.DownloadType.confirmSheetPdf) {
				// 确认单是一张名册，不逐份出文件：由整个任务末尾的 writeRoster 统一生成
				continue;
			}
			try {
				byte[] bytes = renderer.render(output, project, view, answer, className, job.getSpec());
				// 统一放子目录：导出弹窗会按格式列出「成绩单/、答题卷/…」，单格式也保持一致，
				// 免得多一种格式就多一套路径规则（外部脚本按子目录取即可）
				String entryName = uniqueEntryName(usedNames, outputDir(output), output, entryBaseName(answer));
				zip.putNextEntry(new ZipEntry(entryName));
				zip.write(bytes);
				zip.closeEntry();
				anyOk = true;
				job.incWritten();
			}
			catch (Exception e) {
				// ZipOutputStream 自己抛的 IOException 也会落到这里：那属于整包坏掉，
				// 但让单份失败带走整任务不值得，记下来继续，最后由「全部失败」兜底
				job.incFailed(displayName + "（" + outputDir(output) + "）");
				log.warn("答卷导出失败，已跳过: answerId={}, name={}, output={}, {}", answer.getId(), displayName, output,
						e.getMessage());
			}
		}
		if (anyOk) {
			job.incDone();
		}
	}

	/**
	 * 名册：整班/整卷一张表，只写一个文件（确认单不再一人一页）。
	 *
	 * <p>
	 * 失败记 1 个文件（"成绩确认单"），不影响其它格式交付；
	 * 但如果这次任务只要了确认单，filesWritten 会停在 0，落到「全部失败」，整任务按 failed 处理。
	 */
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
			// 名册里每一份答卷都算「导出成功」：只勾确认单的任务没有逐份文件，
			// 不在这里补 done，前端会看到 done=0 当成失败
			job.incDone(job.getTotal() - job.getDone());
		}
		catch (Exception e) {
			job.incFailed("成绩确认单");
			log.warn("成绩确认单名册生成失败，已跳过: jobId={}, rows={}, {}", job.getId(),
					Integer.valueOf(rows.size()), e.getMessage());
		}
	}

	/** 名册文件名主体：成绩确认单-<班级名或项目名>-<yyyyMMddHHmm>（去重与扩展名交给 uniqueEntryName） */
	private String rosterBaseName(ProjectView project, String className) {
		String scope = StringUtils.hasText(className) ? className
				: (project != null && StringUtils.hasText(project.getName()) ? project.getName() : "答卷");
		return "成绩确认单-" + scope + "-" + new SimpleDateFormat("yyyyMMddHHmm").format(new Date());
	}

	/**
	 * 名册「班级」列：按班导出时全班同名（直接用任务上的班级名）；
	 * 整卷/勾选导出时每份答卷各自的班不同，去查一次班级名并缓存（一个班只查一次）。
	 */
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
		// 每份答卷重建一次选项：图片加载回调与轮次是这份答卷私有的，跨答卷复用会串数据
		AnswerPdfExporter.PdfOptions options = new AnswerPdfExporter.PdfOptions().attemptNo(answer.getAttemptNo())
				.includeAnalysis(spec.isIncludeAnalysis())
				// 签名/上传图片是作答的一部分，永远带上（DTO 的 includeImages 已废弃）
				.includeImages(true).classLabel(className).imageLoader(this::loadFileBytes);
		switch (output) {
			case answerSheetPdf:
				return AnswerPdfExporter.renderAnswer(project, view,
						options.style(AnswerPdfExporter.Style.ANSWER_SHEET));
			case answerImage:
				// 长图内部一律按答题卷版式渲染（它会 copy 一份选项再强制 style），所以这里不用改 style
				return AnswerImageExporter.renderAnswerImage(project, view, options);
			case confirmSheetPdf:
				// 逐份分支留作兜底：名册路径（writeRoster）不经过这里，正常不会调到
				return AnswerConfirmSheetExporter.renderConfirmSheet(project, view, className,
						new AnswerConfirmSheetExporter.ConfirmOptions().attemptNo(answer.getAttemptNo()));
			case answerPdf:
			default:
				return AnswerPdfExporter.renderAnswer(project, view,
						options.style(AnswerPdfExporter.Style.GRADE_REPORT));
		}
	}

	/**
	 * 渲染函数签名：生产实现是 {@link #renderOutput}，单测传假实现，
	 * 这样「子目录 / 重名 / 失败统计」不用真的跑 PDFBox。
	 */
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
		// 「份」是学员数，「个」是文件数：导了 10 份成绩单+长图，成功是 10 份 / 20 个文件
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

	/* ======================= 取数 ======================= */

	/**
	 * 导出取数条件：与数据页列表（{@code AnswerServiceImpl#listAnswer}）逐条同口径。
	 *
	 * <p>为什么这些条件必须长在「取数」而不是「建任务」里：Excel 明细是同步导出、PDF 是异步任务，
	 * 两条路各自翻译一遍筛选条件，迟早有一处漏掉。老师筛完看到 12 份、导出却拿到整场 50 份，
	 * 只会认为系统算错。所以这里照抄列表的空值语义：
	 * <ul>
	 * <li>字符串条件用 {@link StringUtils#hasText} 判空（null 与 "" 都算「不限」）；</li>
	 * <li>分数段给的是闭区间 {@code >= / <=}（60 分及格的人不能被漏掉）；</li>
	 * <li>姓名要同时命中「答卷上的姓名快照」与「账号名」两条路，且整组用 and 包起来，
	 * 否则 OR 会把项目 / 班级条件一起短路（见 {@link #answererNameLike(String)} 的注释）；</li>
	 * <li>布尔条件只在显式 false 时生效（{@code includeAnonymous=false} 才是「仅实名」）。</li>
	 * </ul>
	 */
	private LambdaQueryWrapper<Answer> baseWrapper(ExportSpec spec) {
		return Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, spec.getProjectId())
				// 答题时所在班级：学员换班后历史答卷仍留在原班。
				// classId 为空表示「不分班」：整卷导出 / 勾选 ids 导出 / 只按时间范围导出，
				// 这里必须是有值才加条件，否则 eq(class_id, null) 永远查不到数据
				.eq(StringUtils.hasText(spec.getClassId()), Answer::getClassId, spec.getClassId())
				// 班级级老师的班级范围：空列表 = 没有班级级权限（或本来就是项目协作者），不加条件
				.in(spec.getClassScope() != null && !spec.getClassScope().isEmpty(), Answer::getClassId,
						spec.getClassScope())
				.isNotNull(Answer::getAnswer)
				// 只导已交卷的：暂存草稿没有成绩，生成成绩单没有意义
				.and(wrapper -> wrapper.eq(Answer::getTempSave, 1).or().isNull(Answer::getTempSave))
				.in(spec.getIds() != null && !spec.getIds().isEmpty(), Answer::getId, spec.getIds())
				.eq(spec.getAttemptNo() != null, Answer::getAttemptNo, spec.getAttemptNo())
				// 批改状态（pending / graded）：空串与 null 都表示不过滤
				.eq(StringUtils.hasText(spec.getGradeStatus()), Answer::getGradeStatus, spec.getGradeStatus())
				// 分数段含边界；exam_score 为 NULL（未判分 / 非考试卷）时比较恒为 UNKNOWN，
				// 不会被 >= / <= 误命中，所以不需要额外的 is not null
				.ge(spec.getMinScore() != null, Answer::getExamScore, spec.getMinScore())
				.le(spec.getMaxScore() != null, Answer::getExamScore, spec.getMaxScore())
				// 答题人姓名：快照列（新数据）与账号名（老数据没有快照）两头都要查；
				// 整组用 and(...) 包起来，否则 OR 会把前面的项目 / 班级条件一并短路
				.and(StringUtils.hasText(spec.getCreateByName()), filter -> {
					String like = answererNameLike(spec.getCreateByName());
					filter.apply("answerer_name like {0}", like).or()
							.apply("create_by in (select id from t_user where name like {0})", like);
				})
				// 仅实名：数据页把「含匿名」取消勾选时，列表与 Excel 明细都只剩实名答卷，
				// PDF 任务不能多出匿名卷（null / true 一律按「不限」处理，保持老调用方行为）
				.eq(Boolean.FALSE.equals(spec.getIncludeAnonymous()), Answer::getIsAnonymous, false)
				.gt(spec.getStartTime() != null, Answer::getCreateAt, spec.getStartTime())
				.lt(spec.getEndTime() != null, Answer::getCreateAt, spec.getEndTime());
	}

	/**
	 * 姓名模糊查询的 LIKE 模式串：转义 {@code \ % _}，让「张_」只按字面量匹配
	 * （MySQL LIKE 的默认转义符就是 {@code \}）。
	 *
	 * <p>语义必须与 {@code AnswerServiceImpl#answererNameLike} 逐字一致：同一个搜索词在列表里筛出 3 条、
	 * 导出的 PDF 却有 4 条，就是「屏幕与文件不一致」。这里是照抄而不是抽公共方法，因为两边都是各自
	 * 模块的私有细节；口径一致性由 {@code AnswerPdfJobFilterScopeTest} 盯着。
	 *
	 * <p>这个值只作为绑定参数进 SQL（{@code apply(..., {0})}），不会被拼进 SQL 文本，注入不了；
	 * 转义只是为了让搜索框里的 % 和 _ 当普通字符，而不是「匹配所有人的通配符」。
	 */
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

	/**
	 * ZIP 条目名：{@code 子目录/姓名.扩展名}，重名在同一个子目录里加 (2)、(3)…
	 *
	 * <p>
	 * 去重必须按「子目录 + 文件名」整体算：叫「张三」的同学在同一批里可能既有一份成绩单
	 * 又有一份确认单，那是两个不同的文件，不能因为重名就把其中一个改名成「张三(2)」。
	 */
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

	/**
	 * ZIP 子目录名。这四个名字是前端导出弹窗里写死给老师看的提示（「内部按格式分子目录：成绩单/、答题卷/…」），
	 * 改一个名字，老师按目录认内容就认错了，所以别动。
	 */
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

	/**
	 * ZIP 文件名：{@code 项目名[-班级]-格式标签-时间.zip}。
	 *
	 * <p>
	 * 格式标签按勾选的格式拼（「答题卷+长图」），老师不用解压就知道里面有什么；
	 * 只有一种格式时沿用单格式命名 —— 其中成绩单仍然是历史上的「答卷PDF」，
	 * 免得按文件名找归档的老脚本/老习惯突然对不上。
	 */
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

	/** ZIP 名里的格式标签（见 {@link #zipFileName}），单独抽出来是为了能被单测直接盯住 */
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
	 *
	 * <p>除了「选哪些答卷」（classId / ids / 时间范围 / 轮次），还带上屏幕上的筛选条件
	 * （批改状态 / 姓名 / 分数段 / 仅实名）：导出文件与页面不一致时，老师会把整场导出当成
	 * 筛选结果发出去，事后再也分不清哪份文件对应哪次筛选。
	 */
	public static final class ExportSpec {

		private String projectId;

		/** 班级 id；为空表示不按班限定（整卷 / 勾选 ids / 时间范围导出） */
		private String classId;

		/** 指定导出的答卷 id；为空表示不限（即整个范围内的全部答卷） */
		private List<String> ids;

		/**
		 * 班级级权限范围（{@code t_class_resource} 分配给「我带的班」的班级 id）。
		 * 为空/null 表示没有班级级限制（项目协作者、管理员，或压根没有班级级权限）。
		 */
		private List<String> classScope;

		private Integer attemptNo;

		private Date startTime;

		private Date endTime;

		/**
		 * 批改状态（none / pending / graded）；null 或空串表示不限。
		 * <p>数据页与班级抽屉都按它筛，导出的 PDF 必须同一批答卷。
		 */
		private String gradeStatus;

		/** 答题人姓名（模糊匹配：答卷上的姓名快照 + 账号名反查）；null 或空串表示不限 */
		private String createByName;

		/** 分数段下限（闭区间）；null 表示不限 */
		private Double minScore;

		/** 分数段上限（闭区间）；null 表示不限 */
		private Double maxScore;

		/**
		 * 是否包含匿名答卷：null / true = 包含（不传的老调用方行为不变），
		 * 显式 false 才只导实名答卷 —— 与数据页「含匿名」复选框同一个口径。
		 */
		private Boolean includeAnonymous;

		private boolean includeAnalysis;

		private boolean includeImages;

		/**
		 * 要产出哪些格式，按顺序渲染。为空时由 {@code createJob} 兜底成成绩单 PDF，
		 * 保证直接 new ExportSpec() 的内部调用方也不会导出个空包。
		 */
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

		/** 成功写进 ZIP 的文件数（份 × 格式）：判断「是不是全灭」只能看它 */
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