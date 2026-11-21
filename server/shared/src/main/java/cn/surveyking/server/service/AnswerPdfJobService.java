package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DownloadQuery;

import java.io.InputStream;
import java.util.Map;















public interface AnswerPdfJobService {

	/**
	 * 创建导出任务（校验范围 → 固化成任务快照 → 丢进线程池）。
	 *
	 * <p>
	 * 范围三选一：只给 classId（按班）、只给 ids（勾选导出）、都不给（整卷）；可再叠加
	 * startTime / endTime / attemptNo。权限：classId 有值时校验班级可见，为空时校验项目级权限。
	 *
	 * <p>
	 * 屏幕上的筛选（gradeStatus / createByName / minScore / maxScore / includeAnonymous）也必须一起传：
	 * 老师「筛完再导出」时期望拿到的是筛出来的那一批，PDF 与 Excel 明细的取数条件完全一致，

	 * @param query 导出范围与产出格式。outputs 可选（成绩单 / 答题卷还原 / 长图 / 确认单），
	 * 为空时按 type 走老逻辑（只出成绩单）。includeImages 已废弃：签名与上传图片总是包含。
	 * @return 任务 id
	 */
	String createJob(DownloadQuery query);

	/**
	 * 查任务进度（带归属校验：只能看自己发起的，管理员除外）。
	 * @param jobId 任务 id
	 * @return {jobId, status, total, done, failed, bytes, error, message, fileName, progress,
	 * projectId, classId}；projectId/classId 供 Controller 做权限复查与审计
	 */
	Map<String, Object> describeJob(String jobId);

	/**
	 * 取消任务：正在跑的会在下一份之前停下并删掉半成品；已经完成的会连产物一起删掉。
	 * @return 任务不存在时返回 false
	 */
	boolean cancelJob(String jobId);

	/** 产物是否已经生成好（任务完成且文件存在） */
	boolean isArtifactReady(String jobId);

	/** 打开产物流（由调用方关闭）；文件不在抛「附件不存在」 */
	InputStream openArtifact(String jobId);

	/** 产物字节数，取不到返回 0 */
	long artifactSize(String jobId);

}
