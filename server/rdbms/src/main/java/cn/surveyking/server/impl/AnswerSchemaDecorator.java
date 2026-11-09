package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.StorageTypeEnum;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.FlatSurveySchemaByType;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.DeptService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 答卷视图的 schema 装饰：把答卷 JSON 里「人 / 部门 / 附件」三类题的 ID 展开成展示字段。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出。列表、详情、回收站三个入口共用同一份扁平 schema， 这里只做「按题型过滤 + 填充视图」，不读写答卷本身。
 */
@Component
@RequiredArgsConstructor
public class AnswerSchemaDecorator {

	private final UserService userService;

	private final DeptService deptService;

	private final FileService fileService;

	private final AnswerAssembler answerAssembler;

	public FlatSurveySchemaByType parseSurveySchemaByType(SurveySchema schema) {
		FlatSurveySchemaByType schemaByType = new FlatSurveySchemaByType();
		List<SurveySchema> schemaDataTypes = SchemaHelper.flatSurveySchema(schema);
		schemaByType.setSchemaDataTypes(schemaDataTypes);
		schemaByType.setUserQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.User));
		schemaByType.setDeptQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Dept));
		schemaByType.setFileQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Signature));
		schemaByType.getFileQuestions()
				.addAll((parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Upload)));
		return schemaByType;
	}

	private List<SurveySchema> parseSurveySchemaByType(List<SurveySchema> flattedSurveySchema,
			SurveySchema.QuestionType questionType) {
		return flattedSurveySchema.stream().filter(x -> x.getType() == questionType).collect(Collectors.toList());
	}

	public void setAnswerExtraInfo(AnswerView view, FlatSurveySchemaByType schemaByType) {
		setAnswerTypeInfo(schemaByType.getDeptQuestions(), view);
		setAnswerTypeInfo(schemaByType.getFileQuestions(), view);
		setAnswerTypeInfo(schemaByType.getUserQuestions(), view);
		answerAssembler.setUserName(view);
	}

	private void setAnswerTypeInfo(List<SurveySchema> flatQuestionSchema, AnswerView view) {
		if (flatQuestionSchema.size() == 0) {
			return;
		}
		LinkedHashMap<String, Object> answers = view.getAnswer();
		SurveySchema.QuestionType questionType = flatQuestionSchema.get(0).getType();
		flatQuestionSchema.forEach(question -> {
			String questionId = question.getId();
			Object option2value = answers.get(questionId);
			if (option2value != null && option2value instanceof Map) {
				// 签名题前端存的是 {qId: {oId: fileId}} 需要转换成数组
				((Map<String, Object>) option2value).values().stream().map(x -> {
					if (x instanceof List) {
						return (List<String>) x;
					}
					return Collections.singletonList(x.toString());
				}).collect(Collectors.toList()).forEach(ids -> {
					if (questionType == SurveySchema.QuestionType.User) {
						view.setUsers(ids.stream().map(userId -> userService.loadUserById(userId).simpleMode())
								.collect(Collectors.toList()));
					}
					else if (questionType == SurveySchema.QuestionType.Signature
							|| questionType == SurveySchema.QuestionType.Upload) {
						FileQuery query = new FileQuery();
						query.setType(StorageTypeEnum.ANSWER_ATTACHMENT.getType());
						query.setIds(ids);
						query.setProjectId(view.getProjectId());
						query.setQuestionId(questionId);
						// 图片上传和签名需要做一个合并
						view.getAttachment().addAll(fileService.listFiles(query));
					}
					else if (questionType == SurveySchema.QuestionType.Dept) {
						view.setDepts(ids
								.stream().map(id -> deptService.listDept(null).stream()
										.filter(x -> x.getId().equals(id)).findFirst().orElseGet(DeptView::new))
								.collect(Collectors.toList()));
					}
				});
			}
		});
	}

}
