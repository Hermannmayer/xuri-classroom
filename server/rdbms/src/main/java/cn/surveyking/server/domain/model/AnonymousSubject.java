package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * 匿名答题主体：一行 = 一个浏览器匿名身份。
 *
 * <p>cookie 里只放随机 token，库里只存 SHA-256；过期后由 {@code purgeExpired()} 清理。
 * 不继承 BaseModel：这张表只需要创建/最近访问/过期三个时间，不需要逻辑删除与更新人。
 *
 * @author surveyking
 */
@Data
@TableName("t_anonymous_subject")
public class AnonymousSubject {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;

	/** SHA-256(token) 的十六进制；不存明文 token */
	private String tokenHash;

	private Date createAt;

	private Date lastSeenAt;

	private Date expiresAt;

}
