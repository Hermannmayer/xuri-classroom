package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DownloadQuery;

import java.io.InputStream;
import java.util.Map;

/**
 * 班级答卷批量导出 PDF 的异步任务服务。
 *
 * <p>
 * 为什么拆成接口 + 实现（{@code rdbms/impl/AnswerPdfJobServiceImpl}）：{@code api} 模块只依赖
 * {@code project(':rdbms')} 的编译产物，而 mybatis-plus 在 rdbms 里是 {@code implementation} 依赖，
 * 不会传到 api 的编译类路径。Controller 直接按实现类注入会在编译期报
 * 「无法访问 com.baomidou...ServiceImpl」。接口放 shared 模块，Controller 只依赖这个接口，
 * 与 {@code AnswerService} / {@code ClassService} 的做法一致。
 *
 * <p>
 * 任务本身是内存态（不建表）：进程重启后未完成的任务会消失，前端轮询会拿到
 * 「导出任务不存在或已过期」，重新导出即可。
 */
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
	 * 否则导出文件与页面不一致，会被当成系统算错。
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
