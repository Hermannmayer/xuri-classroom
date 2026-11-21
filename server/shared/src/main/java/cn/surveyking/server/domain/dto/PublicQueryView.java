package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;





@Data
public class PublicQueryView {




	private SurveySchema schema;




	private List<PublicAnswerView> answers;

	private LinkedHashMap<String, Integer> fieldPermission;

}
