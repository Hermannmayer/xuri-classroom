package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;







@Data
@EqualsAndHashCode(callSuper = false)
public class MyTaskQuery extends PageQuery {

	private String type;

}
