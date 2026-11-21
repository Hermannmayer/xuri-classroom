package cn.surveyking.server.schema;





public class SchemaUpgradeException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public SchemaUpgradeException(String message) {
		super(message);
	}

	public SchemaUpgradeException(String message, Throwable cause) {
		super(message, cause);
	}

}
