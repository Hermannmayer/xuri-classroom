/** AI 供应商预设：只预填 Base URL，运行期仍以用户填写的 baseUrl 为准。 */
export interface AiProvider {
  id: string;
  name: string;
  baseUrl: string;
  supportsModelList: boolean;
  custom?: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', supportsModelList: true },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', supportsModelList: true },
  { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', supportsModelList: true },
  { id: 'moonshot', name: 'Moonshot / Kimi', baseUrl: 'https://api.moonshot.cn/v1', supportsModelList: true },
  { id: 'dashscope', name: '阿里云百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', supportsModelList: true },
  { id: 'qianfan', name: '百度千帆', baseUrl: 'https://qianfan.baidubce.com/v2', supportsModelList: true },
  { id: 'hunyuan', name: '腾讯混元', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', supportsModelList: true },
  { id: 'ark', name: '火山方舟 / 豆包', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', supportsModelList: true },
  { id: 'zhipu', name: '智谱 BigModel', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', supportsModelList: false },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.cn/v1', supportsModelList: true },
  { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', supportsModelList: true },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', supportsModelList: true },
  { id: 'custom', name: '自定义', baseUrl: '', supportsModelList: true, custom: true },
];

export function findAiProvider(id?: string): AiProvider | undefined {
  return AI_PROVIDERS.find((item) => item.id === id);
}
