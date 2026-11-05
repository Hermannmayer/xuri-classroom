// 组卷：题目默认必答 + 一键按总分分配分值
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/project/ComposeModal.tsx');
let text = fs.readFileSync(file, 'utf8');

// 1. 题目补 required: true（并保留补 dataSource 的逻辑）
const oldMap = `      const questions = picked.map((question) => {
        if (question.dataSource?.length) return question;
        const options = (question.children ?? []).filter((child) => child.type === 'Option' || !child.type);
        if (options.length === 0) return question;
        return {
          ...question,
          dataSource: options.map((child) => ({ label: child.title ?? '', value: child.id })),
        };
      });`;

const newMap = `      const questions = picked.map((question) => {
        // 考试场景所有题必答
        const base = { ...question, attribute: { ...(question.attribute ?? {}), required: true } };
        if (base.dataSource?.length) return base;
        const options = (base.children ?? []).filter((child) => child.type === 'Option' || !child.type);
        if (options.length === 0) return base;
        // 后端 pick 只返回 children（Option 节点），渲染器读 dataSource，这里补一份
        return {
          ...base,
          dataSource: options.map((child) => ({ label: child.title ?? '', value: child.id })),
        };
      });`;

if (!text.includes(oldMap)) {
  console.error('未找到 map 锚点');
  process.exit(1);
}
text = text.replace(oldMap, newMap);

// 2. totals 之后插入 applyTotalScore
const totalsAnchor = `    return { questions, score };
  }, [selectedRepoIds, configs]);`;

const totalsPatched = `    return { questions, score };
  }, [selectedRepoIds, configs]);

  /** 按当前分值比例缩放到目标总分 */
  const applyTotalScore = (target: number) => {
    const current = totals.score;
    if (!Number.isFinite(target) || target <= 0 || current <= 0) return;
    const ratio = target / current;
    setConfigs((prev) => {
      const next: typeof prev = {};
      for (const repoId of Object.keys(prev)) {
        const perRepo: NonNullable<(typeof prev)[string]> = {};
        for (const type of Object.keys(prev[repoId] ?? {}) as ComposeType[]) {
          const config = prev[repoId]?.[type];
          if (!config || !config.count) continue;
          perRepo[type] = { ...config, score: Number((Number(config.score ?? 0) * ratio).toFixed(2)) };
        }
        next[repoId] = perRepo;
      }
      return next;
    });
  };`;

if (!text.includes(totalsAnchor)) {
  console.error('未找到 totals 锚点');
  process.exit(1);
}
text = text.replace(totalsAnchor, totalsPatched);

fs.writeFileSync(file, text);
console.log('已加必答与总分分配');
