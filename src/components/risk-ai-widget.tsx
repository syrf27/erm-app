"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function RiskAiWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const openAssistant = () => {
    if (pathname === "/manajemen-risiko/identifikasi") {
      window.dispatchEvent(new CustomEvent("open-risk-ai-assistant"));
    } else {
      router.push("/manajemen-risiko/identifikasi?openAiAssist=1");
    }
  };
  useEffect(() => {
    window.addEventListener("open-risk-ai-widget", openAssistant);
    return () => window.removeEventListener("open-risk-ai-widget", openAssistant);
  });

  return null;
}
