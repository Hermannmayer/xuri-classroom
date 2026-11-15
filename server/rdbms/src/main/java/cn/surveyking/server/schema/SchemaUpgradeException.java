package cn.surveyking.server.schema;

/**
 * 结构检查/迁移失败。抛出后应用启动失败（有意的 fail fast）：
 * 带着不匹配的结构跑起来，只会把 500 推迟到用户点开某个页面的时候。
 */
public class SchemaUpgradeException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public SchemaUpgradeException(String message) {
		super(message);
	}

	public SchemaUpgradeException(String message, Throwable cause) {
		super(message, cause);
	}

}
