package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DashboardQuery;
import cn.surveyking.server.domain.dto.DashboardRequest;
import cn.surveyking.server.domain.dto.DashboardView;

import java.util.List;





public interface DashboardService {

	List<DashboardView> listDashboard(DashboardQuery query);

	void saveDashboard(List<DashboardRequest> request);

}
