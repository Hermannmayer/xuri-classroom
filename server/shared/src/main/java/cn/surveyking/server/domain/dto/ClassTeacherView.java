package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 某班级已经授权的老师（t_class_partner 的一行）。
 */
@Data
public class ClassTeacherView {

	/** t_class_partner.id，取消授权时用 */
	private String id;

	private String userId;

	private String userName;

	private String deptName;

	private Date createAt;

}
