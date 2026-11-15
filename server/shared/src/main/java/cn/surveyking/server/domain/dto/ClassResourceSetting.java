package cn.surveyking.server.domain.dto;

import lombok.Data;

/** 班级级资源设置；存在 t_class_resource.settings JSON 里，空/null 表示继承。 */
@Data
public class ClassResourceSetting {

	/** 考试：本班额外补考次数；0=不额外开放 */
	private Integer extraAttempts;

	/** 考试：交卷后是否可看答案解析；null=继承项目设置 */
	private Boolean answerAnalysis;

	/** 考试：班级及格线（仅报表判定用）；null=继承/不判定 */
	private Double passScore;

	/** 题库：是否允许本班练习；null/true=允许 */
	private Boolean practiceEnabled;

}
