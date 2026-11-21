package cn.surveyking.server.core.constant;





public enum AnswerFreqEnum {

	only(""),

	hour("0 0 * * * *"),

	day("0 0 0 1-31 * *"),

	week("0 0 0 1-31 1-12 1"),

	month("0 0 0 1 * *"),

	quarter("0 0 0 1 */3 *"),

	year("0 0  0 1 1 *");

	private String cron;

	AnswerFreqEnum(String cron) {
		this.cron = cron;
	}

	public String getCron() {
		return cron;
	}

}
