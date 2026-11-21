package cn.surveyking.server.core.tenant;
















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