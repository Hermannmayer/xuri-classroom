package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * 答卷明细投影：交卷时把 answer JSON 展开成「一题一选项一行」，统计直接走 SQL 聚合。
 *
 * <p>
 * 真源仍是 {@code t_answer.answer}（整份 JSON），这里只是给统计用的派生数据：
 * 丢掉可以随时从答案重建（见 {@code AnswerItemBackfill}）。
 */
@Data
@TableName("t_answer_item")
public class AnswerItem {

	@TableId
	private String id;

	private String answerId;

	private String projectId;

	private String questionId;

	private String questionType;

	private String optionId;

	/** 该选项对应的答案值（JSON，保留类型）；导出重建 answer 时用 */
	private String valueJson;

	private String valueKey;

	private Double score;

	private Date createAt;

}