package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/6
 */
@Data
public class AnswerView {

	private String id;

	private String projectId;

	private LinkedHashMap<String, Object> answer;

	private LinkedHashMap<String, Object> tempAnswer;

	private SurveySchema survey;

	private List<FileView> attachment = new ArrayList<>();

	private List<UserInfo> users;

	private List<DeptView> depts;

	private AnswerMetaInfo metaInfo;

	private Double examScore;

	/**
	 * 考试排名信息
	 */
	private Integer rank;

	/**
	 * 考试信息
	 */
	private AnswerExamInfo examInfo;

	/**
	 * 0 暂存 1 已完成
	 */
	private Integer tempSave;

	/**
	 * 第几次作答（0 开始）。补考场景下同一学员会有多条，班级答卷抽屉据它显示「第 N 次」。
	 */
	private Integer attemptNo;

	private Date createAt;

	private String createByName;

	private String createBy;

	/**
	 * 答题人姓名（交卷时快照）。匿名答卷也可能有；优先于 createByName 用于展示。
	 */
	private String answererName;

	/**
	 * 批改状态：none / pending / graded。管理端据此显示「待批改 N 份」与批改入口。
	 */
	private String gradeStatus;

	/** 最近一次批改人 */
	private String gradedBy;

	/** 最近一次批改时间 */
	private Date gradedAt;

	/**
	 * 这份答卷里是否还有「AI 预批改」的题（t_answer_grade.source='ai'）。
	 * <p>列表据此显示「AI 待复核」标签；老师全部复核并改过分之后会变回 false。
	 */
	private Boolean aiGraded;

	/**
	 * 是否匿名答卷。管理端据此显示「匿名」标识，导出时提交人写「匿名」；
	 * 不暴露 anonymousSubjectId，避免把同一匿名主体的多份答卷关联起来。
	 */
	private Boolean isAnonymous;

	private Date updateAt;

	private String updateBy;

}
