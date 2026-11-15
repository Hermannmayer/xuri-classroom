package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 批量加入兼报班的结果：成功数 + 跳过原因（已达 3 个班/已在当前班/待审核等）。 */
@Data
public class AddExistingStudentsResult {

	private int added;

	private List<Skip> skipped = new ArrayList<>();

	@Data
	public static class Skip {

		private String userId;

		private String name;

		private String reason;

	}

}
