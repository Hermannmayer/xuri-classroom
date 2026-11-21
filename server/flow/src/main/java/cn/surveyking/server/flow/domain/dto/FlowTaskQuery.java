package cn.surveyking.server.flow.domain.dto;

import cn.surveyking.server.domain.dto.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;





@Data
@EqualsAndHashCode(callSuper = false)
public class FlowTaskQuery extends PageQuery {

	private Integer type;

	private String projectId;

	private Integer status;

	private String createBy;

}
