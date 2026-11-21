package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;





@Data
@EqualsAndHashCode(callSuper = false)
public class CommDictQuery extends PageQuery {

	private String name;

}
