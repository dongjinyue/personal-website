"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type UnsavedContextValue = {
  dirty: boolean;
  pending: boolean;
  setFormState: (state: { dirty: boolean; pending: boolean }) => void;
  guardAction: (action: () => void) => void;
  guardNavigation: (href: string) => void;
};

const UnsavedContext = createContext<UnsavedContextValue | null>(null);

export function useUnsavedChanges() {
  const value = useContext(UnsavedContext);
  if (!value) throw new Error("useUnsavedChanges 必须在 Provider 内使用。");
  return value;
}

/** 统一管理工具表单的未保存状态和显式离开入口。 */
export default function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [formState, setFormState] = useState({ dirty: false, pending: false });
  const [queuedAction, setQueuedAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!formState.dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [formState.dirty]);

  const guardAction = useCallback((action: () => void) => {
    if (formState.pending) return;
    if (!formState.dirty) {
      action();
      return;
    }
    setQueuedAction(() => action);
  }, [formState]);

  const guardNavigation = useCallback((href: string) => {
    guardAction(() => router.push(href));
  }, [guardAction, router]);

  const contextValue = useMemo(() => ({
    dirty: formState.dirty,
    pending: formState.pending,
    setFormState,
    guardAction,
    guardNavigation,
  }), [formState, guardAction, guardNavigation]);

  return (
    <UnsavedContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        open={Boolean(queuedAction)}
        title="放弃未保存的修改？"
        description="有未保存的修改，离开会丢失这些内容。"
        confirmLabel="放弃修改并离开"
        onCancel={() => setQueuedAction(null)}
        onConfirm={() => {
          const action = queuedAction;
          setQueuedAction(null);
          setFormState({ dirty: false, pending: false });
          action?.();
        }}
      />
    </UnsavedContext.Provider>
  );
}
