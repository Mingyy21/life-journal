"use client";
import { useState } from "react";
import { Brain, Lightbulb, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { AnalysisResult } from "@/types";

const EM: Record<string,string> = { joy:"喜悦", trust:"信任", fear:"恐惧", surprise:"惊讶", sadness:"悲伤", disgust:"厌恶", anger:"愤怒", anticipation:"期待" };
const EC: Record<string,string> = { joy:"#FFD93D", trust:"#6BCB77", fear:"#9B59B6", surprise:"#FF9F43", sadness:"#54A0FF", disgust:"#A29BFE", anger:"#FF6B6B", anticipation:"#FECA57" };
const SI: Record<string,{label:string; color:string; desc:string}> = {
  "觉察":{label:"觉察",color:"#94A3B8",desc:"你开始注意到这个问题了"},
  "接纳":{label:"接纳",color:"#60A5FA",desc:"你正在接受这个现实"},
  "理解":{label:"理解",color:"#34D399",desc:"你开始理解为什么会这样"},
  "重构":{label:"重构",color:"#FBBF24",desc:"你正在重新定义这个经历"},
  "行动":{label:"行动",color:"#F472B6",desc:"你已经准备好做出改变"},
};

export default function AnalysisCard({ analysis }: { analysis: AnalysisResult; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const top = Object.entries(analysis.emotionLabels).filter(([,v])=>v>0.2).sort(([,a],[,b])=>b-a).slice(0,4);
  const stage = SI[analysis.cognitiveStage] || SI["觉察"];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-primary-100 overflow-hidden animate-fade-in">
      <button onClick={()=>setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"><Brain className="w-4 h-4 text-primary-600" /></div>
          <div className="text-left"><p className="text-sm font-medium text-calm-800">AI 分析</p><p className="text-xs text-calm-400">{analysis.primaryEmotion} · {analysis.cognitiveStage}</p></div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-calm-400" /> : <ChevronDown className="w-4 h-4 text-calm-400" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-slide-up">
          <div>
            <p className="text-xs text-calm-400 mb-2">情绪分布</p>
            <div className="space-y-1.5">
              {top.map(([k,v])=>(
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-calm-600 w-10">{EM[k]||k}</span>
                  <div className="flex-1 h-2 bg-calm-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:`${v*100}%`,backgroundColor:EC[k]||"#94A3B8"}}/></div>
                  <span className="text-xs text-calm-400 w-8 text-right">{Math.round(v*100)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-calm-50 rounded-xl p-3 text-center"><p className="text-xs text-calm-400 mb-1">愉悦度</p><p className={`text-lg font-semibold ${analysis.vadScore.valence>=0?"text-green-500":"text-red-400"}`}>{analysis.vadScore.valence>=0?"+":""}{analysis.vadScore.valence.toFixed(2)}</p></div>
            <div className="bg-calm-50 rounded-xl p-3 text-center"><p className="text-xs text-calm-400 mb-1">唤醒度</p><p className="text-lg font-semibold text-orange-400">{analysis.vadScore.arousal.toFixed(2)}</p></div>
            <div className="bg-calm-50 rounded-xl p-3 text-center"><p className="text-xs text-calm-400 mb-1">掌控感</p><p className="text-lg font-semibold text-blue-400">{analysis.vadScore.dominance.toFixed(2)}</p></div>
          </div>
          <div className="flex items-center gap-3 bg-calm-50 rounded-xl p-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:stage.color}}/>
            <div><p className="text-sm font-medium text-calm-700">认知阶段：{stage.label}</p><p className="text-xs text-calm-400">{stage.desc}</p></div>
          </div>
          <div className="flex items-start gap-2"><Lightbulb className="w-4 h-4 text-warm-500 flex-shrink-0 mt-0.5"/><p className="text-sm text-calm-700 leading-relaxed">{analysis.insight}</p></div>
          <div className="bg-primary-50 rounded-xl p-4"><div className="flex items-start gap-2"><MessageCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5"/><p className="text-sm text-calm-700 leading-relaxed">{analysis.feedback}</p></div></div>
          <div className="border border-dashed border-calm-200 rounded-xl p-3"><p className="text-xs text-calm-400 mb-1">思考一下</p><p className="text-sm text-calm-600 italic">{analysis.followUpQuestion}</p></div>
        </div>
      )}
    </div>
  );
}
