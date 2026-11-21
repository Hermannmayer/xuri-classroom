package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;









@Data
@TableName("t_notice_read")
public class NoticeRead {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;


	private String noticeId;


	private String userId;


	private Date readAt;

}
