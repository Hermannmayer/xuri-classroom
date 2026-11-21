package cn.surveyking.server.schema;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Data;




@Data
public class SchemaUpgradeResult {

	public enum Status {


		OK,

		UPGRADED,

		AHEAD,

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
