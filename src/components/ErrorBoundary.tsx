"use client";
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-calm-800 font-medium mb-1">出了点问题</p>
            <p className="text-calm-400 text-xs mb-4">{this.state.error?.message || "未知错误"}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> 重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
