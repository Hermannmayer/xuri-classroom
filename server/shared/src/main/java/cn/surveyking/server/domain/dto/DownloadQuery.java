package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.NotNull;
import java.util.Date;
import java.util.List;





@Data
@EqualsAndHashCode(callSuper = false)
public class DownloadQuery extends PageQuery {




	@NotNull
	private String projectId;




	private String answerId;




	private String nameExp;




	private List<String> ids;

	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date startTime;

	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date endTime;


	private String classId;





	private Integer attemptNo;





	private Boolean includeAnalysis;








	private Boolean includeImages;












	private List<DownloadType> outputs;





	private Boolean includeAnonymous;








	private String gradeStatus;

	private String createByName;

	private Double minScore;

	private Double maxScore;

	@NotNull
	private DownloadType type;




	private String locale;

	public enum DownloadType {




		answer, answerAttachment, attachment,







		answerPdf,





		answerSheetPdf,




		answerImage,




		confirmSheetPdf,







		gradeBookPdf

	}

}
