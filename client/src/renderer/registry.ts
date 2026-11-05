import type { QuestionType } from '../schema/types';
import type { QuestionComponent } from './types';

/**
 * 题型注册表：新增题型 = 写一个组件 + 在 registerAll.ts 里注册一行。
 * 不要在别处 switch(type)，渲染一律走这里。
 */
const registry = new Map<QuestionType, QuestionComponent>();

export function registerQuestion(type: QuestionType, component: QuestionComponent) {
  registry.set(type, component);
}

export function getQuestionComponent(type: QuestionType): QuestionComponent | undefined {
  return registry.get(type);
}

export function registeredTypes(): QuestionType[] {
  return [...registry.keys()];
}
