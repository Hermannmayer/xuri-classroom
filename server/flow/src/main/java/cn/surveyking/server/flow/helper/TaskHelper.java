package cn.surveyking.server.flow.helper;

import cn.surveyking.server.flow.domain.model.FlowEntryNode;
import cn.surveyking.server.flow.service.FlowEntryNodeService;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.flowable.engine.delegate.DelegateExecution;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;





@Component("t")
@RequiredArgsConstructor
public class TaskHelper {

	private final FlowEntryNodeService nodeService;

	private final UserService userService;

	/** 根据 xml 节点计算审批人 */
	public Set<String> getUsers(String activityId, String starterUserId) {
		FlowEntryNode node = nodeService.getById(activityId);
		Set<String> result = new LinkedHashSet<>();
		for (String identity : node.getIdentity()) {

			if (identity.startsWith("U:")) {
				result.add(identity.split(":")[1]);
			}
			else if (identity.startsWith("R:") || identity.startsWith("P:")) {

				result.addAll(userService.getUsersByGroup(identity, starterUserId));
			}
		}
		return result;
	}

	public void condition(DelegateExecution execution) {

	}

}
