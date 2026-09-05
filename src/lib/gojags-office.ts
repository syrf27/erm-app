const DEFAULT_GOJAGS_OFFICE_BASE_URL = "https://gojags-office.etc-nso.id";

export interface GojagsOfficeUser {
  id?: number;
  name?: string;
  avatar?: string;
}

export interface GojagsOfficeMeeting {
  id: number;
  uuid?: string;
  agenda?: string;
  tanggal?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  link?: string | null;
  pembuat?: GojagsOfficeUser | null;
  pemimpin?: GojagsOfficeUser | null;
  notulis?: GojagsOfficeUser | null;
  ruangan?: Array<{ id?: number; nama?: string }>;
  status_rapat?: { id?: number; nama?: string } | null;
  peserta?: Array<unknown>;
}

export interface NormalizedGojagsOfficeMeeting {
  id: number;
  uuid: string;
  agenda: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  pemimpin: string;
  notulis: string;
  status: string;
  ruangan: string;
  pesertaCount: number;
}

export function getGojagsOfficeConfig() {
  const apiKey = process.env.GOJAGS_OFFICE_API_KEY_RAPAT;
  const baseUrl = (process.env.GOJAGS_OFFICE_BASE_URL || DEFAULT_GOJAGS_OFFICE_BASE_URL).replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("GOJAGS_OFFICE_API_KEY_RAPAT is not configured");
  }

  return { apiKey, baseUrl };
}

export function getGojagsOfficeHeaders() {
  const { apiKey } = getGojagsOfficeConfig();

  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

export function normalizeMeeting(meeting: GojagsOfficeMeeting): NormalizedGojagsOfficeMeeting {
  return {
    id: meeting.id,
    uuid: meeting.uuid || "",
    agenda: meeting.agenda || "Tanpa agenda",
    tanggal: meeting.tanggal || "",
    waktuMulai: meeting.waktu_mulai || "",
    waktuSelesai: meeting.waktu_selesai || "",
    pemimpin: meeting.pemimpin?.name || "-",
    notulis: meeting.notulis?.name || "-",
    status: meeting.status_rapat?.nama || "-",
    ruangan: meeting.ruangan?.map((room) => room.nama).filter(Boolean).join(", ") || "-",
    pesertaCount: Array.isArray(meeting.peserta) ? meeting.peserta.length : 0,
  };
}
