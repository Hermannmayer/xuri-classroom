/** 题库直接落库请求：题目来自前端预览与勾选结果。 */
package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 题库直接落库请求：题目来自前端预览并勾选后的结果，服务端不再重新解析源文件。
 */
@Data
public class RepoQuestionImportRequest {

	private String repoId;

	private List<SurveySchema> questions;

}
