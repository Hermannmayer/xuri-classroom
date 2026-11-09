package cn.surveyking.server.core.tenant;

/**
 * 租户上下文（当前恒为 {@link #DEFAULT_TENANT}）。
 *
 * <p>
 * 现在按「每校一套部署」运行，所有数据只有一套，所以这里不做任何过滤。
 * 保留它的目的是把「当前租户」这个概念提前放进代码，将来做「一套服务多校」时只需：
 * <ol>
 * <li>在登录成功处 {@link #set(String)}（从子域名/登录参数解析）；</li>
 * <li>请求结束时 {@link #clear()}（用 Filter 的 finally）；</li>
 * <li>业务表加 tenant_id 并挂 MyBatis-Plus 的租户插件。</li>
 * </ol>
 *
 * <p>
 * 现在**不要**拿它去过滤任何查询：库里没有 tenant_id 列，过滤会查不到数据。
 */
public final class TenantContext {

	public static final String DEFAULT_TENANT = "default";

	private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

	private TenantContext() {
	}

	public static String current() {
		String tenant = CURRENT.get();
		return tenant == null || tenant.isEmpty() ? DEFAULT_TENANT : tenant;
	}

	public static void set(String tenantId) {
		if (tenantId == null || tenantId.trim().isEmpty()) {
			CURRENT.remove();
			return;
		}
		CURRENT.set(tenantId.trim());
	}

	public static void clear() {
		CURRENT.remove();
	}

}