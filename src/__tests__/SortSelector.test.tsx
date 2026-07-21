import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SortSelector from "@/components/SortSelector";

describe("SortSelector", () => {
  it("渲染三种排序选项", () => {
    render(<SortSelector value="recent" onChange={() => {}} />);
    expect(screen.getByText("最近")).toBeDefined();
    expect(screen.getByText("未解决")).toBeDefined();
    expect(screen.getByText("频率")).toBeDefined();
  });

  it("选中状态高亮", () => {
    render(<SortSelector value="unresolved" onChange={() => {}} />);
    const btn = screen.getByText("未解决");
    expect(btn.className).toContain("bg-calm-800");
  });

  it("点击触发 onChange", () => {
    const fn = vi.fn();
    render(<SortSelector value="recent" onChange={fn} />);
    fireEvent.click(screen.getByText("频率"));
    expect(fn).toHaveBeenCalledWith("frequency");
  });
});
