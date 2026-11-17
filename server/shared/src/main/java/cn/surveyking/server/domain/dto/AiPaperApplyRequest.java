package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 把 AI 生成的题目追加进项目 schema（{@code POST /api/ai/paper/apply}）。
 *
 * <p>语义是<b>追加</b>而不是替换：老师在编辑器里可能已经写了一半的卷子，
 * 直接覆盖等于把人的工作丢掉。需要整体替换时走原有的 {@code /api/project/update}。
 *
 * @author p4-backend
 */
@Data
public class AiPaperApplyRequest {

	private String projectId;

	/** 要追加的题目（就是预览表里被采纳的那些） */
	private List<SurveySchema> questions;

}
