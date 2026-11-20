"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export function FollowUpBanner() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/risiko-lanjutan", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        if (!cancelled) setCount(Number(payload?.counts?.wajib ?? 0));
      } catch {
        // banner bersifat informatif; kegagalan tidak mengganggu halaman
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (count <= 0) return null;

  return (
    <Alert
      color="red"
      icon={<IconAlertTriangle size={16} />}
      mb="md"
      title="Tindak lanjut wajib"
    >
      Ada {count} risiko lanjutan yang wajib dilengkapi.{" "}
      <Link href="/manajemen-risiko/risiko-lanjutan">Buka daftar tindak lanjut</Link>.
    </Alert>
  );
}
