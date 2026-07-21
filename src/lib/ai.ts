// 人生手记 - AI分析入口（向后兼容封装）
// 底层已升级为Pipeline架构：预标注 → RAG检索 → Agent分析 → 验证
import { runPipeline } from "./ai/pipeline";
import { preAnnotate } from "./ai/preannotate";
import { getMockAnalysis } from "./ai/analysis-local";
import type { AgentType } from "./ai/types";

/** 分析单篇日记（兼容原有接口，新增agentType参数） */
export async function analyzeDiary(
  title: string,
  content: string,
  options?: { topicIds?: string[]; agentType?: AgentType }
) {
  return runPipeline({
    title,
    content,
    topicIds: options?.topicIds || [],
    agentType: options?.agentType || "single",
    hasAPIKey: !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "sk-your-api-key-here"),
  });
}

/** 获取本地预标注结果（不调用LLM，可用于UI实时预览） */
export function previewAnalysis(title: string, content: string) {
  return preAnnotate(title, content);
}

// 重新导出保持向后兼容
export { getMockAnalysis };
export { COGNITIVE_STAGE_WORDS } from "./ai/preannotate";
