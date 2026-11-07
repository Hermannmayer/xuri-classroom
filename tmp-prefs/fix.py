# -*- coding: utf-8 -*-
"""用显式 SQL 读 ui_zoom/ui_theme，绕开实体映射的不确定性。"""
import io


def open_read(p):
    return io.open(p, encoding='utf-8').read()


def save(p, s):
    io.open(p, 'w', encoding='utf-8', newline='').write(s)


# 1) Mapper：显式查两列
p = r'server/rdbms/src/main/java/cn/surveyking/server/mapper/UserMapper.java'
s = open_read(p)
if 'selectUiPrefs' not in s:
    s = s.replace('import org.apache.ibatis.annotations.Select;',
                  'import org.apache.ibatis.annotations.Param;' + chr(10) + 'import org.apache.ibatis.annotations.Select;' + chr(10) + chr(10) + 'import java.util.Map;', 1)
    s = s.replace('	User getUser(String name, String authAccount);',
'''	User getUser(String name, String authAccount);

	/**
	 * 只取界面偏好两列。用显式 SQL 而不是实体属性，避免列类型/映射配置变了之后读回 null。
	 */
	@Select("select ui_zoom as uiZoom, ui_theme as uiTheme from t_user where id = #{id}")
	Map<String, Object> selectUiPrefs(@Param("id") String id);''', 1)
    save(p, s)
    print('mapper ok')

# 2) Service：用查出来的值覆盖
p2 = r'server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java'
t = open_read(p2)
if 'selectUiPrefs' not in t:
    t = t.replace('''		// MapStruct 的 UserInfo 映射没带上这两个字段，这里显式补一次（缩放/主题跟着账号走）
		userInfo.setUiZoom(user.getUiZoom());
		userInfo.setUiTheme(user.getUiTheme());''',
'''		// 界面偏好（缩放 / 主题）用显式 SQL 读，实体映射在不同列类型下不可靠
		java.util.Map<String, Object> prefs = getBaseMapper().selectUiPrefs(userId);
		if (prefs != null) {
			Object zoom = prefs.get("uiZoom");
			Object theme = prefs.get("uiTheme");
			userInfo.setUiZoom(zoom == null ? null : String.valueOf(zoom));
			userInfo.setUiTheme(theme == null ? null : String.valueOf(theme));
		}''', 1)
    save(p2, t)
    print('service ok')
