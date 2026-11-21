package cn.surveyking.server.flow.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.PublicProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.flow.domain.dto.*;

import java.util.List;





public interface FlowService {

	/** 启动前过滤过滤当前问卷 schema */
	void beforeLaunchProcess(PublicProjectView projectView);

	/** 流程设计保存 */
	void saveFlow(FlowEntryRequest request);

	/** 部署设计部署 */
	void deploy(String projectId);

	/** 完成任务 */
	void approvalTask(ApprovalTaskRequest request);

	/** 获取流程信息 */
	FlowEntryView getFlowEntry(String projectId);

	/** 获取用户任务列表 */
	PaginationResponse<FlowTaskView> getFlowTasks(FlowTaskQuery query);

	/** 查询当前任务节点根据权限过滤之后的 schema */
	SurveySchema loadSchemaByPermission(SchemaQuery query);

	/** 获取当前流程实例的审核记录 */
	List<FlowOperationView> getAuditRecord(String processInstanceId);

	/** 获取可以回退的任务节点 */
	List<RevokeView> getRevertNodes(String processInstanceId);

	/** 返回 当前用户任务统计信息；返回 当前用户任务统计信息。 */
	FlowStaticsView statics();

}
