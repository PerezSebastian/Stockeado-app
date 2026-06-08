"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChatLauncher } from "@/components/chat/chat-launcher";

export function ChatLauncherGate() {
  const pathname = usePathname();
  const shouldRenderLauncher = !pathname.startsWith("/dashboard/assistant");

  useEffect(() => {
    const { body } = document;

    if (shouldRenderLauncher) {
      body.dataset.assistantLauncherSafeArea = "true";
      return () => {
        delete body.dataset.assistantLauncherSafeArea;
      };
    }

    delete body.dataset.assistantLauncherSafeArea;

    return () => {
      delete body.dataset.assistantLauncherSafeArea;
    };
  }, [shouldRenderLauncher]);

  if (!shouldRenderLauncher) {
    return null;
  }

  return <ChatLauncher />;
}
