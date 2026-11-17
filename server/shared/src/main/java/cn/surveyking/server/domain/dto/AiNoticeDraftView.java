package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 公告草稿结果（{@code POST /api/ai/notice/draft}）。
 *
 * @author ai-actions
 */
@Data
public class AiNoticeDraftView {

	private String title;

	/** 正文（纯文本，段落之间用换行；前端直接填进公告编辑器） */
	private String content;

	/** 建议受众 */
	private String audience;

	/** 建议班级 */
	private List<String> classIds;

	/** 模型额外提醒（例如「建议补上考试地点」） */
	private String tip;

}
