package cn.surveyking.server.schema;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

/**
 * 数据库结构契约（classpath:db/schema.json）。
 *
 * <p>
 * 每个版本声明"必须存在哪些对象"，应用启动时据此判断库已经走到哪一步。
 * 用结构探测而不是"迁移记录表"的原因：存量库没有版本记录，记账表必须先 baseline，
 * 而 baseline 对"结构其实落后"的库是致命的（会静默跳过该跑的迁移）。
 * </p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SchemaSpec {

	/** 库必须至少拥有的对象；缺失说明还没初始化，直接拒绝启动。 */
	private Baseline baseline = new Baseline();

	/** 按版本升序排列。 */
	private List<VersionSpec> versions = new ArrayList<>();

	@Data
	@JsonIgnoreProperties(ignoreUnknown = true)
	public static class Baseline {

		private List<String> requires = new ArrayList<>();

	}

	@Data
	@JsonIgnoreProperties(ignoreUnknown = true)
	public static class VersionSpec {

		private String version;

		private List<String> requires = new ArrayList<>();

	}

}
