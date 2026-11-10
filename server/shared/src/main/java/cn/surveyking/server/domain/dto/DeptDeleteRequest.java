package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 删除用户组的请求。
 *
 * <p>组里没成员时 {@code memberAction} 可以留空；有成员时必须二选一：
 * <ul>
 * <li>{@code UNASSIGN}：主组成员 {@code t_user.dept_id} 置空（变成未分组，账号仍可用），
 * 同时删除该组的附加组绑定；</li>
 * <li>{@code MOVE}：把主组成员迁到 {@code moveToDeptId}（目标必须是存在的、非本组/子组的组），
 * 同时删除该组的附加组绑定。</li>
 * </ul>
 * 子组不会被自动处理：有子组时删除会直接失败，要求先删/先移。
 *
 * @author backend-ops
 */
@Data
public class DeptDeleteRequest {

	/** 要删除的用户组 id */
	private String id;

	/** 成员处理方式：MOVE / UNASSIGN；无成员时可为空 */
	private String memberAction;

	/** memberAction=MOVE 时的目标用户组 id */
	private String moveToDeptId;

}
