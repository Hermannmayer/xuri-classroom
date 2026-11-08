package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;
import java.util.Set;

/**
 * @author javahuang
 * @date 2021/8/24
 */
public interface UserService extends UserDetailsService {

	UserInfo loadUserById(String userId);

	PaginationResponse<UserView> getUsers(UserQuery query);

	void createUser(UserRequest request);

	void createSystemUser(UserRequest request);

	/** 班主任在班级管理里新增学员：角色固定为系统内置学员角色。 */
	void createClassStudent(UserRequest request);

	/** 只读用户候选项（授权选人用），只返回 id/姓名/账号/组。 */
	List<UserOptionView> listUserOptions(String keyword);

	void updateUser(UserRequest request);

	void updateUserProfile(String userId, UserProfileRequest request);

	/**
	 * 保存当前账号的界面缩放（只改 ui_zoom 一个字段）。
	 */
	void updateUiZoom(UserRequest request);

	/**
	 * 保存当前账号的主题（light / dark）。
	 */
	void updateUiTheme(UserRequest request);

	void deleteUser(String id);

	boolean checkUsernameExist(String username);

	void updateUserPosition(UserRequest request);

	Set<String> getUserGroups(String userId);

	Set<String> getUsersByGroup(String groupId, String currentUser);

	List<UserInfo> selectUsers(SelectUserRequest request);

	void register(RegisterRequest request);

	List<RegisterRoleView> getRegisterRoles();

	UserOverview getUserOverviewData();

	void importUser(UserRequest request);

	PaginationResponse<MyTaskView> queryTask(MyTaskQuery query);

	void validateCaptcha(AuthRequest request);

	PaginationResponse<MyTaskView> queryHistoryTask(MyTaskQuery query);

}
