package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;





@Data
public class SelectPositionRequest {

	private List<String> selected = new ArrayList<>();

}
