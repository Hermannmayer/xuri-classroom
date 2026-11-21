package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;




@Data
public class ClassTeacherView {


	private String id;

	private String userId;

	private String userName;

	private String deptName;


	private Integer accessLevel;

	private Date createAt;

}
