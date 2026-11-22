// 由 npm run docs:gen 从 docs/guide/*.md 生成；不要手改。
// 文档站与系统帮助中心共用这一份来源。

export type HelpAudience = 'admin' | 'teacher' | 'student';

export interface HelpSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  category: string;
  audience: HelpAudience[];
  keywords: string[];
  permission?: string;
  sections: HelpSection[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    "id": "admin-管理员-用户-角色与权限",
    "title": "管理员：用户、角色与权限",
    "summary": "新建老师/学员、分配角色、控制菜单和操作权限。",
    "category": "管理员指南",
    "audience": [
      "admin"
    ],
    "keywords": [
      "管理员",
      "用户",
      "角色",
      "权限",
      "老师",
      "学员",
      "账号"
    ],
    "permission": "system:user:list",
    "sections": [
      {
        "heading": "用户与角色",
        "paragraphs": [],
        "bullets": [
          "进入「系统管理 → 用户与权限」维护用户、角色和用户组。",
          "新增老师/学员时选择对应角色；权限决定能看到哪些菜单和按钮。",
          "权限变更后让对方退出重登，确保新权限生效。"
        ]
      }
    ]
  },
  {
    "id": "admin-管理员-系统设置-ai-与导出密码",
    "title": "管理员：系统设置、AI 与导出密码",
    "summary": "系统名称、AI 模型、导出密码、存储和版本升级都在系统设置里。",
    "category": "管理员指南",
    "audience": [
      "admin"
    ],
    "keywords": [
      "系统设置",
      "AI",
      "模型",
      "导出密码",
      "存储",
      "升级",
      "备份",
      "版本"
    ],
    "permission": "system:setting:update",
    "sections": [
      {
        "heading": "系统设置",
        "paragraphs": [],
        "bullets": [
          "「系统设置」里可改系统名称、登录页、导出密码、AI 服务商和模型。",
          "AI 模型要在「模型目录 → 能力」里勾选输入类型；需要图片题时勾「图片」。",
          "导出密码开启后，题库/答卷/试卷导出都会要求输入密码。"
        ]
      },
      {
        "heading": "升级与备份",
        "paragraphs": [],
        "bullets": [
          "版本升级请走系统设置里的升级入口，升级前先看版本说明。",
          "数据库和附件备份由运维策略负责；普通管理员不要直接改数据库。"
        ]
      }
    ]
  },
  {
    "id": "admin-管理员-公告发布与归档",
    "title": "管理员：公告发布与归档",
    "summary": "面向全体、老师、学员或班级发通知，并管理已发布公告。",
    "category": "管理员指南",
    "audience": [
      "admin"
    ],
    "keywords": [
      "公告",
      "通知",
      "发布",
      "归档",
      "班级",
      "管理员"
    ],
    "permission": "notice:manage:system",
    "sections": [
      {
        "heading": "发布公告",
        "paragraphs": [],
        "bullets": [
          "进入「系统管理 → 公告管理」新建公告，选择投放范围和有效期。",
          "发布后会出现在对应角色的公告中心；过期后不再展示，数据仍保留。",
          "删除公告前确认不再需要，删除后师生都看不到。"
        ]
      }
    ]
  },
  {
    "id": "admin-管理员-操作日志与问题排查",
    "title": "管理员：操作日志与问题排查",
    "summary": "谁在什么时候改了什么、导出了什么，都可以在操作日志里查。",
    "category": "管理员指南",
    "audience": [
      "admin"
    ],
    "keywords": [
      "日志",
      "审计",
      "排查",
      "导出",
      "谁改的",
      "管理员"
    ],
    "permission": "system:log:list",
    "sections": [
      {
        "heading": "查日志",
        "paragraphs": [],
        "bullets": [
          "进入「系统管理 → 操作日志」，按操作人、动作或时间筛选。",
          "导入、导出、权限变更都会留下记录；排查争议时先看日志再改数据。"
        ]
      }
    ]
  },
  {
    "id": "common-第一次使用-先看这张地图",
    "title": "第一次使用：先看这张地图",
    "summary": "用 1 分钟认识首页、教学、题库、问卷和系统管理分别在哪里。",
    "category": "快速开始",
    "audience": [
      "admin",
      "teacher",
      "student"
    ],
    "keywords": [
      "新手",
      "入口",
      "菜单",
      "首页",
      "地图",
      "怎么用"
    ],
    "sections": [
      {
        "heading": "常用入口",
        "paragraphs": [],
        "bullets": [
          "首页：查看待办、近期考试、公告和快捷入口。",
          "教学：老师管理试卷、班级和学情；学员会在「我的任务」里看到待完成考试。",
          "问卷：创建和查看普通问卷。",
          "题库中心：维护题目、从题库组卷、导入导出题目。",
          "系统管理：管理员维护用户、权限、公告、系统设置和操作日志。"
        ]
      },
      {
        "heading": "右上角工具栏",
        "paragraphs": [],
        "bullets": [
          "「缩放」调整界面大小，适合投影或视力不好的老师。",
          "月亮/太阳图标切换暗色/亮色模式。",
          "问号图标打开帮助中心，可搜索功能说明。",
          "头像菜单可进入账号设置或退出登录。"
        ]
      }
    ]
  },
  {
    "id": "common-登录-账号与界面显示",
    "title": "登录、账号与界面显示",
    "summary": "登录失败、修改密码、缩放界面、切换主题时看这里。",
    "category": "账号与界面",
    "audience": [
      "admin",
      "teacher",
      "student"
    ],
    "keywords": [
      "登录",
      "密码",
      "账号",
      "缩放",
      "暗色",
      "主题",
      "头像",
      "退出"
    ],
    "sections": [
      {
        "heading": "登录",
        "paragraphs": [],
        "bullets": [
          "使用管理员或老师分配的账号登录；忘记密码请联系管理员重置。",
          "登录页提示“账号或密码错误”时，先确认大小写和输入法，不要连续多次尝试。"
        ]
      },
      {
        "heading": "界面缩放与主题",
        "paragraphs": [],
        "bullets": [
          "右上角 90% / 100% / 115% / 130% 可直接切换，设置会跟随账号保存。",
          "暗色模式适合夜间使用；切换后刷新页面仍会保留。"
        ]
      }
    ]
  },
  {
    "id": "common-公告中心-系统通知在哪里看",
    "title": "公告中心：系统通知在哪里看",
    "summary": "版本更新、考试安排和校内通知都会出现在右上角公告铃铛里。",
    "category": "公告与通知",
    "audience": [
      "admin",
      "teacher",
      "student"
    ],
    "keywords": [
      "公告",
      "通知",
      "铃铛",
      "未读",
      "更新",
      "版本"
    ],
    "sections": [
      {
        "heading": "查看公告",
        "paragraphs": [],
        "bullets": [
          "点击右上角铃铛打开公告中心，未读数量会显示在图标上。",
          "公告可能按全体、老师、学员或班级投放；看不到某条公告时先确认自己的角色和班级。"
        ]
      }
    ]
  },
  {
    "id": "common-常见问题-图片-手机显示和导出",
    "title": "常见问题：图片、手机显示和导出",
    "summary": "图片太大、手机上错位、导出文档没图时先看这几条。",
    "category": "常见问题",
    "audience": [
      "admin",
      "teacher",
      "student"
    ],
    "keywords": [
      "图片",
      "太大",
      "错位",
      "手机",
      "导出",
      "Word",
      "没有图片",
      "放大"
    ],
    "sections": [
      {
        "heading": "图片显示",
        "paragraphs": [],
        "bullets": [
          "题干/选项图片在页面上会按卡片宽度缩放；点击图片可看大图。",
          "手机上图片会自动换行；如果仍然错位，刷新页面或换最新浏览器。"
        ]
      },
      {
        "heading": "导出文档",
        "paragraphs": [],
        "bullets": [
          "Word 导出会内嵌题干、选项和描述图片；如果原图已被清理，文档里会缺这张图。",
          "JSON 备份保存图片引用，不保存二进制；跨服务器迁移要同时迁移文件存储。"
        ]
      }
    ]
  },
  {
    "id": "student-学员-我的任务与考试安排",
    "title": "学员：我的任务与考试安排",
    "summary": "登录后在哪里找待完成考试、练习和已交卷记录。",
    "category": "学员指南",
    "audience": [
      "student"
    ],
    "keywords": [
      "学员",
      "我的任务",
      "考试",
      "安排",
      "待完成",
      "练习"
    ],
    "permission": "portal:student",
    "sections": [
      {
        "heading": "找到考试",
        "paragraphs": [],
        "bullets": [
          "登录后进入「我的任务」，查看老师分配给班级或个人的考试/问卷。",
          "只在开放时间内可以进入；错过时间会显示已结束或未开放。"
        ]
      }
    ]
  },
  {
    "id": "student-学员-答题-保存与交卷",
    "title": "学员：答题、保存与交卷",
    "summary": "答题页怎么选答案、看答题卡、暂存和最终提交。",
    "category": "学员指南",
    "audience": [
      "student"
    ],
    "keywords": [
      "答题",
      "选项",
      "答题卡",
      "保存",
      "交卷",
      "提交",
      "下一题",
      "图片"
    ],
    "permission": "project:answer",
    "sections": [
      {
        "heading": "作答",
        "paragraphs": [],
        "bullets": [
          "选择题点击整行选项；填空题直接在输入框作答。",
          "图片题点击图片可以放大查看；看不清时先放大再作答。",
          "右侧/底部答题卡显示已答和未答，可快速跳到某题。"
        ]
      },
      {
        "heading": "保存与交卷",
        "paragraphs": [],
        "bullets": [
          "系统会自动暂存；看到“已保存”再离开页面。",
          "交卷前检查答题卡，确认没有漏题；提交后通常不能再修改。"
        ]
      }
    ]
  },
  {
    "id": "student-学员-成绩-错题本与练习",
    "title": "学员：成绩、错题本与练习",
    "summary": "交卷后在哪里看成绩、错题和重练。",
    "category": "学员指南",
    "audience": [
      "student"
    ],
    "keywords": [
      "成绩",
      "分数",
      "错题本",
      "练习册",
      "重练",
      "解析"
    ],
    "permission": "portal:student",
    "sections": [
      {
        "heading": "查看结果",
        "paragraphs": [],
        "bullets": [
          "在「我的任务」或成绩入口查看已交卷考试；老师设置允许后才能看答案和解析。",
          "错题本/练习册会收集错题，可按知识点重练。"
        ]
      }
    ]
  },
  {
    "id": "teacher-新建考试或问卷",
    "title": "新建考试或问卷",
    "summary": "从空白、题库组卷或导入文件创建一份考试/问卷。",
    "category": "考试与问卷",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "新建",
      "考试",
      "问卷",
      "组卷",
      "导入",
      "创建"
    ],
    "permission": "project:create",
    "sections": [
      {
        "heading": "操作步骤",
        "paragraphs": [],
        "bullets": [
          "进入「教学 → 试卷」或「问卷」，点右上角「新建」。",
          "填写名称，选择「考试」或「问卷」。考试默认计分，问卷默认不判分。",
          "新建方式可选：空白新建、从题库组卷、导入试卷/问卷。",
          "创建后进入编辑器，先保存或发布，再把链接发给学员。"
        ]
      },
      {
        "heading": "考试和问卷的区别",
        "paragraphs": [],
        "bullets": [
          "考试有分值、正确答案、判分、成绩和排名等设置。",
          "问卷更偏向收集意见，默认不判分；仍可配置必填、截止时间和登录要求。"
        ]
      }
    ]
  },
  {
    "id": "teacher-试卷编辑器-题型-分值与发布",
    "title": "试卷编辑器：题型、分值与发布",
    "summary": "左侧加题、右侧改属性，保存后预览、发布和复制链接。",
    "category": "考试与问卷",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "编辑器",
      "题型",
      "分值",
      "必填",
      "保存",
      "发布",
      "预览",
      "复制链接"
    ],
    "permission": "project:update",
    "sections": [
      {
        "heading": "编辑题目",
        "paragraphs": [],
        "bullets": [
          "左侧面板选择题型或结构（题组、说明、分割线）添加到画布。",
          "选中题目后，右侧「题目」页签修改题干、选项、正确答案、分值和解析。",
          "「大纲」用于快速定位题目；「主题」可设置背景图和页眉图。",
          "改动后点右上角「保存」；未保存离开时系统会提示。"
        ]
      },
      {
        "heading": "发布与分享",
        "paragraphs": [],
        "bullets": [
          "点「发布考试」后，学员才能通过链接进入。",
          "列表里的「复制链接」生成答题地址；需要登录的设置会显示“需登录”。",
          "发布前建议点「预览答题页」走一遍手机和电脑效果。"
        ]
      }
    ]
  },
  {
    "id": "teacher-选项富文本与图片选项",
    "title": "选项富文本与图片选项",
    "summary": "选项可以是文字、加粗内容或图片；导入模板也支持图片选项。",
    "category": "考试与问卷",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "选项",
      "图片选项",
      "富文本",
      "插入图片",
      "Aa",
      "Word",
      "Excel"
    ],
    "permission": "project:update",
    "sections": [
      {
        "heading": "在编辑器里做图片选项",
        "paragraphs": [],
        "bullets": [
          "选中题目，在右侧「选项」行点「Aa / 富文本」按钮。",
          "在弹窗里输入文字或点图片按钮上传图片，点「确定」保存。",
          "选项图片在答题页显示为缩略图，点击图片可放大查看，不会误触选择。"
        ]
      },
      {
        "heading": "从模板导入图片选项",
        "paragraphs": [],
        "bullets": [
          "Excel：把图片贴在「选项A…选项H」对应的单元格里，单元格可以只有图片没有文字；图片要落在一个单元格高度内。",
          "Word：把图片放在「A.」这一行内，或紧接选项行的下一段。",
          "AI 智能导入也支持在选项行使用 [[IMG:n]] 图片标记。"
        ]
      }
    ]
  },
  {
    "id": "teacher-导入试卷-问卷",
    "title": "导入试卷/问卷",
    "summary": "导入向导三步走：选择来源、预览确认、选择去向。",
    "category": "导入与导出",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "导入",
      "Word",
      "Excel",
      "文本",
      "JSON",
      "AI",
      "识别",
      "模板"
    ],
    "permission": "project:update",
    "sections": [
      {
        "heading": "三种入口",
        "paragraphs": [],
        "bullets": [
          "新建时选择「导入试卷」。",
          "编辑器顶部「导入」菜单，可导入到当前试卷。",
          "题库中心「导入」用于把题目导入题库，不创建试卷。"
        ]
      },
      {
        "heading": "推荐格式",
        "paragraphs": [],
        "bullets": [
          "Word/Excel 模板适合批量题目；Excel 按题型分工作表，图片可按选项列归属。",
          "文本适合从聊天记录或文档里粘贴题目。",
          "JSON 用于系统导出的整卷备份；AI 智能识别适合版式不固定的文档和图片。"
        ]
      },
      {
        "heading": "预览与创建",
        "paragraphs": [],
        "bullets": [
          "解析后先核对题数、分值、答案和图片；有 warning 时按提示修正。",
          "确认无误后选择创建新试卷或加入现有位置。"
        ]
      }
    ]
  },
  {
    "id": "teacher-导出试卷-问卷本体",
    "title": "导出试卷/问卷本体",
    "summary": "列表或编辑器里的“导出”可下载完整 JSON 备份或带图片的 Word。",
    "category": "导入与导出",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "导出",
      "JSON",
      "Word",
      "备份",
      "图片",
      "本体",
      "下载"
    ],
    "permission": "project:detail",
    "sections": [
      {
        "heading": "两种格式",
        "paragraphs": [],
        "bullets": [
          "JSON 备份：包含名称、模式、完整设置和题目树，适合留档和迁移。",
          "Word 文档：按当前题目生成 .docx，题干、选项和描述里的图片会嵌入文档。"
        ]
      },
      {
        "heading": "入口与密码",
        "paragraphs": [],
        "bullets": [
          "项目列表行点「导出」，或编辑器顶部点「导出」。",
          "如果系统设置了导出密码，会要求输入密码；未设置时直接下载。",
          "JSON 备份里的图片是引用地址，换服务器时需要同时迁移文件；Word 里的图片是内嵌的。"
        ]
      }
    ]
  },
  {
    "id": "teacher-批改答卷-看数据与导出成绩",
    "title": "批改答卷、看数据与导出成绩",
    "summary": "考试交卷后，在批改/数据页处理待批改、查看统计和导出成绩。",
    "category": "批改与数据",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "批改",
      "答卷",
      "数据",
      "统计",
      "成绩",
      "导出",
      "待批改"
    ],
    "permission": "answer:list",
    "sections": [
      {
        "heading": "批改",
        "paragraphs": [],
        "bullets": [
          "教学列表或试卷设置页进入「批改/数据」，待批改数量会标在按钮上。",
          "客观题自动判分；主观题按采分点给分，可填写评语。",
          "AI 批改只给建议分，必须由老师复核后再提交。"
        ]
      },
      {
        "heading": "统计与导出",
        "paragraphs": [],
        "bullets": [
          "统计页看平均分、及格率、题目正确率和选项分布。",
          "导出答卷/成绩前确认筛选范围和时间段；没有导出权限时请管理员分配。"
        ]
      }
    ]
  },
  {
    "id": "teacher-题库中心-题目-组卷与题库导出",
    "title": "题库中心：题目、组卷与题库导出",
    "summary": "维护题库、导入题目、从题库组卷，或把题库导出成 Excel。",
    "category": "题库与组卷",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "题库",
      "题目",
      "组卷",
      "导入",
      "导出",
      "Excel",
      "标签",
      "章节"
    ],
    "permission": "repo:list",
    "sections": [
      {
        "heading": "题库管理",
        "paragraphs": [],
        "bullets": [
          "进入「题库中心」新建题库；题库下可维护题目、章节、难度和标签。",
          "题库导出会按题型分工作表生成 Excel；导出密码由系统设置控制。"
        ]
      },
      {
        "heading": "从题库组卷",
        "paragraphs": [],
        "bullets": [
          "新建考试时选择「从题库组卷」，按题型、数量、分值和难度抽题。",
          "组卷后仍可在编辑器里改题、排序和调整分值。"
        ]
      }
    ]
  },
  {
    "id": "teacher-班级-成员与考试分配",
    "title": "班级、成员与考试分配",
    "summary": "建班、加学员、把考试或题库分配给班级。",
    "category": "班级管理",
    "audience": [
      "teacher"
    ],
    "keywords": [
      "班级",
      "成员",
      "学员",
      "分配",
      "授权",
      "注册",
      "学情"
    ],
    "permission": "class:list",
    "sections": [
      {
        "heading": "班级管理",
        "paragraphs": [],
        "bullets": [
          "进入「教学 → 班级」新建班级，添加或导入学员。",
          "班级可以分配考试/问卷和题库；学员登录后能在「我的任务」看到。",
          "班级资源有开放时间窗口，班级老师只能在全局时间范围内收紧。"
        ]
      }
    ]
  }
];
