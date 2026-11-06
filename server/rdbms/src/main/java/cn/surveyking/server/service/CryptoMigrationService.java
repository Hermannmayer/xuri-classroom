package cn.surveyking.server.service;

import cn.surveyking.server.core.uitls.CryptoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 题库字段加密的存量迁移。
 *
 * <p>TypeHandler 负责后续实体读写；迁移阶段用 JDBC 直接处理原始 JSON 字符串，
 * 因为 MyBatis 的逻辑删除过滤会漏掉已删除题目/项目，而这些数据同样会留在 mysqldump 中。
 * 幂等：以 ENC1: 前缀跳过已加密字段。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CryptoMigrationService {

	private static final int BATCH = 300;

	private final JdbcTemplate jdbcTemplate;

	/** 加密是否可用 + 所有物理行中仍有多少非空明文字段 */
	public Map<String, Object> status() {
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("enabled", CryptoUtils.enabled());
		result.put("templatesTotal", count("t_template"));
		result.put("templatesPlain", countPlain("t_template", "template"));
		result.put("projectsTotal", count("t_project"));
		result.put("projectsPlain", countPlain("t_project", "survey"));
		result.put("answerSnapshotsTotal", count("t_answer"));
		result.put("answerSnapshotsPlain", countPlain("t_answer", "survey"));
		result.put("keyConfigured", CryptoUtils.keyPresent());
		return result;
	}

	private long count(String table) {
		return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
	}

	private long countPlain(String table, String column) {
		String sql = "SELECT COUNT(*) FROM " + table + " WHERE " + column
				+ " IS NOT NULL AND " + column + " <> '' AND " + column + " NOT LIKE ?";
		Long count = jdbcTemplate.queryForObject(sql, Long.class, CryptoUtils.PREFIX + "%");
		return count == null ? 0 : count;
	}

	/** 把所有物理行里的明文题目与整卷快照重新写一遍，使其变成密文。 */
	@Transactional(rollbackFor = Exception.class)
	public Map<String, Object> encryptAll() {
		if (!CryptoUtils.enabled()) {
			throw new IllegalStateException("未配置 SK_CRYPTO_KEY，无法加密；请先设置 32 字节 Base64 密钥并重启服务");
		}
		int templates = encryptColumn("t_template", "template");
		int projects = encryptColumn("t_project", "survey");
		int answerSnapshots = encryptColumn("t_answer", "survey");
		log.info("crypto migration done: templates={}, projects={}, answerSnapshots={}", templates, projects,
				answerSnapshots);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("templates", templates);
		result.put("projects", projects);
		result.put("answerSnapshots", answerSnapshots);
		result.put("remainingTemplatesPlain", countPlain("t_template", "template"));
		result.put("remainingProjectsPlain", countPlain("t_project", "survey"));
		result.put("remainingAnswerSnapshotsPlain", countPlain("t_answer", "survey"));
		return result;
	}

	/** 生成或取回**当前真正生效**的密钥，供前端下载备份 */
	public Map<String, Object> generateKey() {
		String existing = CryptoUtils.currentKeyBase64();
		boolean reused = existing != null;
		String key = reused ? existing : CryptoUtils.generateAndActivate();
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("key", key);
		result.put("reused", reused);
		result.put("fileName", "surveyking-crypto-key.txt");
		result.put("notice",
				reused
						? "这是当前正在使用的密钥（已存在），请备份。它不会写入数据库；一旦丢失，已加密的题库将永久无法解密。"
						: "已生成新密钥并写入服务器 crypto.key，请立即下载备份。它不会写入数据库；一旦丢失，已加密的题库将永久无法解密。");
		return result;
	}

	/** 把所有物理行里的密文还原成明文，用于关闭加密。 */
	@Transactional(rollbackFor = Exception.class)
	public Map<String, Object> decryptAll() {
		int templates = decryptColumn("t_template", "template");
		int projects = decryptColumn("t_project", "survey");
		int answerSnapshots = decryptColumn("t_answer", "survey");
		log.info("crypto decrypt done: templates={}, projects={}, answerSnapshots={}", templates, projects,
				answerSnapshots);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("templates", templates);
		result.put("projects", projects);
		result.put("answerSnapshots", answerSnapshots);
		result.put("remainingTemplatesEncrypted", countCipher("t_template", "template"));
		result.put("remainingProjectsEncrypted", countCipher("t_project", "survey"));
		result.put("remainingAnswerSnapshotsEncrypted", countCipher("t_answer", "survey"));
		return result;
	}

	private long countCipher(String table, String column) {
		String sql = "SELECT COUNT(*) FROM " + table + " WHERE " + column + " LIKE ?";
		Long count = jdbcTemplate.queryForObject(sql, Long.class, CryptoUtils.PREFIX + "%");
		return count == null ? 0 : count;
	}

	private int decryptColumn(String table, String column) {
		String select = "SELECT id, " + column + " FROM " + table + " WHERE " + column
				+ " LIKE ? ORDER BY id LIMIT " + BATCH;
		String update = "UPDATE " + table + " SET " + column + " = ? WHERE id = ?";
		int done = 0;
		while (true) {
			List<Map<String, Object>> rows = jdbcTemplate.queryForList(select, CryptoUtils.PREFIX + "%");
			if (rows.isEmpty()) {
				return done;
			}
			List<Object[]> batch = new ArrayList<>(rows.size());
			for (Map<String, Object> row : rows) {
				Object raw = row.get(column);
				if (!(raw instanceof String) || ((String) raw).isEmpty()) {
					continue;
				}
				batch.add(new Object[] { CryptoUtils.decryptIfNeeded((String) raw), row.get("id") });
			}
			if (batch.isEmpty()) {
				return done;
			}
			jdbcTemplate.batchUpdate(update, batch);
			done += batch.size();
		}
	}

	private int encryptColumn(String table, String column) {
		String select = "SELECT id, " + column + " FROM " + table + " WHERE " + column
				+ " IS NOT NULL AND " + column + " <> '' AND " + column + " NOT LIKE ? ORDER BY id LIMIT " + BATCH;
		String update = "UPDATE " + table + " SET " + column + " = ? WHERE id = ?";
		int done = 0;
		while (true) {
			List<Map<String, Object>> rows = jdbcTemplate.queryForList(select, CryptoUtils.PREFIX + "%");
			if (rows.isEmpty()) {
				return done;
			}
			List<Object[]> batch = new ArrayList<>(rows.size());
			for (Map<String, Object> row : rows) {
				Object raw = row.get(column);
				if (!(raw instanceof String) || ((String) raw).isEmpty()) {
					continue;
				}
				batch.add(new Object[] { CryptoUtils.encryptIfNeeded((String) raw), row.get("id") });
			}
			if (batch.isEmpty()) {
				return done;
			}
			jdbcTemplate.batchUpdate(update, batch);
			done += batch.size();
		}
	}

}
