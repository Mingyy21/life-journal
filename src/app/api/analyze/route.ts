import { NextRequest, NextResponse } from "next/server";
import { analyzeDiary } from "@/lib/ai";
import type { AgentType } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, topicIds, agentType } = body as {
      title?: string;
      content?: string;
      topicIds?: string[];
      agentType?: AgentType;
    };

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "请提供日记内容" }, { status: 400 });
    }
    if (content.length < 10) {
      return NextResponse.json({ error: "日记内容太短，至少需要10个字" }, { status: 400 });
    }

    // 验证agentType
    const validAgentTypes: AgentType[] = ["single", "daily", "weekly", "monthly", "yearly", "pattern"];
    if (agentType && !validAgentTypes.includes(agentType)) {
      return NextResponse.json({ error: `无效的agentType: ${agentType}，有效值: ${validAgentTypes.join(", ")}` }, { status: 400 });
    }

    const analysis = await analyzeDiary(title || "无标题", content, {
      topicIds: topicIds || [],
      agentType: agentType || "single",
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("分析API错误:", error);
    return NextResponse.json(
      { error: "分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
