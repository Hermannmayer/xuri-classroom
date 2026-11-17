<!-- 由 npm run docs:gen 生成；不要手改。来源：server/rdbms/src/main/resources/scripts/init-mysql.sql + server/rdbms/src/main/resources/db/migration/*.sql -->

# 数据库结构（生成）

> 表结构来自初始化 SQL；增量迁移在 `db/migration`，应用启动时按需自动执行（幂等）。

> 改结构三步：更新 `init-mysql.sql` + 新增 `db/migration/V<版本>__*.sql` + 在 `db/schema.json` 登记本版本要求。

## 表

| 表 | 列（名称:类型，节选） |
|---|---|
| `t_account` | id:varchar(64)<br>user_type:varchar(100)<br>user_id:varchar(64)<br>auth_type:varchar(20)<br>auth_account:varchar(100)<br>auth_secret:varchar(64)<br>secret_salt:varchar(32)<br>status:int<br>is_deleted:tinyint(1)<br>oauth_identity_key:varchar(220)<br>create_at:timestamp<br>create_by:varchar(256) |
| `t_answer` | id:varchar(64)<br>project_id:varchar(64)<br>temp_answer:text<br>survey:longtext<br>answer:text<br>attachment:varchar(1024)<br>meta_info:text<br>temp_save:int<br>exam_info:text<br>exam_exercise_type:varchar(4)<br>exam_score:float<br>is_deleted:tinyint(1) |
| `t_anonymous_subject` | id:varchar(64)<br>token_hash:varchar(128)<br>create_at:timestamp<br>last_seen_at:timestamp<br>expires_at:timestamp |
| `t_answer_item` | id:varchar(64)<br>answer_id:varchar(64)<br>project_id:varchar(64)<br>question_id:varchar(64)<br>question_type:varchar(32)<br>option_id:varchar(64)<br>value_json:text<br>value_key:varchar(64)<br>score:double<br>create_at:timestamp |
| `t_answer_grade` | id:varchar(64)<br>answer_id:varchar(64)<br>project_id:varchar(64)<br>question_id:varchar(64)<br>score:double<br>comment:varchar(512)<br>grader:varchar(256)<br>create_at:timestamp<br>update_at:datetime |
| `t_comm_dict` | id:varchar(64)<br>code:varchar(256)<br>name:varchar(256)<br>remark:varchar(256)<br>dict_type:int<br>create_at:datetime<br>create_by:varchar(256)<br>update_at:datetime<br>update_by:varchar(256) |
| `t_comm_dict_item` | id:varchar(64)<br>dict_code:varchar(256)<br>item_name:varchar(256)<br>item_value:varchar(256)<br>item_order:int<br>item_level:int<br>parent_item_value:varchar(64)<br>create_at:datetime<br>create_by:varchar(256)<br>update_at:datetime<br>update_by:varchar(256) |
| `t_dashboard` | id:varchar(64)<br>key:varchar(256)<br>type:int<br>project_id:varchar(64)<br>setting:varchar(1024)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_dept` | id:varchar(64)<br>parent_id:varchar(64)<br>dept_type:varchar(16)<br>class_kind:varchar(16)<br>allow_register:tinyint(1)<br>name:varchar(64)<br>short_name:varchar(64)<br>code:varchar(64)<br>manager_id:varchar(64)<br>valid_from:timestamp<br>valid_to:timestamp<br>sort_code:int |
| `t_class_partner` | id:varchar(64)<br>dept_id:varchar(64)<br>user_id:varchar(64)<br>access_level:tinyint<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_class_resource` | id:varchar(64)<br>class_id:varchar(64)<br>resource_type:varchar(16)<br>resource_id:varchar(64)<br>share_token:varchar(64)<br>status:tinyint<br>start_at:datetime<br>end_at:datetime<br>assigned_by:varchar(64)<br>settings:text<br>is_deleted:tinyint(1)<br>create_at:timestamp |
| `t_file` | id:varchar(64)<br>original_name:varchar(256)<br>file_name:varchar(256)<br>file_path:varchar(512)<br>thumb_file_path:varchar(512)<br>storage_type:int<br>shared:int<br>project_id:varchar(64)<br>question_id:varchar(64)<br>answer_id:varchar(64)<br>file_size:bigint<br>is_deleted:tinyint(1) |
| `t_file_ref` | id:varchar(64)<br>file_id:varchar(64)<br>owner_type:varchar(16)<br>owner_id:varchar(64)<br>question_id:varchar(64)<br>create_at:timestamp |
| `t_position` | id:varchar(64)<br>name:varchar(50)<br>code:varchar(20)<br>is_virtual:tinyint(1)<br>data_permission_type:varchar(256)<br>property_json:varchar(20)<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_project` | id:varchar(64)<br>parent_id:varchar(64)<br>name:text<br>category:varchar(64)<br>survey:longtext<br>setting:text<br>status:int<br>mode:varchar(32)<br>priority:int<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256) |
| `t_project_partner` | id:varchar(64)<br>uid:varchar(64)<br>project_id:varchar(64)<br>type:int<br>status:int<br>user_id:varchar(64)<br>user_name:varchar(256)<br>group_id:varchar(64)<br>data_permission:text<br>access_level:tinyint<br>initial_value:text<br>create_at:timestamp |
| `t_repo` | id:varchar(64)<br>name:varchar(64)<br>description:varchar(512)<br>category:varchar(64)<br>mode:varchar(32)<br>shared:tinyint(1)<br>tag:varchar(512)<br>priority:int<br>setting:text<br>open_start_at:datetime<br>open_end_at:datetime<br>create_at:timestamp |
| `t_repo_category` | id:varchar(64)<br>name:varchar(64)<br>parent_id:varchar(64)<br>path:varchar(255)<br>create_at:timestamp<br>create_by:varchar(256) |
| `t_repo_partner` | id:varchar(64)<br>repo_id:varchar(64)<br>user_id:varchar(64)<br>dept_id:varchar(64)<br>access_level:tinyint<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_repo_template` | id:varchar(64)<br>template_id:varchar(64)<br>repo_id:varchar(64)<br>create_at:timestamp<br>create_by:varchar(256) |
| `t_role` | id:varchar(64)<br>name:varchar(50)<br>code:varchar(50)<br>remark:varchar(100)<br>authority:varchar(3000)<br>status:tinyint(1)<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_sys_info` | id:varchar(64)<br>name:varchar(64)<br>description:varchar(128)<br>avatar:varchar(64)<br>locale:varchar(64)<br>version:varchar(64)<br>setting:varchar(1024)<br>ai_setting:text<br>oauth_setting:text<br>register_info:varchar(1024)<br>is_default:tinyint(1)<br>create_at:timestamp |
| `t_tag` | id:varchar(64)<br>entity_id:varchar(64)<br>name:varchar(128)<br>category:varchar(256)<br>create_at:timestamp<br>create_by:varchar(256) |
| `t_template` | id:varchar(64)<br>repo_id:varchar(64)<br>serial_no:varchar(256)<br>name:varchar(1024)<br>question_type:varchar(64)<br>template:longtext<br>mode:varchar(32)<br>category:varchar(256)<br>tag:varchar(512)<br>chapter:varchar(128)<br>difficulty:varchar(16)<br>priority:int |
| `t_user` | id:varchar(64)<br>name:varchar(50)<br>dept_id:varchar(20)<br>gender:varchar(10)<br>birthday:date<br>phone:varchar(20)<br>email:varchar(50)<br>avatar:varchar(200)<br>status:tinyint(1)<br>user_type:varchar(16)<br>ui_zoom:decimal(4<br>ui_theme:varchar(10) |
| `t_user_book` | id:varchar(64)<br>name:varchar(2048)<br>template_id:varchar(64)<br>wrong_times:int<br>correct_times:int<br>note:text<br>status:int<br>type:int<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_user_dept` | id:varchar(64)<br>user_id:varchar(64)<br>dept_id:varchar(64)<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_user_position` | id:varchar(64)<br>user_id:varchar(64)<br>dept_id:varchar(64)<br>position_id:varchar(64)<br>is_primary_position:tinyint(1)<br>propertyJson:varchar(256)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_user_role` | id:varchar(64)<br>user_type:varchar(100)<br>user_id:varchar(64)<br>role_id:varchar(64)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_audit_log` | id:varchar(64)<br>action:varchar(64)<br>target_id:varchar(64)<br>target_name:varchar(256)<br>detail:varchar(512)<br>ip:varchar(64)<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |
| `t_dept_role` | id:varchar(64)<br>dept_id:varchar(64)<br>role_id:varchar(64)<br>is_deleted:tinyint(1)<br>create_at:timestamp<br>create_by:varchar(256)<br>update_at:timestamp<br>update_by:varchar(256) |

## 迁移脚本（随 jar 自动执行）

- `server/rdbms/src/main/resources/db/migration/V2.1.0__class_open_registration_and_kind.sql`
- `server/rdbms/src/main/resources/db/migration/V2.1.0__template_chapter_difficulty.sql`
- `server/rdbms/src/main/resources/db/migration/V2.1.1__file_ref.sql`
- `server/rdbms/src/main/resources/db/migration/V2.1.2__class_share_token.sql`
- `server/rdbms/src/main/resources/db/migration/V2.2.1__answer_name_and_grading.sql`

## 历史运维脚本（只读，不再维护）

现网从上游 H2 迁到 MySQL 时的一次性脚本保留在 `scripts/nas/migrate/`；新迁移请放 `db/migration`，不要往那里加。
