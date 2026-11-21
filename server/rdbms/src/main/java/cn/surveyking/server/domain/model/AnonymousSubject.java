package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;









@Data
@TableName("t_anonymous_subject")
public class AnonymousSubject {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;


	private String tokenHash;

	private Date createAt;

	private Date lastSeenAt;

	private Date expiresAt;

}
