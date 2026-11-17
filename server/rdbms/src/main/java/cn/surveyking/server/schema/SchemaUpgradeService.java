package cn.surveyking.server.schema;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Service;

import tools.jackson.databind.ObjectMapper;

import cn.surveyking.server.schema.SchemaUpgradeResult.Status;
import lombok.extern.slf4j.Slf4j;

/**
 * 数据库结构自动升级。
 *
 * <p>
 * 每次启动做三件事：
 * </p>
 * <ol>
 * <li>用 {@link SchemaProbe} 读出库里实际有哪些表/列/索引；</li>
 * <li>对照 db/schema.json 从高到低匹配，判断库走到了哪个版本；</li>
 * <li>如果库版本低于程序版本，按版本升序执行 db/migration/V版本__*.sql。</li>
 * </ol>
 *
 * <p>
 * 关键取舍：<b>不记录"哪些迁移跑过"来决定跳过</b>，而是每次都按结构判断。
 * 因为存量库（含学校现网）没有版本记录，任何"记账表 + baseline"方案都会在
 * "结构其实落后、但记账表说有"的库上静默漏迁。结构探测没有这个盲区。
 * </p>
 *
 * <p>
 * 迁移脚本必须幂等（重复执行不报错、不改坏数据）。t_schema_version 只用于
 * 可观测性（排查时知道哪次启动动过库），不参与判断。
 * </p>
 */
@Slf4j
@Service
public class SchemaUpgradeService {

	private static final Pattern SCRIPT_NAME = Pattern.compile("^V(\\d+\\.\\d+\\.\\d+)__(.+)\\.sql$");

	private static final String CREATE_VERSION_TABLE = "CREATE TABLE IF NOT EXISTS t_schema_version ("
			+ "version varchar(32) NOT NULL COMMENT '库结构版本',"
			+ "applied_at datetime NOT NULL COMMENT '记录时间',"
			+ "source varchar(256) DEFAULT NULL COMMENT '执行来源（迁移文件名）',"
			+ "PRIMARY KEY (version)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

	private final DataSource dataSource;

	private final ObjectMapper objectMapper;

	@Value("${version:unknown}")
	private String appVersion;

	@Value("${sk.schema.auto-upgrade:true}")
	private boolean enabled;

	private volatile SchemaUpgradeResult lastResult;

	public SchemaUpgradeService(DataSource dataSource, ObjectMapper objectMapper) {
		this.dataSource = dataSource;
		this.objectMapper = objectMapper;
	}

	/**
	 * 检查并升级结构。幂等：没有待执行的迁移就什么都不做。
	 * @return 本次结果（也缓存给 /api/system）
	 */
	public synchronized SchemaUpgradeResult ensureUpToDate() {
		if (!enabled) {
			SchemaUpgradeResult result = SchemaUpgradeResult.of(appVersion, null, Status.DISABLED,
					"已通过 sk.schema.auto-upgrade=false 关闭自动升级");
			lastResult = result;
			return result;
		}
		SchemaSpec spec = loadSpec();
		Set<String> snapshot;
		try {
			snapshot = new SchemaProbe(dataSource).snapshot();
		}
		catch (SQLException e) {
			throw new SchemaUpgradeException("读取数据库结构失败：" + e.getMessage(), e);
		}
		assertBaseline(spec, snapshot);
		String dbVersion = detectVersion(spec, snapshot);
		log.info("[schema] 程序版本 {}，数据库结构版本 {}", appVersion, dbVersion);
		// fail-fast：迁移脚本比程序新、且库也还没升 → 这些脚本会被静默跳过，必然缺结构。
		// 放在 AHEAD 判定之前：回滚场景（库比程序新）由 assertNoFutureScripts 内部的 dbVersion 条件放行。
		assertNoFutureScripts(appVersion, dbVersion);

		if (compare(dbVersion, appVersion) > 0) {
			String message = "数据库结构版本 " + dbVersion + " 高于程序版本 " + appVersion
					+ "（通常是回滚过程序）。不会降级结构，继续启动；如遇功能异常请一并回滚数据库备份。";
			log.warn("[schema] {}", message);
			SchemaUpgradeResult result = SchemaUpgradeResult.of(appVersion, dbVersion, Status.AHEAD, message);
			lastResult = result;
			return result;
		}

		List<MigrationScript> pending = pendingScripts(dbVersion, appVersion);
		if (pending.isEmpty()) {
			SchemaUpgradeResult result = SchemaUpgradeResult.of(appVersion, dbVersion, Status.OK,
					"数据库结构已是最新，无需迁移");
			lastResult = result;
			return result;
		}

		StringBuilder names = new StringBuilder();
		for (MigrationScript script : pending) {
			if (names.length() > 0) {
				names.append(", ");
			}
			names.append(script.name);
		}
		log.info("[schema] 需要执行 {} 个迁移脚本：{}", pending.size(), names);

		SchemaUpgradeResult result = SchemaUpgradeResult.of(appVersion, appVersion, Status.UPGRADED,
				"已执行 " + pending.size() + " 个迁移脚本");
		for (MigrationScript script : pending) {
			execute(script);
			result.getAppliedScripts().add(script.name);
			recordVersion(script.version, script.name);
		}
		lastResult = result;
		log.info("[schema] 结构升级完成：{} → {}", dbVersion, appVersion);
		return result;
	}

