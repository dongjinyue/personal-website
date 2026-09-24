import assert from "node:assert/strict";
import test from "node:test";
import { transitionDismissedDropdown } from "../../lib/navigation/dropdown-state";

test("站内跳转后鼠标离开不会重新打开菜单，重新进入或键盘聚焦才允许展开", () => {
  const dismissed = transitionDismissedDropdown(null, { type: "navigate", dropdown: "knowledge" });

  assert.equal(dismissed, "knowledge");
  assert.equal(
    transitionDismissedDropdown(dismissed, { type: "pointer-leave", dropdown: "projects" }),
    "knowledge",
    "离开另一个菜单不应清除当前菜单的收起状态",
  );
  assert.equal(
    transitionDismissedDropdown(dismissed, { type: "pointer-leave", dropdown: "knowledge" }),
    "knowledge",
    "关闭菜单造成的鼠标离开不能立即清除收起状态",
  );
  assert.equal(
    transitionDismissedDropdown(dismissed, { type: "pointer-enter", dropdown: "projects" }),
    "knowledge",
    "进入另一个导航项不能清除当前菜单的收起状态",
  );
  assert.equal(
    transitionDismissedDropdown(dismissed, { type: "pointer-enter", dropdown: "knowledge" }),
    null,
    "鼠标重新进入知识库导航项后允许悬停展开",
  );
  assert.equal(
    transitionDismissedDropdown(dismissed, { type: "focus" }),
    null,
    "键盘重新聚焦导航时允许菜单展开",
  );
});
