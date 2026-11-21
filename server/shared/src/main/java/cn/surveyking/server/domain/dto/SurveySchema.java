package cn.surveyking.server.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.SerializationUtils;

import java.io.Serializable;
import java.util.EnumSet;
import java.util.List;





@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveySchema implements Serializable {

	private String id;

	private String title;

	private String description;

	private QuestionType type;

	@Builder.Default
	private Attribute attribute = new Attribute();

	private List<DataSource> dataSource;

	private List<SurveySchema> children;

	private List<Row> row;

	private List<LinkSurvey> linkSurveys;




	private List<String> tags;




	private String chapter;




	private String difficulty;




	private Integer timeLimitSeconds;

	public enum QuestionType {

		FillBlank, Textarea, MultipleBlank, Signature, Score, Radio, Checkbox, Select, Cascader, Upload, MatrixAuto,



		MatrixRadio, MatrixCheckbox, MatrixFillBlank, MatrixScore, MatrixNps, Survey, QuestionSet,



		RichText,



		Pagination, Remark, SplitLine, Option, User, Dept, Nps, HorzBlank, Address, Barcode, Judge, RandomSurvey;

		// 分为数据类型和空类型
		public static EnumSet<QuestionType> dataType() {
			return EnumSet.of(FillBlank, Textarea, MultipleBlank, Signature, Score, Radio, Checkbox, Select, Cascader,
					Upload, MatrixAuto, MatrixRadio, MatrixCheckbox, MatrixFillBlank, MatrixScore, MatrixNps, User,
					Dept, Nps, HorzBlank, Address, Barcode, RichText, Judge);
		}

		public static EnumSet<QuestionType> voidType() {
			return EnumSet.of(Survey, QuestionSet, Pagination, Remark, SplitLine, Option, RandomSurvey);
		}

		// 考试自动计分支持题型
		public static EnumSet<QuestionType> examType() {
			return EnumSet.of(FillBlank, Textarea, MultipleBlank, Radio, Checkbox, Select, HorzBlank);
		}

	}

	@Data
	public static class Row implements Serializable {

		private String id;

		private String title;

	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class Attribute implements Serializable {




		private String display;

		private Boolean hidden;

		private Integer width;

		private DataType dataType;

		private Boolean required;

		private Boolean defaultChecked;

		private Integer rows;




		private String scope;




		private String scopeDesc;




		private String softScope;

		private String softScopeDesc;

		private Boolean readOnly;

		private String suffix;




		private String textLimit;




		private String answerLimit;

		private Boolean finish;

		private Integer currentPage;

		private Integer totalPage;

		private String submitButton;

		private Integer numericScale;




		private String backgroundImage;




		private String headerImage;




		private String headerTitle;




		private String headerSubtitle;




		private String examHeaderInfo;




		private String fileAccept;




		private Integer maxFileCount;




		private Double maxFileSize;




		private String scoreStyle;




		private String autoSize;




		private Boolean cameraOnly;




		private Integer columns;




		private String content;




		private Boolean mapMove;




		private Boolean statEnabled;




		private String npsStart;




		private String npsEnd;




		private Integer npsStartNum;




		private Integer npsTotalNum;




		private Boolean npsInvertSort;




		private String finishRule;




		private String visibleRule;




		private String requiredRule;




		private String replaceTextRule;




		private String validateRule;




		private String jumpRule;




		private String checkedRule;




		private String calculate;




		private RejectOtherOption rejectOtherOption;




		private Double examScore;




		private ExamScoreMode examAnswerMode;




		private ExamMatchRule examMatchRule;




		private String examCorrectAnswer;




		private String examAnalysis;




		private Boolean richTitle;




		private String dateTimeFormat;




		private Boolean fieldInTitle;




		private String cornerText;




		private Boolean exclusiveFillBlankInMatrix;




		private Integer cascaderLevel;




		private String dictCode;




		private Boolean unique;




		private String uniqueText;




		private List<ExpressionMessage> regexp;




		private Integer quota;




		private String placeholder;




		private List<String> globalRule;




		private SchemaMode mode;




		private List<ProjectSetting.RandomSurveyCondition> randomSurvey;

	}




	public enum DataType {




		text, number, date, dateTime, time, email, mobile, idCard, select, selectDict, chinese, alphabet, horzBlank, password

	}

	public enum ExamMatchRule {




		completeSame,



		contain

	}

	public enum RejectOtherOption {




		rejectAll,



		rejectOther

	}

	public enum ExamScoreMode {




		onlyOne,



		selectAll,



		selectCorrect,



		select,



		manual,



		none

	}

	@Data
	public static class DataSource implements Serializable {

		private String label;

		private String value;

		private List<DataSource> children;

		public DataSource() {
		}

		public DataSource(String label, String value, List<DataSource> children) {
			this.label = label;
			this.value = value;
			this.children = children;
		}

	}




	@Data
	public static class ExpressionMessage implements Serializable {

		private String id;

		private String expression;

		private String message;

	}




	@Data
	public static class LinkSurvey implements Serializable {




		private Boolean enableUpdate;




		private String linkSurveyId;




		private String linkQuestionId;




		private String linkOptionId;




		private LinkType linkType;




		private List<LinkField> linkFields;

	}




	@Data
	public static class LinkField implements Serializable {




		private String linkQuestionId;




		private String linkOptionId;




		private String fillQuestionId;




		private String fillOptionId;

	}




	public enum LinkType {

		eq, like

	}

	public enum SchemaMode {

		exam, survey;

	}

	public SurveySchema deepCopy() {
		return SerializationUtils.clone(this);
	}

}
