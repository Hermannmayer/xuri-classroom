package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;





@Data
@EqualsAndHashCode(callSuper = false)
public class ProjectPartnerQuery extends PageQuery {

	private String projectId;

	private List<Integer> types;

	private Integer status;

	private String userName;

}
