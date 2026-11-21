package cn.surveyking.server.flow.service.impl.taskHandler;

import cn.surveyking.server.flow.domain.dto.ApprovalTaskRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Component;







@Component("rollbackTaskHandler")
@Slf4j
public class RollbackTaskHandler extends AbstractTaskHandler {

	@Override
	public boolean innerProcess(ApprovalTaskRequest request) {
		Task task = getCurrentRunningTask(request.getTaskId());
		String currentActivityId = task.getTaskDefinitionKey();
		String newActivityId = request.getNewActivityId();
		if (rollbackToStartEvent(request)) {
			return true;
		}
		TaskTreeNode taskTreeNode = getHistoricTree(task.getProcessInstanceId());
		if (StringUtils.isEmpty(request.getNewActivityId())) {

			newActivityId = taskTreeNode.getParent().getActivityId();
			request.setActivityId(newActivityId);
		}
		if (StringUtils.isNotBlank(newActivityId)) {
			log.info("驳回任务 {} -> {}", currentActivityId, newActivityId);
			runtimeService.createChangeActivityStateBuilder().processInstanceId(task.getProcessInstanceId())
					.moveActivityIdTo(currentActivityId, newActivityId).changeState();
		}
		return true;
	}

}
