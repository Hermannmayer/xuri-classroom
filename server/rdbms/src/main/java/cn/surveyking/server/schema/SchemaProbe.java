package cn.surveyking.server.schema;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

import javax.sql.DataSource;

import lombok.RequiredArgsConstructor;

/**
 * 结构探针：一次性把库里"有哪些表 / 列 / 索引"读进内存，再用字符串键比对契约。
 *
 * <p>
 * 键格式：{@code table:t_user}、{@code column:t_template.chapter}、{@code index:t_template.idx_template_chapter}。
 * 全部小写比较：MySQL 在 Linux 上表名区分大小写，但契约是人写的，不该被大小写坑到。
 * </p>
 */
@RequiredArgsConstructor
public class SchemaProbe {

	private final DataSource dataSource;

	public Set<String> snapshot() throws SQLException {
		Set<String> keys = new HashSet<>();
		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			try (ResultSet rs = statement.executeQuery(
					"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")) {
				while (rs.next()) {
					keys.add(normalize("table", rs.getString(1), null));
				}
			}
			try (ResultSet rs = statement.executeQuery(
					"SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()")) {
				while (rs.next()) {
					keys.add(normalize("column", rs.getString(1), rs.getString(2)));
				}
			}
			try (ResultSet rs = statement.executeQuery(
					"SELECT DISTINCT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()")) {
				while (rs.next()) {
					keys.add(normalize("index", rs.getString(1), rs.getString(2)));
				}
			}
		}
		return keys;
	}

	public static String normalize(String kind, String table, String detail) {
		StringBuilder sb = new StringBuilder(kind).append(':').append(table.toLowerCase(Locale.ROOT));
		if (detail != null) {
			sb.append('.').append(detail.toLowerCase(Locale.ROOT));
		}
		return sb.toString();
	}

}
