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

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;





public interface AnswerService {

	PaginationResponse<AnswerView> listAnswer(AnswerQuery filter);

	/** 按班级查答卷（教学页「班级答卷」报表用） */
	PaginationResponse<AnswerView> listAnswerByClass(AnswerQuery query);

	/** 统计回退路径专用：按项目取全部答卷，**不按 createBy 过滤** */
	List<AnswerView> listAnswersForStat(String projectId);

	/** 公开查询专用：按项目 + 一组「答案 JSON 模糊条件」取原始答卷 */
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

	/** 按班级导出答卷（xlsx） */
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

		if (query.getType() == DownloadQuery.DownloadType.answer) {
			download = downloadSurvey(query);
		}

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
