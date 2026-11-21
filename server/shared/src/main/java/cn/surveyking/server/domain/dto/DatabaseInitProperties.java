package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class DatabaseInitProperties {


	private String username;


	private String password;


	private String dbName;


	private String driverClassName;


	private String dbIp = "127.0.0.1";


	private Integer dbPort;


	private Integer serverPort = 1991;

	private String applicationName = "SurveyKing";


	private String dataSourceUrl;

}
