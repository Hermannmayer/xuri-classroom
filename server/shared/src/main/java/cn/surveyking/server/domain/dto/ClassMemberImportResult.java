package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 班级学员批量导入结果。
 *
 * <p>导入是整批事务：要么全部成功，要么整批回滚并抛出「第 N 行：原因」的校验异常，
 * 因此这里的 {@link #imported} 是本次成功建号的学员数。
 */
@Data
public class ClassMemberImportResult {

	/** 成功导入的学员数 */
	private int imported;

}
