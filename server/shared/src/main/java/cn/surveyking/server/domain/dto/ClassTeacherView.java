package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 某班级已经授权的老师（t_class_partner 的一行）。
 */
@Data
public class ClassTeacherView {

	/** t_class_partner.id，取消授权 / 修改级别时用 */
	private String id;

	private String userId;

	private String userName;

	private String deptName;

	/** 授权级别：1=只读 2=可管理（老数据/空值按只读回填） */
	private Integer accessLevel;

	private Date createAt;

}
