import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResolutionBadge } from "@/components/ResolutionBadge";

describe("ResolutionBadge", () => {
  it("渲染 unresolved 状态", () => {
    render(<ResolutionBadge status="unresolved" />);
    expect(screen.getByText("刚开始")).toBeDefined();
  });

  it("渲染 resolved 状态", () => {
    render(<ResolutionBadge status="resolved" />);
    expect(screen.getByText("已解决")).toBeDefined();
  });

  it("5种状态均有对应文字", () => {
    const statuses = ["unresolved", "in_progress", "avoiding", "accepted", "resolved"] as const;
    const labels = ["刚开始", "解决中", "逃避中", "无法解决", "已解决"];
    for (let i = 0; i < statuses.length; i++) {
      const { unmount } = render(<ResolutionBadge status={statuses[i]} />);
      expect(screen.getByText(labels[i])).toBeDefined();
      unmount();
    }
  });
});
