package cn.surveyking.server.api;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/** 将下载镜像模板解析为按优先级排列的候选地址。 */
final class UpdateMirrorResolver {

	static final String DEFAULT_MIRRORS = "https://ghfast.top/{url},https://gh-proxy.com/{url},https://ghproxy.net/{url}";

	private UpdateMirrorResolver() {
	}

	static List<String> assetUrls(String assetUrl, String version, String file, String mirrorSpec, String legacyProxy) {
		if (assetUrl == null || assetUrl.isBlank()) {
			return List.of();
		}
		LinkedHashSet<String> result = new LinkedHashSet<>();
		if (!isGithub(assetUrl)) {
			result.add(assetUrl);
			return new ArrayList<>(result);
		}
		for (String template : templates(mirrorSpec, legacyProxy)) {
			result.add(apply(template, assetUrl, version, file));
		}
		result.add(assetUrl);
		return new ArrayList<>(result);
	}

	static List<String> manifestUrls(String manifestUrl, String mirrorSpec, String legacyProxy) {
		if (manifestUrl == null || manifestUrl.isBlank() || !isGithub(manifestUrl)) {
			return manifestUrl == null || manifestUrl.isBlank() ? List.of() : List.of(manifestUrl);
		}
		LinkedHashSet<String> result = new LinkedHashSet<>();
		for (String template : templates(mirrorSpec, legacyProxy)) {
			if (template.contains("{url}")) {
				result.add(apply(template, manifestUrl, "", "update.json"));
			}
		}
		result.add(manifestUrl);
		return new ArrayList<>(result);
	}

	static String label(String url) {
		if (url == null || url.isBlank()) {
			return "未知线路";
		}
		if (isGithub(url)) {
			return "GitHub 直连";
		}
		try {
			String host = URI.create(url).getHost();
			return host == null || host.isBlank() ? "镜像" : host;
		}
		catch (Exception ignored) {
			return "镜像";
		}
	}

	private static List<String> templates(String mirrorSpec, String legacyProxy) {
		if (mirrorSpec != null && ("none".equalsIgnoreCase(mirrorSpec.trim())
				|| "direct".equalsIgnoreCase(mirrorSpec.trim()) || "off".equalsIgnoreCase(mirrorSpec.trim()))) {
			return List.of();
		}
		String value = mirrorSpec == null || mirrorSpec.isBlank() ? DEFAULT_MIRRORS : mirrorSpec;
		if (legacyProxy != null && !legacyProxy.isBlank()) {
			value = legacyProxy.trim() + "," + value;
		}
		LinkedHashSet<String> result = new LinkedHashSet<>();
		for (String raw : value.split("[,;\\s]+")) {
			String template = raw.trim();
			if (template.isEmpty()) {
				continue;
			}
			if (!template.startsWith("https://")) {
				continue;
			}
			if (!template.contains("{url}") && !template.contains("{version}") && !template.contains("{file}")) {
				template = template.endsWith("/") ? template + "{url}" : template + "/{url}";
			}
			result.add(template);
		}
		return new ArrayList<>(result);
	}

	private static String apply(String template, String url, String version, String file) {
		String safeFile = file == null ? "" : URLEncoder.encode(file, StandardCharsets.UTF_8).replace("+", "%20");
		return template.replace("{url}", url)
				.replace("{version}", version == null ? "" : version)
				.replace("{file}", safeFile);
	}

	private static boolean isGithub(String url) {
		return url != null && url.startsWith("https://github.com/");
	}
}
