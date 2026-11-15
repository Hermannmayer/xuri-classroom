package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 注册入口的可用性：登录页只有 enabled=true 才显示「注册」。
 *
 * @author 守夜人
 */
@Data
public class RegisterOptionsView {

	/** 全局总闸（系统设置里的开放注册） */
	private boolean globalEnabled;

	/** 综合结果：全局开启且至少有一个教学班开放注册时才为 true */
	private boolean enabled;

	/** 不可用原因：GLOBAL_OFF / NO_CLASS_OPEN；可用时为 null */
	private String reason;

	/** 可选教学班（classKind=teaching + allow_register=1） */
	private List<RegisterClassView> classes;

}