	public SchemaUpgradeResult getLastResult() {
		return lastResult;
	}

	// ------ 内部实现

	SchemaSpec loadSpec() {
		ClassPathResource resource = new ClassPathResource("db/schema.json");
		if (!resource.exists()) {
			throw new SchemaUpgradeException("找不到结构契约 db/schema.json，jar 不完整。");
		}
		try (InputStream input = resource.getInputStream()) {
			return objectMapper.readValue(input, SchemaSpec.class);
		}
		catch (IOException e) {
			throw new SchemaUpgradeException("解析 db/schema.json 失败：" + e.getMessage(), e);
		}
	}

	void assertBaseline(SchemaSpec spec, Set<String> snapshot) {
		snapshot = normalizeAll(snapshot);
		List<String> missing = new ArrayList<>();
		if (spec.getBaseline() != null && spec.getBaseline().getRequires() != null) {
			for (String require : spec.getBaseline().getRequires()) {
				if (!snapshot.contains(require.toLowerCase(Locale.ROOT))) {
					missing.add(require);
				}
			}
		}
		if (!missing.isEmpty()) {
			throw new SchemaUpgradeException("数据库还没有初始化（缺少 " + String.join(", ", missing)
					+ "）。请先用 init-mysql.sql 建库，或使用安装器/发布包完成首次安装；"
					+ "如果是连错了库，请检查 SPRING_DATASOURCE_URL / DB_NAME。");
		}
	}

	String detectVersion(SchemaSpec spec, Set<String> snapshot) {
		snapshot = normalizeAll(snapshot);
		List<SchemaSpec.VersionSpec> versions = new ArrayList<>(spec.getVersions());
		versions.sort(Comparator.comparing(SchemaSpec.VersionSpec::getVersion, SchemaUpgradeService::compare));
		for (int i = versions.size() - 1; i >= 0; i--) {
			SchemaSpec.VersionSpec candidate = versions.get(i);
			boolean matched = true;
			for (String require : candidate.getRequires()) {
				if (!snapshot.contains(require.toLowerCase(Locale.ROOT))) {
					matched = false;
					break;
				}
			}
			if (matched) {
				return candidate.getVersion();
			}
		}
		throw new SchemaUpgradeException("无法识别数据库结构版本：db/schema.json 里没有任何版本能匹配当前库。"
				+ "可能是库被手工改过，或程序与数据库不是同一套发布。请先备份数据库，再联系维护人员。");
	}

	/** 加载 classpath 下所有命名合规的迁移脚本（不按版本过滤）。 */
	List<MigrationScript> loadAllScripts() {
		List<MigrationScript> scripts = new ArrayList<>();
		Resource[] resources;
		try {
			resources = new PathMatchingResourcePatternResolver().getResources("classpath*:db/migration/*.sql");
		}
		catch (IOException e) {
			throw new SchemaUpgradeException("扫描 db/migration 失败：" + e.getMessage(), e);
		}
		for (Resource resource : resources) {
			String name = resource.getFilename();
			if (name == null) {
				continue;
			}
			Matcher matcher = SCRIPT_NAME.matcher(name);
			if (!matcher.matches()) {
				log.warn("[schema] 忽略命名不合规的迁移脚本：{}（应为 V主.次.修订__描述.sql）", name);
				continue;
			}
			scripts.add(new MigrationScript(matcher.group(1), name, resource));
		}
		scripts.sort(Comparator.comparing(s -> s.version, SchemaUpgradeService::compare));
		return scripts;
	}

	List<MigrationScript> pendingScripts(String dbVersion, String appVersion) {
		List<MigrationScript> scripts = new ArrayList<>();
		for (MigrationScript script : loadAllScripts()) {
			if (compare(script.version, dbVersion) > 0 && compare(script.version, appVersion) <= 0) {
				scripts.add(script);
			}
		}
		return scripts;
	}

