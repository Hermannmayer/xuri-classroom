package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * AI 学情总结结果：一段纯文本，前端按普通段落渲染（分词/换行自己处理）。
 *
 * @author p4-backend
 */
@Data
public class AiReportSummaryView {

	private String text;

}
