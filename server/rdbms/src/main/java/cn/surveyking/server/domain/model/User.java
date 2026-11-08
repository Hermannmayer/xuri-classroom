package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * @author javahuang
 * @date 2021/8/23
 */
@Data
@TableName(value = "t_user", autoResultMap = true)
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
public class User extends BaseModel {

	private String name;

	private String deptId;

	private String phone;

	private String email;

	private String avatar;

	private String gender;

	private String birthday;

	private String profile;

	/**
	 * 0失活 1 激活
	 */
	private Integer status;

	/**
	 * 用户类型：staff = 老师/管理员/职工；student = 学员。
	 * 学员只在「班级管理」里按班维护，用户管理只列 staff。
	 */
	private String userType;

	/**
	 * 错题答对次数
	 */
	private Integer correctTimes;

	/** 界面缩放（0.9 / 1 / 1.15 / 1.3），跟着账号走，换设备也一致；存字符串，避免 decimal→Double 读回 null */
	private String uiZoom;

	/** 主题：light / dark，跟着账号走 */
	private String uiTheme;

}
