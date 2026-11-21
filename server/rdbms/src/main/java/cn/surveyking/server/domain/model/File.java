package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;





@Data
@TableName(value = "t_file", autoResultMap = true)
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
public class File extends BaseModel {




	private String originalName;




	private String fileName;




	private String filePath;




	private String thumbFilePath;




	private Integer storageType;




	private Integer shared;


	private String projectId;


	private String questionId;


	private String answerId;


	private Long fileSize;

}