	/**
	 * 拒绝启动：存在「比程序新、且数据库也还没到」的迁移脚本。
	 *
	 * <p>典型事故（2026-11-17）：加了 {@code V2.2.1__*.sql} 却忘了改仓库根 {@code VERSION}。
	 * {@link #pendingScripts} 的过滤条件是「脚本版本 ≤ 程序版本」，于是这批脚本被**静默丢弃**，
	 * 数据库缺列；而实体已经带上新字段，MyBatis 的 SELECT 直接报 Unknown column，
	 * 表现为答卷列表/成绩单/批改大面积 500 —— 比启动失败难排查得多。
	 *
	 * <p>判定条件刻意带上 {@code dbVersion}：**只拦「库也还没到这个版本」的情况**。
	 * 程序回滚时（库结构已经比程序新）不该拦，否则回滚就起不来了——
	 * 迁移只加不删，旧程序读新结构是安全的。
	 * @param appVersion 当前程序版本（仓库根 VERSION）
	 * @param dbVersion 当前数据库结构版本
	 */
	void assertNoFutureScripts(String appVersion, String dbVersion) {
		List<String> newer = new ArrayList<>();
		for (MigrationScript script : loadAllScripts()) {
			boolean newerThanApp = compare(script.version, appVersion) > 0;
			boolean newerThanDb = compare(script.version, dbVersion) > 0;
			if (newerThanApp && newerThanDb) {
				newer.add(script.name);
			}
		}
		if (!newer.isEmpty()) {
			throw new SchemaUpgradeException("发现版本高于当前程序的迁移脚本：" + String.join("、", newer)
					+ "。当前程序版本（仓库根 VERSION 文件）是 " + appVersion + "，数据库结构版本是 " + dbVersion
					+ "。继续启动会让这些脚本被静默跳过，运行时报列/表不存在。"
					+ "处理办法：把 VERSION 升到这些脚本的最高版本，重新构建并发布。");
		}
	}

	void execute(MigrationScript script) {
		log.info("[schema] 执行迁移 {}", script.name);
		try (Connection connection = dataSource.getConnection()) {
			ScriptUtils.executeSqlScript(connection, new EncodedResource(script.resource, StandardCharsets.UTF_8));
		}
		catch (SQLException | RuntimeException e) {
			throw new SchemaUpgradeException("迁移脚本 " + script.name + " 执行失败：" + e.getMessage()
					+ "；处理建议：先备份数据库，修好脚本或手工补齐结构后重启即可（脚本是幂等的，可重复执行）。", e);
		}
	}

	void recordVersion(String version, String source) {
		try (Connection connection = dataSource.getConnection()) {
			try (Statement statement = connection.createStatement()) {
				statement.execute(CREATE_VERSION_TABLE);
			}
			try (PreparedStatement ps = connection.prepareStatement(
					"INSERT INTO t_schema_version (version, applied_at, source) VALUES (?, NOW(), ?) "
							+ "ON DUPLICATE KEY UPDATE applied_at = VALUES(applied_at), source = VALUES(source)")) {
				ps.setString(1, version);
				ps.setString(2, source);
				ps.executeUpdate();
			}
		}
		catch (SQLException e) {
			// 记账失败不影响升级结果（结构已经对了），只告警
			log.warn("[schema] 写入 t_schema_version 失败（不影响升级）：{}", e.getMessage());
		}
	}

	/**
	 * 语义化版本比较：只比较 主.次.修订 的数字段，缺省按 0。
	 */
	public static int compare(String left, String right) {
		int[] a = parse(left);
		int[] b = parse(right);
		for (int i = 0; i < 3; i++) {
			if (a[i] != b[i]) {
				return Integer.compare(a[i], b[i]);
			}
		}
		return 0;
	}

	/** 探针产出的键已经是小写；这里再兜一层，避免调用方传入大小写混杂的集合。 */
	private static Set<String> normalizeAll(Set<String> snapshot) {
		Set<String> normalized = new java.util.HashSet<>();
		for (String key : snapshot) {
			if (key != null) {
				normalized.add(key.toLowerCase(Locale.ROOT));
			}
		}
		return normalized;
	}

	private static int[] parse(String version) {
		int[] parts = new int[3];
		if (version == null) {
			return parts;
		}
		String cleaned = version.trim().replaceFirst("^[vV]", "");
		String[] split = cleaned.split("\\.");
		for (int i = 0; i < 3 && i < split.length; i++) {
			try {
				parts[i] = Integer.parseInt(split[i]);
			}
			catch (NumberFormatException e) {
				parts[i] = 0;
			}
		}
		return parts;
	}

	static final class MigrationScript {

		final String version;

		final String name;

		final Resource resource;

		MigrationScript(String version, String name, Resource resource) {
			this.version = version;
			this.name = name;
			this.resource = resource;
		}

	}

}
