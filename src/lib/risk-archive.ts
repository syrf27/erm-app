import { prisma } from "@/lib/prisma";
import { resourceMap } from "@/lib/resource-map";

export const RISK_LINKED_RESOURCES = new Set([
  "analisis-risiko",
  "evaluasi-risiko",
  "rencana-penanganan",
  "kri",
]);

/**
 * Memeriksa apakah record yang akan dibaca/diubah merupakan bagian dari
 * risiko yang sudah diarsipkan. Pemeriksaan dilakukan di server agar arsip
 * tidak dapat dilewati lewat request langsung atau batch spreadsheet.
 */
export async function referencesArchivedRisk(
  resource: string,
  options: { riskIds?: number[]; recordIds?: number[] }
) {
  const riskIds = new Set(
    (options.riskIds ?? []).filter((id) => Number.isInteger(id) && id > 0)
  );
  const recordIds = (options.recordIds ?? []).filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (resource === "identifikasi-risiko") {
    recordIds.forEach((id) => riskIds.add(id));
  } else if (RISK_LINKED_RESOURCES.has(resource) && recordIds.length > 0) {
    const modelName = resourceMap[resource];
    const delegate = modelName ? (prisma as any)[modelName] : null;
    if (delegate) {
      const records = await delegate.findMany({
        where: { id: { in: recordIds } },
        select: { identifikasiRisikoId: true },
      });
      records.forEach((record: { identifikasiRisikoId?: number | null }) => {
        if (record.identifikasiRisikoId) riskIds.add(record.identifikasiRisikoId);
      });
    }
  }

  if (riskIds.size === 0) return false;

  const archivedCount = await prisma.identifikasiRisiko.count({
    where: {
      id: { in: Array.from(riskIds) },
      archivedAt: { not: null },
    },
  });
  return archivedCount > 0;
}
