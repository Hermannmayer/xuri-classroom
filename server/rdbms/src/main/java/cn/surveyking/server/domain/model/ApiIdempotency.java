package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * MCP 写操作幂等记录（表结构见 db/migration/V2.2.5__api_token.sql）。
 *
 * <p>{@code (user_id, key_value)} 唯一：同一个用户拿同一个幂等键再调一次，直接回放
 * {@link #resultJson}，不会重复建项目 / 重复发布。
 *
 * <p>{@code key_value} 存的是「工具名 + 调用方键」的组合（见 {@code ApiIdempotencyService#composeKey}）：
 * 直接把调用方的键存进去，客户端拿同一个键去调另一个工具就会误命中上一个工具的结果。
 *
 * <p><b>刻意不继承 BaseModel</b>：t_api_idempotency 没有 update_at / update_by 列。
 */
@Data
@TableName("t_api_idempotency")
public class ApiIdempotency {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	private String userId;

	/** 工具名 + 调用方幂等键（超过 128 字符时退化为哈希），唯一键的一半 */
	private String keyValue;

	/** 第一次调用的结果（JSON 文本），重复调用原样返回 */
	private String resultJson;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
