package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * 公告已读记录：一行 = 某个人读过某条公告。
 *
 * <p>唯一键 {@code uk_notice_read(notice_id, user_id)} 保证「同一个人同一条公告只有一行」；
 * 并发点开时由数据库兜底，服务层捕获重复键按幂等处理（见 {@code NoticeServiceImpl#insertRead}）。
 *
 * <p>不继承 BaseModel：这张表只有四个列，没有 create_at / is_deleted。
 */
@Data
@TableName("t_notice_read")
public class NoticeRead {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	/** t_notice.id */
	private String noticeId;

	/** t_user.id */
	private String userId;

	/** 首次标记已读的时间 */
	private Date readAt;

}
