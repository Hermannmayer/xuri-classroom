package cn.surveyking.server.schema;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Data;

/**
 * 一次结构检查/升级的结果，也给 /api/system 用。
 */
@Data
public class SchemaUpgradeResult {

	public enum Status {

		/** 结构与程序版本一致，没动数据库 */
		OK,
		/** 库结构落后，已执行迁移 */
		UPGRADED,
		/** 库结构比程序还新（程序被回滚过），只告警不降级 */
		AHEAD,
		/** 显式关闭了自动升级 */
		DISABLED

	}

	private String appVersion;

	private String dbVersion;

	private Status status;

	private List<String> appliedScripts = new ArrayList<>();

	private String message;

	public static SchemaUpgradeResult of(String appVersion, String dbVersion, Status status, String message) {
		SchemaUpgradeResult result = new SchemaUpgradeResult();
		result.setAppVersion(appVersion);
		result.setDbVersion(dbVersion);
		result.setStatus(status);
		result.setMessage(message);
		return result;
	}

	public List<String> appliedScriptsView() {
		return appliedScripts == null ? Collections.emptyList() : Collections.unmodifiableList(appliedScripts);
	}

}
