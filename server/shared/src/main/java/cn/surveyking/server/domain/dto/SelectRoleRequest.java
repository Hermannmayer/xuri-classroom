package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;





@Data
public class SelectRoleRequest {

	private List<String> selected = new ArrayList<>();

}
