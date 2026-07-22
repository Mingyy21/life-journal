// 预留：AI 干预检测逻辑
// 后续版本中，此 hook 将监测用户在某课题下的情绪累积，
// 并在达到阈值时触发 AI 心理陪伴对话。

import { useState, useCallback } from "react";

export interface InterventionState {
  /** 是否达到干预阈值 */
  triggered: boolean;
  /** 触发干预的课题ID */
  topicId: string | null;
  /** 干预建议 */
  suggestion: string | null;
}

export function useIntervention() {
  const [state] = useState<InterventionState>({
    triggered: false,
    topicId: null,
    suggestion: null,
  });

  const requestIntervention = useCallback(async (_topicId: string) => {
    // TODO: 实现干预检测逻辑
    return null;
  }, []);

  const dismissIntervention = useCallback(() => {
    // TODO: 实现关闭逻辑
  }, []);

  return { ...state, requestIntervention, dismissIntervention };
}
