package cn.surveyking.server.flow.service.impl.taskHandler;

import cn.surveyking.server.flow.domain.dto.ApprovalTaskRequest;
import org.springframework.stereotype.Component;







@Component("agreeTaskHandler")
public class AgreeTaskHandler extends AbstractTaskHandler {

	@Override
	public boolean innerProcess(ApprovalTaskRequest request) {
		taskService.complete(request.getTaskId());
		return true;
	}

}
