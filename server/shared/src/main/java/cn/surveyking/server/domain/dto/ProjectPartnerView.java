package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * @author javahuang
 * @date 2022/1/28
 */
@Data
public class ProjectPartnerView {

	private String id;

	private Integer type;

	private UserInfo user;

	private String userName;

	private Integer status;

	private String userId;

	/** 授权级别：1 只读 / 2 可编辑 / 3 可授权（答卷人与所有者不按级别处理） */
	private Integer accessLevel;

}
