export type NavigationDropdownId = "projects" | "tools" | "knowledge";

type DropdownEvent =
  | { type: "navigate"; dropdown: NavigationDropdownId }
  | { type: "pointer-leave"; dropdown: NavigationDropdownId }
  | { type: "pointer-enter"; dropdown: NavigationDropdownId }
  | { type: "focus" };

/**
 * 站内跳转后暂时压住当前悬停菜单，避免路由切换但鼠标仍停留时菜单重新出现。
 * 鼠标离开该菜单或键盘重新进入导航后，恢复正常的 hover/focus 展开行为。
 */
export function transitionDismissedDropdown(
  current: NavigationDropdownId | null,
  event: DropdownEvent,
): NavigationDropdownId | null {
  if (event.type === "navigate") return event.dropdown;
  if (event.type === "focus") return null;
  if (event.type === "pointer-enter" && current === event.dropdown) return null;
  return current;
}
