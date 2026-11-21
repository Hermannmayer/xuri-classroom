package cn.surveyking.server.flow.domain.dto;

import lombok.Data;





@Data
public class FlowNodeSetting {


	private Boolean passwordRequired;


	private String password;


	private Boolean allowWithdraw;


	private Boolean flowLogVisible;


	private Boolean allowFinishFlow;


	private Boolean messageBoardVisible;


	private String allowAssignee;


	private String assigneeTo;


	private Boolean allowGoBack;


	private Integer isSequential;


	private Integer approveType;

}
