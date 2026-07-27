import { NextRequest, NextResponse } from "next/server";

interface DiaryEntry {
  title: string;
  content: string;
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { diaries }: { diaries: DiaryEntry[] } = body;

    if (!diaries || diaries.length === 0) {
      return NextResponse.json({ error: "缺少日记数据" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.AI_MODEL || "deepseek-chat";

    if (!apiKey || apiKey === "sk-your-api-key-here") {
      return NextResponse.json({ error: "DeepSeek API 密钥未配置" }, { status: 500 });
    }

    const diaryText = diaries
      .map(d => `【${d.createdAt}】《${d.title}》\n${d.content.slice(0, 500)}`)
      .join("\n\n");

    const systemPrompt = `你是一位温暖的人生教练。基于用户的日记片段，做两件事：

1. 写一篇连贯、温暖、有画面感的人生展望文章（800-1200字），用第一人称"我"，描绘用户理想中的未来生活。
2. 从文章中提取需要面对的 3-6 个人生课题，为每个课题建议一条底线——即"在这个课题上，最低不能跌破什么"。

请严格以 JSON 格式返回，不要包含其他内容。`;

    const userPrompt = `以下是我关于未来生活的日记片段，请帮我畅想未来人生：

${diaryText}`;

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `AI API 错误: ${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json({ error: "AI 返回为空" }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json({
      article: parsed.article || "",
      baselines: parsed.baselines || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "生成失败" }, { status: 500 });
  }
}
