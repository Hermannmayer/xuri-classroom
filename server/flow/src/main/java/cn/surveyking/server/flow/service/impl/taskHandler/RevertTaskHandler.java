package cn.surveyking.server.flow.service.impl.taskHandler;

import cn.surveyking.server.flow.domain.dto.ApprovalTaskRequest;
import cn.surveyking.server.flow.domain.model.FlowOperation;
import cn.surveyking.server.flow.exception.FlowableRuntimeException;
import lombok.extern.slf4j.Slf4j;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;







@Component("revertTaskHandler")
@Slf4j
public class RevertTaskHandler extends AbstractTaskHandler {

	@Override
	public boolean innerProcess(ApprovalTaskRequest request) {
		if (!canRevert(request.getTaskId(), request.getProcessInstanceId())) {
			throw new FlowableRuntimeException("当前节点不能进行驳回操作");
		}
		if (rollbackToStartEvent(request)) {
			return true;
		}

		List<Task> tasks = getProcessInstanceActiveTaskList(request.getProcessInstanceId());
		runtimeService.createChangeActivityStateBuilder().processInstanceId(request.getProcessInstanceId())
				.moveActivityIdTo(tasks.get(0).getTaskDefinitionKey(), request.getActivityId()).changeState();
		return true;
	}

	/** 只有最近一条的操作记录是自己才能进行驳回操作 */
	public boolean canRevert(String taskId, String processInstanceId) {
		List<FlowOperation> operationList = getOperations(processInstanceId);
		if (operationList.size() > 0 && taskId.equals(operationList.get(0).getId())) {
			return true;
		}
		return false;
	}

	/** 获取当前可以回退的节点列表 */
	public List<TaskTreeNode> getRevertNodes(String processInstanceId) {

		TaskTreeNode lastNode = getHistoricTree(processInstanceId).getParent();
		List<TaskTreeNode> nodes = new ArrayList<>();
		while (true) {
			if (lastNode == null) {
				return nodes;
			}
			nodes.add(lastNode);
			lastNode = lastNode.getParent();
		}
	}

}
