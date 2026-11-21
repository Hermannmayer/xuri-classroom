package cn.surveyking.server.ai.core;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;


















@Service
@Slf4j
public class AiJobService {


	public static final String STATUS_QUEUED = "queued";


	public static final String STATUS_RUNNING = "running";


	public static final String STATUS_DONE = "done";


	public static final String STATUS_FAILED = "failed";


	private static final long TTL_MILLIS = 24L * 60L * 60L * 1000L;


	private static final int MAX_JOBS = 20;


	private static final int POOL_SIZE = 2;


	private static final int QUEUE_CAPACITY = 4;

	private static final ConcurrentHashMap<String, LocalJob> JOBS = new ConcurrentHashMap<>();

	private final ThreadPoolExecutor pool = new ThreadPoolExecutor(POOL_SIZE, POOL_SIZE, 60L, TimeUnit.SECONDS,
			new ArrayBlockingQueue<>(QUEUE_CAPACITY), runnable -> {
				Thread thread = new Thread(runnable, "ai-job");
				thread.setDaemon(true);
				return thread;
			}, new ThreadPoolExecutor.AbortPolicy());

	/**
	 * 提交一个长任务。
	 * @param scene 场景标识（写进任务、日志），如 {@code paper_generate}
	 * @param ownerId 发起人（用于归属校验；后台线程里拿不到 SecurityContext，必须显式传进来）
	 * @param task 任务体：通过 {@link JobContext} 报进度与结果
	 * @return 任务 id
	 */
	public String submit(String scene, String ownerId, JobTask task) {
		if (task == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 任务内容为空");
		}
		pruneExpired();
		if (JOBS.size() >= MAX_JOBS) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "当前 AI 任务过多，请稍后再试");
		}
		LocalJob job = new LocalJob(UUID.randomUUID().toString().replace("-", ""), scene, ownerId);
		JOBS.put(job.id, job);
		try {
			pool.execute(() -> run(job, task));
		}
		catch (RejectedExecutionException rejected) {
			JOBS.remove(job.id);
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 任务排队已满，请稍后再试");
		}
		log.info("创建 AI 任务: jobId={}, scene={}, operator={}", job.id, scene, ownerId);
		return job.id;
	}

	/**
	 * 查任务（带归属校验：只能看自己发起的，管理员除外）。
	 * @return {jobId, scene, status, progress, error, result, createdAt, finishedAt}
	 */
	public Map<String, Object> describe(String jobId) {
		LocalJob job = JOBS.get(jobId);
		if (job == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "AI 任务不存在或已过期，请重新发起");
		}
		assertOwner(job);
		Map<String, Object> view = new LinkedHashMap<>();
		view.put("jobId", job.id);
		view.put("scene", job.scene);
		view.put("status", job.status);
		view.put("progress", Integer.valueOf(job.progress));
		view.put("error", job.error);
		view.put("result", job.result);
		view.put("createdAt", Long.valueOf(job.createdAt));
		view.put("finishedAt", Long.valueOf(job.finishedAt));
		return view;
	}

	/* ====== 任务执行 ====== */

	private void run(LocalJob job, JobTask task) {
		job.status = STATUS_RUNNING;
		long start = System.currentTimeMillis();
		try {
			task.run(new JobContext(job));
			if (!STATUS_FAILED.equals(job.status)) {
				job.progress = 100;
				job.status = STATUS_DONE;
			}
			log.info("AI 任务完成: jobId={}, scene={}, costMs={}", job.id, job.scene,
					System.currentTimeMillis() - start);
		}
		catch (ErrorCodeException e) {
			job.error = e.getMessage();
			job.status = STATUS_FAILED;
			log.warn("AI 任务失败: jobId={}, scene={}, {}", job.id, job.scene, e.getMessage());
		}
		catch (Exception e) {
			job.error = "AI 任务执行失败：" + (StringUtils.hasText(e.getMessage()) ? e.getMessage() : e.getClass().getSimpleName());
			job.status = STATUS_FAILED;
			log.error("AI 任务异常: jobId={}, scene={}", job.id, job.scene, e);
		}
		finally {
			job.finishedAt = System.currentTimeMillis();
		}
	}



	/** 每小时清一次超过 24 小时的任务记录 */
	@Scheduled(cron = "0 23 * * * ?")
	public void cleanupExpiredJobs() {
		pruneExpired();
	}

	/** 创建任务时顺手清一遍，避免「定时任务没跑到」时内存无限涨 */
	private void pruneExpired() {
		long deadline = System.currentTimeMillis() - TTL_MILLIS;
		for (LocalJob job : new ArrayList<>(JOBS.values())) {
			if (job.finishedAt > 0L && job.finishedAt < deadline) {
				JOBS.remove(job.id);
			}
		}
	}

	/* ====== 归属校验 ====== */

	private void assertOwner(LocalJob job) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		String current = SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : null;
		if (job.ownerId != null && current != null && !Objects.equals(job.ownerId, current)) {
			throw new org.springframework.security.access.AccessDeniedException("无权访问该 AI 任务");
		}
	}


	public interface JobTask {

		void run(JobContext context) throws Exception;

	}


	public static final class JobContext {

		private final LocalJob job;

		private JobContext(LocalJob job) {
			this.job = job;
		}

		public String getJobId() {
			return job.id;
		}

		/** 进度只进不退：前端进度条不会往回抖 */
		public void progress(int percent) {
			job.progress = Math.max(job.progress, Math.min(99, Math.max(0, percent)));
		}

		public void result(Object result) {
			job.result = result;
		}

		/** 业务上不算异常但也不该给结果的场景（例如内容校验不通过但想自己写原因） */
		public void fail(String message) {
			job.error = message;
			job.status = STATUS_FAILED;
		}

	}


	private static final class LocalJob {

		private final String id;

		private final String scene;

		private final String ownerId;

		private final long createdAt = System.currentTimeMillis();

		private volatile String status = STATUS_QUEUED;

		private volatile int progress;

		private volatile String error;

		private volatile Object result;

		private volatile long finishedAt;

		private LocalJob(String id, String scene, String ownerId) {
			this.id = id;
			this.scene = scene;
			this.ownerId = ownerId;
		}

	}

}
