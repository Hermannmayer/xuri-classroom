package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.core.uitls.IPUtils;
import cn.surveyking.server.domain.dto.*;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.util.CollectionUtils;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/3
 */
public interface AnswerService {

	PaginationResponse<AnswerView> listAnswer(AnswerQuery filter);

	/**
	 * 按班级查答卷（教学页「班级答卷」报表用）。
	 *
	 * <p>必须同时带 {@code projectId} 与 {@code classId}；可见性由调用方先校验（
	 * {@code ClassService#assertVisible}），这里**不套**「非协作者只看自己」的行级过滤，
	 * 否则不是项目所有者/协作者的班主任只能看到自己的答卷。非班级入口仍走 {@link #listAnswer}。
	 */
	PaginationResponse<AnswerView> listAnswerByClass(AnswerQuery query);

	/**
	 * 统计回退路径专用：按项目取全部答卷，**不按 createBy 过滤**。
	 * <p>
	 * 列表页的「只能看自己的答卷」是行级数据范围；统计的权限由 {@code statistic} 方法上的
	 * {@code @PreAuthorize} 保证，若这里再套一层行级过滤，未登录/非协作者会统计出 0 份，
	 * 与投影路径（按 project_id 聚合）结果不一致。
	 */
	List<AnswerView> listAnswersForStat(String projectId);

	/**
	 * 公开查询专用：按项目 + 一组「答案 JSON 模糊条件」取原始答卷。
	 * <p>
	 * 之前调用方是 {@code ((AnswerServiceImpl) answerService).list(Wrapper)} —— 强转实现类才能用
	 * MyBatis-Plus 的 {@code ServiceImpl.list}，既破坏分层，也让方法搬不进独立组件。
	 * 这里把 Wrapper 的构造收进实现类，接口只暴露语义。
	 */
	List<AnswerView> listByProjectAndLikeConditions(String projectId, List<String> likeValues);

	AnswerView getAnswer(AnswerQuery query);

	AnswerView getAnswerWithPermission(AnswerQuery query);

	long count(AnswerQuery query);

	AnswerView saveAnswer(AnswerRequest answer);

	AnswerView updateAnswer(AnswerRequest answer);

	AnswerView updateAnswerWithPermission(AnswerRequest answer);

	void deleteAnswer(AnswerRequest request);

	DownloadData downloadAttachment(DownloadQuery query);

	DownloadData downloadSurvey(DownloadQuery query);

	/**
	 * 按班级导出答卷（xlsx）。
	 *
	 * <p>只含该班（{@code t_answer.class_id}）的已提交答卷；班级可见性由调用方先校验。
	 */
	DownloadData downloadByClass(DownloadQuery query);

	default AnswerMetaInfo.ClientInfo parseClientInfo(AnswerMetaInfo.ClientInfo clientInfo) {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		if (clientInfo == null) {
			clientInfo = new AnswerMetaInfo.ClientInfo();
		}
		String userAgentStr = request.getHeader("User-Agent");
		clientInfo.setAgent(userAgentStr);
		clientInfo.setRemoteIp(IPUtils.getClientIpAddress(request));
		Cookie limitCookie = WebUtils.getCookie(request, AppConsts.COOKIE_LIMIT_NAME);
		if (limitCookie != null) {
			clientInfo.setCookie(limitCookie.getValue());
		}
		return clientInfo;
	}

	default ResponseEntity<Resource> download(DownloadQuery query) {
		DownloadData download;
		if (!CollectionUtils.isEmpty(query.getIds())) {
			query.setPageSize(query.getIds().size());
		}
		// 下载问卷答案
		if (query.getType() == DownloadQuery.DownloadType.answer) {
			download = downloadSurvey(query);
		}
		// 下载附件
		else if (query.getType() == DownloadQuery.DownloadType.answerAttachment
				|| query.getType() == DownloadQuery.DownloadType.attachment) {
			download = downloadAttachment(query);
		}
		else {
			throw new InternalServerError("未知下载类型");
		}
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(download.getFileName()))
				.contentType(download.getMediaType()).body(download.getResource());
	}

	List<AnswerView> listAnswerDeleted(AnswerQuery query);

	void batchDestroyAnswer(AnswerRequest request);

	void restoreAnswer(AnswerRequest request);

	AnswerUploadView upload(AnswerUploadRequest request);

	PaginationResponse<ExerciseView> historyExercise(HistoryExerciseQuery query);

	void deleteExercise(AnswerRequest request);

}
