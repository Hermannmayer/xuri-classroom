package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.util.Date;






@TableName("t_file_ref")
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class FileRef {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	private String fileId;


	private String ownerType;

	private String ownerId;

	private String questionId;

	private Date createAt;

}
