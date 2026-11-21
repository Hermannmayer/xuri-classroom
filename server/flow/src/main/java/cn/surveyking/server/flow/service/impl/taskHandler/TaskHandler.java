package cn.surveyking.server.flow.service.impl.taskHandler;

import cn.surveyking.server.flow.domain.dto.ApprovalTaskRequest;





public interface TaskHandler {

	void process(ApprovalTaskRequest request);

}
