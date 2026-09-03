"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { useUnsavedChanges } from "@/components/admin/UnsavedChangesProvider";

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

/** 只拦截站内显式导航；外部链接仍交给浏览器。 */
export default function GuardedLink({ href, onNavigate, ...props }: Props) {
  const { dirty, pending, guardNavigation } = useUnsavedChanges();
  const target = typeof href === "string" ? href : href.pathname ?? "/";

  return (
    <Link
      href={href}
      {...props}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (!dirty && !pending) return;
        event.preventDefault();
        guardNavigation(target);
      }}
    />
  );
}
