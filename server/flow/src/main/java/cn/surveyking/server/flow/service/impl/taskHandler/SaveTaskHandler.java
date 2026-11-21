package cn.surveyking.server.flow.service.impl.taskHandler;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.flow.constant.FlowConstant;
import cn.surveyking.server.flow.domain.dto.ApprovalTaskRequest;
import cn.surveyking.server.flow.domain.model.FlowEntry;
import org.flowable.engine.runtime.ProcessInstance;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;







@Component("saveTaskHandler")
public class SaveTaskHandler extends AbstractTaskHandler {

	@Override
	public boolean innerProcess(ApprovalTaskRequest request) {
		Map<String, Object> variables = new HashMap<>();
		variables.put(FlowConstant.VARIABLE_ANSWER_KEY, request.getAnswerId());
		variables.put(FlowConstant.VARIABLE_STARTER_USER, SecurityContextUtils.getUserId());
		FlowEntry entry = getFlowEntry(request.getProjectId());

		if (entry == null) {
			return false;
		}

		if (request.getProcessInstanceId() == null) {
			ProcessInstance processInstance = runtimeService.startProcessInstanceByKey(request.getProjectId(),
					request.getAnswerId(), variables);
			request.setProcessInstanceId(processInstance.getId());
		}
		else {

			runtimeService.activateProcessInstanceById(request.getProcessInstanceId());

			String starterActivityId = FlowConstant.STARTER_ACTIVITY_ID;
			String currentActivityId = getProcessInstanceActiveTaskList(request.getProcessInstanceId()).get(0)
					.getTaskDefinitionKey();
			request.setNewActivityId(starterActivityId);
			runtimeService.createChangeActivityStateBuilder().processInstanceId(request.getProcessInstanceId())
					.moveActivityIdTo(currentActivityId, starterActivityId).changeState();
		}
		return true;
	}

}