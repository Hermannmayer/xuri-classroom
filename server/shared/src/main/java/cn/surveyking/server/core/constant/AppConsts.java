package cn.surveyking.server.core.constant;





public class AppConsts {




	public static final String TOKEN_NAME = "sk-token";




	public static final String COOKIE_LIMIT_NAME = "sk-limit";




	public static final String COOKIE_RANDOM_PROJECT_PREFIX = "rd_answer_id_";


	public static final String COOKIE_PWD_PREFIX = "sk_pwd_";





	public static final String COOKIE_RESULT_PREFIX = "rd_result_";




	public static final String[] SUPPORT_IMAGE_TYPE = { "JPG", "JPEG", "PNG", "GIF", "BMP", "WBMP" };




	public static final String COLUMN_IS_DELETED = "is_deleted";

	public static final String ROLE_ADMIN = "ROLE_admin";




	public static final String ANONYMOUS_USER_ID = "guest";




	public static final String VARIABLE_CURRENT_ORG_ID = "currentOrgId";




	public static final String VARIABLE_PARENT_ORG_ID = "parentOrgId";




	public static final Integer PROJECT_STATUS_RUNNING = 1;




	public static final Integer PROJECT_STATUS_SUSPEND = 0;




	public static final String PUBLIC_QUERY_PASSWORD_FIELD_ID = "password";




	public interface FileType {


		int BACKGROUND_IMAGE = 1;


		int HEADER_IMAGE = 2;


		int QUESTION_IMAGE = 3;


		int ANSWER_ATTACHMENT = 4;


		int TEMPLATE_PREVIEW_IMAGE = 5;


		int BARCODE = 6;

	}




	public enum DICTCODE_PERMISSION_TYPE {

		MENU, OPERATION, OTHER

	}




	public enum RESOURCE_PERMISSION_DISPLAY_TYPE {

		MODULE, MENU, PERMISSION

	}

	public enum AUTH_TYPE {

		PWD, GOOGLE, WECHAT

	}

	public enum USER_TYPE {


		SysUser

	}

	public interface USER_STATUS {


		int VALID = 1;


		int INVALID = 0;

	}




	public enum DataPermissionTypeEnum {


		SELF, SELF_AND_SUB, DEPT, DEPT_AND_SUB, ALL;

	}




	public enum DispositionTypeEnum {




		inline,



		attachment

	}




	public interface DashboardType {


		int HOMEPAGE = 1;


		int PROJECT_OVERVIEW = 2;

	}

	public interface PermType {

		String PROJECT = "project";

	}




	public interface ProjectPartnerStatus {




		int UNVISITED = 0;




		int VISITED = 1;




		int ANSWERED = 2;

		static String getStatusStr(int status) {
			if (status == VISITED) {
				return "已访问";
			}
			else if (status == ANSWERED) {
				return "已答题";
			}
			else {
				return "未访问";
			}
		}

	}

}
