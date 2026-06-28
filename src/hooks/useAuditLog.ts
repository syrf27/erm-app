"use client";

import { useCallback } from "react";
import { useGetIdentity } from "@refinedev/core";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "DOWNLOAD"
  | "UPLOAD"
  | "APPROVE"
  | "REJECT";

interface LogParams {
  action: AuditAction;
  resource: string;
  resourceId?: string | number;
  details?: any;
}

export function useAuditLog() {
  const { data: identity } = useGetIdentity<{
    name: string;
    email: string;
  }>();

  const log = useCallback(
    async (params: LogParams) => {
      if (!identity) return;

      try {
        const logData = {
          userId: identity.email,
          userName: identity.name,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId?.toString(),
          details: params.details,
        };

        // Send audit log to backend
        await fetch("/api/audit-logs/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logData),
        });
      } catch (error) {
        console.error("Failed to log audit:", error);
        // Don't throw - audit logging should not break the app
      }
    },
    [identity]
  );

  return { log };
}
