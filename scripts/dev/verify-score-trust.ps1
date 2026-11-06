<#
  验证「考试判分只信任服务端 schema」等 4 条修复（task-39）。

  做什么：
    1. 用 AnswerServiceImpl 里真实的私有静态方法（反射调用），验证：
       - 考试模式下客户端提交的 survey 会被丢弃（伪造 examCorrectAnswer 落不了库）；
       - 判分 schema 只来自「库里快照 / 项目 schema」，永远拿不到客户端那份；
       - 首次提交（previousAnswer == null）也会受最长/最短交卷约束；
       - 客户端声称的开始时间会被合理性校验（晚于服务器 / 早于 24 小时 / 早于开考都不认）。
    2. 用真实的 AnswerScoreEvaluator 演示：同一份答案，用伪造 schema 判分能得满分，用服务端 schema 得 0 分。

  怎么跑：
    pwsh -File scripts/dev/verify-score-trust.ps1
    pwsh -File scripts/dev/verify-score-trust.ps1 -KeepArtifacts   # 保留生成的临时工程

  前置：server 下已经执行过 gradlew :api:compileJava（脚本会自己触发 :rdbms:classes）。
  只读：不改源码、不启服务、不连数据库。临时产物写在系统 TEMP 下，跑完自动删。
#>
[CmdletBinding()]
param(
    [switch]$KeepArtifacts
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$serverDir = Join-Path $repoRoot 'server'
$gradlew = Join-Path $serverDir 'gradlew.bat'

if (-not (Test-Path $gradlew)) { throw "找不到 $gradlew（脚本要放在 scripts/dev/ 下运行）" }
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = Join-Path $env:LOCALAPPDATA 'jdk8\jdk8u504-b01' }
if (-not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { throw "JAVA_HOME 无效：$env:JAVA_HOME" }

$workDir = Join-Path ([System.IO.Path]::GetTempPath()) ('sk-score-trust-' + [guid]::NewGuid().ToString('N'))
$srcDir = Join-Path $workDir 'src'
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null

# ---------------------------------------------------------------------------------------------
# 1. 生成反射 harness（默认包，方便直接跑；只用到 shared / rdbms 的编译产物）
# ---------------------------------------------------------------------------------------------
$harness = @'
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 用真实编译产物验证 task-39 的四条修复；不连数据库、不启 Spring。
 */
public class ScoreTrustHarness {

	private static int passed = 0;

	private static int failed = 0;

	public static void main(String[] args) throws Exception {
		Class<?> impl = Class.forName("cn.surveyking.server.impl.AnswerServiceImpl");
		Method dropSnapshot = impl.getDeclaredMethod("dropClientSnapshotForExam", Answer.class, ProjectView.class);
		dropSnapshot.setAccessible(true);
		Method trustedSchema = impl.getDeclaredMethod("trustedScoreSchema", ProjectView.class, Answer.class);
		trustedSchema.setAccessible(true);
		Class<?> attemptStartClass = Class.forName("cn.surveyking.server.impl.AnswerServiceImpl$AttemptStart");
		Method resolveStart = impl.getDeclaredMethod("resolveAttemptStart", Answer.class, ProjectView.class,
				Answer.class);
		resolveStart.setAccessible(true);
		Method assertTime = impl.getDeclaredMethod("assertWithinTimeLimit", Answer.class, ProjectView.class,
				attemptStartClass);
		assertTime.setAccessible(true);
		java.lang.reflect.Field atField = attemptStartClass.getDeclaredField("at");
		atField.setAccessible(true);
		java.lang.reflect.Field estimatedField = attemptStartClass.getDeclaredField("estimated");
		estimatedField.setAccessible(true);

		// ---- 造数据：q1 单选 10 分，服务端正确答案是 o1；学生选了 o2 ----
		SurveySchema serverSurvey = surveyWithCorrectOption("o1");
		SurveySchema forgedSurvey = surveyWithCorrectOption("o2");
		LinkedHashMap<String, Object> answer = new LinkedHashMap<String, Object>();
		Map<String, Object> picked = new LinkedHashMap<String, Object>();
		picked.put("o2", Boolean.TRUE);
		answer.put("q1", picked);

		Double forgedScore = new AnswerScoreEvaluator(forgedSurvey, answer).eval();
		Double serverScore = new AnswerScoreEvaluator(serverSurvey, answer).eval();
		System.out.println("[演示] 同一份答卷（选了 o2），用【伪造 schema】判分 = " + forgedScore);
		System.out.println("[演示] 同一份答卷（选了 o2），用【服务端 schema】判分 = " + serverScore);
		check("伪造 examCorrectAnswer 确实能判出满分（说明漏洞是真的）", forgedScore != null && forgedScore == 10d);
		check("服务端 schema 下同样答案得 0 分", serverScore != null && serverScore == 0d);

		// ---- 1) 考试模式下客户端 survey 不落库 ----
		ProjectView examProject = project(serverSurvey, ProjectModeEnum.exam, 10, 10);
		Answer forgedAnswer = new Answer();
		forgedAnswer.setSurvey(forgedSurvey);
		dropSnapshot.invoke(null, forgedAnswer, examProject);
		check("考试模式：客户端提交的 survey 被丢弃（不会落库）", forgedAnswer.getSurvey() == null);

		ProjectView surveyProject = project(serverSurvey, ProjectModeEnum.survey, null, null);
		Answer surveyAnswer = new Answer();
		surveyAnswer.setSurvey(forgedSurvey);
		dropSnapshot.invoke(null, surveyAnswer, surveyProject);
		check("普通问卷：展示用快照保留（不参与判分）", surveyAnswer.getSurvey() != null);

		ProjectView exerciseProject = project(serverSurvey, ProjectModeEnum.exam, null, null);
		exerciseProject.setId("exercise");
		Answer exerciseAnswer = new Answer();
		exerciseAnswer.setSurvey(forgedSurvey);
		dropSnapshot.invoke(null, exerciseAnswer, exerciseProject);
		check("题库练习：快照保留（练完要按它算做了几题）", exerciseAnswer.getSurvey() != null);

		// ---- 2) 判分 schema 只来自服务端 ----
		SurveySchema randomSnapshot = surveyWithCorrectOption("o1");
		Answer storedAnswer = new Answer();
		storedAnswer.setSurvey(randomSnapshot);
		check("首次提交：判分 schema = 项目 schema", trustedSchema.invoke(null, examProject, null) == serverSurvey);
		check("随机卷：判分 schema = 库里快照（服务端写的）", trustedSchema.invoke(null, examProject, storedAnswer) == randomSnapshot);
		check("伪造的 schema 永远拿不到", trustedSchema.invoke(null, examProject, null) != forgedSurvey);

		Object effective = trustedSchema.invoke(null, examProject, null);
		Double scoreUnderFix = new AnswerScoreEvaluator((SurveySchema) effective, answer).eval();
		check("修复后的实际判分 = 0 分（不是伪造出来的 10 分）", scoreUnderFix != null && scoreUnderFix == 0d);

		// ---- 3) 首次提交也受最短/最长交卷约束 ----
		long now = System.currentTimeMillis();
		Answer firstSubmit = new Answer();
		firstSubmit.setTempSave(1);
		firstSubmit.setMetaInfo(metaWithStart(now - 30 * 60_000L));
		Object start = resolveStart.invoke(null, firstSubmit, examProject, null);
		check("客户端上报的开始时间被采纳", ((Long) atField.get(start)) <= now - 29 * 60_000L);
		String maxReject = expectDenied(assertTime, firstSubmit, examProject, start);
		check("首次提交超过最长答题时间会被拒绝（previousAnswer==null 不再放行）", maxReject != null);
		System.out.println("       拒绝原因：" + maxReject);

		Answer earlySubmit = new Answer();
		earlySubmit.setTempSave(1);
		earlySubmit.setMetaInfo(metaWithStart(now - 60_000L));
		Object earlyStart = resolveStart.invoke(null, earlySubmit, examProject, null);
		String minReject = expectDenied(assertTime, earlySubmit, examProject, earlyStart);
		check("首次提交没答满最短时间会被拒绝", minReject != null);
		System.out.println("       拒绝原因：" + minReject);

		// 没有可信开始时间 → 估算值，此时最短交卷不拦（否则所有首交都会被拒），最长也放行
		Answer noMeta = new Answer();
		noMeta.setTempSave(1);
		Object estimatedStart = resolveStart.invoke(null, noMeta, examProject, null);
		check("拿不到开始时间时标记为估算值", Boolean.TRUE.equals(estimatedField.get(estimatedStart)));
		check("估算值时最短交卷不误杀首次提交", expectDenied(assertTime, noMeta, examProject, estimatedStart) == null);

		// 篡改：声称从现在之后开始（未来时间）/ 声称 24 小时之前开始 → 都不认，退化为估算值
		Answer future = new Answer();
		future.setMetaInfo(metaWithStart(now + 10 * 60_000L));
		check("声称「未来开始」不认，退化为估算值",
				Boolean.TRUE.equals(estimatedField.get(resolveStart.invoke(null, future, examProject, null))));
		Answer tooOld = new Answer();
		tooOld.setMetaInfo(metaWithStart(now - 48 * 60 * 60_000L));
		check("声称「48 小时前开始」不认，退化为估算值",
				Boolean.TRUE.equals(estimatedField.get(resolveStart.invoke(null, tooOld, examProject, null))));

		// 库里有答卷时：用服务端记录的 startTime，客户端再传什么都会被忽略
		Answer updateSubmit = new Answer();
		updateSubmit.setTempSave(1);
		updateSubmit.setMetaInfo(metaWithStart(now - 60_000L));
		Answer stored = new Answer();
		stored.setCreateAt(new java.util.Date(now - 20 * 60_000L));
		stored.setMetaInfo(metaWithStart(now - 20 * 60_000L));
		Object updateStart = resolveStart.invoke(null, updateSubmit, examProject, stored);
		check("已有答卷：以服务端记录的 startTime 为准（忽略客户端）",
				Math.abs(((Long) atField.get(updateStart)) - (now - 20 * 60_000L)) < 2000);

		System.out.println();
		System.out.println("通过 " + passed + " 项，失败 " + failed + " 项");
		if (failed > 0) {
			System.exit(1);
		}
	}

	private static void check(String title, boolean ok) {
		if (ok) {
			passed++;
			System.out.println("[PASS] " + title);
		}
		else {
			failed++;
			System.out.println("[FAIL] " + title);
		}
	}

	/** 调 assertWithinTimeLimit，返回拒绝原因；没抛异常说明放行 */
	private static String expectDenied(Method assertTime, Answer answer, ProjectView project, Object attemptStart)
			throws Exception {
		try {
			assertTime.invoke(null, answer, project, attemptStart);
			return null;
		}
		catch (InvocationTargetException e) {
			Throwable cause = e.getCause();
			return cause.getClass().getSimpleName() + ": " + cause.getMessage();
		}
	}

	private static AnswerMetaInfo metaWithStart(long startTime) {
		AnswerMetaInfo meta = new AnswerMetaInfo();
		AnswerMetaInfo.AnswerInfo info = new AnswerMetaInfo.AnswerInfo();
		info.setStartTime(startTime);
		meta.setAnswerInfo(info);
		return meta;
	}

	private static ProjectView project(SurveySchema survey, ProjectModeEnum mode, Integer maxMinutes,
			Integer minMinutes) {
		ProjectView project = new ProjectView();
		project.setId("p1");
		project.setMode(mode);
		project.setSurvey(survey);
		ProjectSetting setting = new ProjectSetting();
		ProjectSetting.ExamSetting examSetting = new ProjectSetting.ExamSetting();
		examSetting.setMaxSubmitMinutes(maxMinutes);
		examSetting.setMinSubmitMinutes(minMinutes);
		setting.setExamSetting(examSetting);
		project.setSetting(setting);
		return project;
	}

	private static SurveySchema surveyWithCorrectOption(String correctOptionId) {
		SurveySchema.Attribute questionAttr = new SurveySchema.Attribute();
		questionAttr.setExamAnswerMode(SurveySchema.ExamScoreMode.onlyOne);
		questionAttr.setExamScore(10d);
		SurveySchema question = SurveySchema.builder().id("q1").title("1 号题")
				.type(SurveySchema.QuestionType.Radio).attribute(questionAttr).build();
		question.setChildren(new ArrayList<SurveySchema>());
		question.getChildren().add(option("o1", "o1".equals(correctOptionId)));
		question.getChildren().add(option("o2", "o2".equals(correctOptionId)));

		SurveySchema root = SurveySchema.builder().id("survey").title("验证用问卷")
				.type(SurveySchema.QuestionType.Survey).attribute(new SurveySchema.Attribute()).build();
		root.setChildren(new ArrayList<SurveySchema>());
		root.getChildren().add(question);
		return root;
	}

	private static SurveySchema option(String id, boolean correct) {
		SurveySchema.Attribute attr = new SurveySchema.Attribute();
		if (correct) {
			attr.setExamCorrectAnswer(id);
		}
		return SurveySchema.builder().id(id).title(id).type(SurveySchema.QuestionType.Option).attribute(attr).build();
	}

}
'@

Set-Content -Path (Join-Path $srcDir 'ScoreTrustHarness.java') -Value $harness -Encoding UTF8

# ---------------------------------------------------------------------------------------------
# 2. 生成 gradle init 脚本：借 :rdbms 的真实运行时 classpath 编译并运行 harness
# ---------------------------------------------------------------------------------------------
$initScript = @'
gradle.projectsEvaluated {
    def p = gradle.rootProject.findProject(':rdbms')
    def harnessRoot = new File(System.getProperty('skHarnessDir'))
    def classesDir = new File(harnessRoot, 'classes')

    p.tasks.register('compileScoreTrustHarness', JavaCompile) {
        source = p.fileTree(new File(harnessRoot, 'src')) { include '**/*.java' }
        classpath = p.sourceSets.main.runtimeClasspath
        destinationDirectory.set(classesDir)
        sourceCompatibility = '1.8'
        targetCompatibility = '1.8'
        options.encoding = 'UTF-8'
    }

    p.tasks.register('verifyScoreTrust', JavaExec) {
        dependsOn 'compileScoreTrustHarness'
        classpath = p.sourceSets.main.runtimeClasspath + p.files(classesDir)
        mainClass.set('ScoreTrustHarness')
    }
}
'@

$initPath = Join-Path $workDir 'verify-init.gradle'
Set-Content -Path $initPath -Value $initScript -Encoding UTF8

# ---------------------------------------------------------------------------------------------
# 3. 跑
# ---------------------------------------------------------------------------------------------
Write-Host "== 验证 task-39 修复（判分只信服务端 schema / 首次提交受时长约束）==" -ForegroundColor Cyan
Push-Location $serverDir
try {
    & $gradlew '-I' $initPath ':rdbms:verifyScoreTrust' '--console=plain' '-q' "-DskHarnessDir=$workDir"
    $code = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($code -eq 0) {
    Write-Host "`n全部检查通过。" -ForegroundColor Green
}
else {
    Write-Host "`n有检查失败（exit $code），看上面的 [FAIL]。" -ForegroundColor Red
}

if ($KeepArtifacts) {
    Write-Host "临时工程保留在：$workDir"
}
else {
    Remove-Item -Recurse -Force $workDir -ErrorAction SilentlyContinue
}

exit $code
