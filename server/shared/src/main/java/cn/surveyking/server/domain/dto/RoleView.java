package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;





@Data
public class RoleView {

	private String id;

	private String name;

	private String code;

	private String remark;

	private List<String> authorities;

	private Date createAt;

	private Integer status;

}
