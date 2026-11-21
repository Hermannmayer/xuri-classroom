package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class SystemInfoRequest {




	private String id;




	private String name;




	private String description;




	private String avatar;




	private String locale;




	private SystemInfo.RegisterInfo registerInfo;

	private SystemInfo.SystemSetting setting;

	private SystemInfo.AiSetting aiSetting;

}
