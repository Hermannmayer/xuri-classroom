package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * MCP / API 访问令牌（表结构见 db/migration/V2.2.5__api_token.sql）。
 *
 * <p>三条硬约束：
 * <ul>
 * <li>只存 SHA-256（{@link #tokenHash}），明文只在签发响应里出现一次；</li>
 * <li>{@link #userId} 决定「这个令牌有多大的权限」——MCP 调用会把该用户塞进 SecurityContext，
 * 复用现有 {@code @PreAuthorize} 口径，因此**不要**给令牌单独配权限集；</li>
 * <li>{@link #scopes} 是工具白名单（比权限更细的一层），空 = 按用户权限。</li>
 * </ul>
 *
 * <p><b>刻意不继承 BaseModel</b>：t_api_token 只有 create_at，没有 update_at / update_by 列，
 * 继承后 {@code MyMetaObjectHandler} 的 updateFill 会拼出「Unknown column 'update_by'」。
 */
@Data
@TableName("t_api_token")
public class ApiToken {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	/** 按哪个用户签发；MCP 调用的权限就是它的权限 */
	private String userId;

	/** 给用户辨认用：如 Claude / 我的脚本 */
	private String name;

	/** SHA-256 十六进制小写，唯一键；明文不落库 */
	private String tokenHash;

	/** 逗号分隔的工具白名单；空 = 按用户权限 */
	private String scopes;

	/** 过期时间；空 = 永不过期 */
	private Date expiresAt;

	/** 最近一次被 /mcp 用到的时刻：排障时用它判断「这个令牌还有人用吗」 */
	private Date lastUsedAt;

	/** 撤销标记：true 之后立刻 401，记录保留（便于追溯是谁什么时候发过令牌） */
	private Boolean revoked;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
