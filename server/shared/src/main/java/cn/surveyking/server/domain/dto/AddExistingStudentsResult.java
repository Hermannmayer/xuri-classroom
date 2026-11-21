package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


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
