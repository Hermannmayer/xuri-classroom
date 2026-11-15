package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.util.Date;

/**
 * 文件与项目/题库的引用关系。
 *
 * <p>不是逻辑删除表：引用关系删除后可以重新绑定，物理 delete 更简单；文件本身仍走 t_file。
 */
@TableName("t_file_ref")
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
public class FileRef {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	private String fileId;

	/** project 或 repo */
	private String ownerType;

	private String ownerId;

	private String questionId;

	private Date createAt;

}
