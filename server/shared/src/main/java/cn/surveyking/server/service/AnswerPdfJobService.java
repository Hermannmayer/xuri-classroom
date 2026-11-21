package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DownloadQuery;

import java.io.InputStream;
import java.util.Map;















public interface AnswerPdfJobService {

	/** 创建导出任务（校验范围 → 固化成任务快照 → 丢进线程池）；返回 任务 id。 */
	String createJob(DownloadQuery query);

	/** 查任务进度（带归属校验：只能看自己发起的，管理员除外）；返回 {jobId, status, total, done, failed, bytes, error, message, fileName, progress,。 */
	Map<String, Object> describeJob(String jobId);

	/** 取消任务：正在跑的会在下一份之前停下并删掉半成品；已经完成的会连产物一起删掉；返回 任务不存在时返回 false。 */
	boolean cancelJob(String jobId);

	/** 产物是否已经生成好（任务完成且文件存在） */
	boolean isArtifactReady(String jobId);

	/** 打开产物流（由调用方关闭）；文件不在抛「附件不存在」 */
	InputStream openArtifact(String jobId);

	/** 产物字节数，取不到返回 0 */
	long artifactSize(String jobId);

}
