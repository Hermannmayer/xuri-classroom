package cn.surveyking.server.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ClassShareLinkView {

	private String classId;

	private String resourceId;

	private String token;

}
