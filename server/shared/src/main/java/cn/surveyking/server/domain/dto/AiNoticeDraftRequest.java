package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 公告草稿请求（{@code POST /api/ai/notice/draft}）。
 *
 * <p>只生成<b>草稿</b>，不发布：老师写完要点、AI 补成规范通知，人再改一遍才发出去。
 *
 * @author ai-actions
 */
@Data
public class AiNoticeDraftRequest {

	/** 老师写的要点（必填），例如「下周三上午 9 点考养老护理员五级，带身份证」 */
	private String points;

	/** 受众：all / admin / teacher / student（可空，默认按当前账号权限给最保守的） */
	private String audience;

	/** 发给哪些班级（audience=class 时的范围；老师只能发自己可见的班） */
	private List<String> classIds;

	/** 语气：formal 正式 / brief 简短 / warm 温和（可空，默认 formal） */
	private String tone;

	/** 标题里的主题（可空，模型自己拟） */
	private String subject;

}
