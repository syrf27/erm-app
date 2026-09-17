import assert from "node:assert/strict";
import test from "node:test";

import {
  createFaqSchema,
  createIdentifikasiRisikoSchema,
  createRepositoriSchema,
  documentReferenceSchema,
} from "@/lib/validators";
import { getSafeDocumentHref, isSafeAppUrl } from "@/lib/safe-url";

test("URL dokumen hanya menerima protokol dan path yang aman", () => {
  assert.equal(isSafeAppUrl("https://example.com/document.pdf"), true);
  assert.equal(isSafeAppUrl("http://localhost:3000/document.pdf"), true);
  assert.equal(isSafeAppUrl("/api/uploads/document.pdf"), true);
  assert.equal(isSafeAppUrl("javascript:alert(1)"), false);
  assert.equal(isSafeAppUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeAppUrl("//evil.example/document.pdf"), false);
  assert.equal(isSafeAppUrl("/\\evil.example/document.pdf"), false);
});

test("path upload lama dinormalisasi ke endpoint upload yang aktif", () => {
  assert.equal(getSafeDocumentHref("/uploads/document.pdf"), "/api/uploads/document.pdf");
});

test("repositori menolak tautan berbahaya dan membersihkan judul", () => {
  const invalid = createRepositoriSchema.safeParse({
    title: "Dokumen",
    url: "javascript:alert(1)",
    category: "pedoman",
    tahun: 2026,
    uploader: "Administrator",
  });
  assert.equal(invalid.success, false);

  const valid = createRepositoriSchema.parse({
    title: "<b>Pedoman</b> <img src=x onerror=alert(1)>",
    url: "https://example.com/document.pdf",
    category: "pedoman",
    tahun: 2026,
    uploader: "Administrator",
  });
  assert.equal(valid.title, "Pedoman");
});

test("dokumen pendukung menolak skema data", () => {
  const result = documentReferenceSchema.safeParse({
    title: "Bukti mitigasi",
    url: "data:text/html,<script>alert(1)</script>",
  });
  assert.equal(result.success, false);
});

test("teks risiko disimpan sebagai teks biasa tanpa elemen HTML", () => {
  const result = createIdentifikasiRisikoSchema.parse({
    risiko: "<strong>Gangguan layanan</strong><script>alert(1)</script>",
    jenisRisikoId: 1,
    sumberRisikoId: 1,
    kategoriRisikoId: 1,
    areaDampakId: 1,
    tahun: 2026,
  });
  assert.equal(result.risiko, "Gangguan layanan");
});

test("FAQ mempertahankan format aman dan membuang skrip serta URL berbahaya", () => {
  const result = createFaqSchema.parse({
    question: "<strong>Bagaimana caranya?</strong>",
    answer:
      '<p onclick="alert(1)">Jawaban</p><script>alert(1)</script><a href="javascript:alert(1)">tautan</a>',
  });

  assert.match(result.question, /<strong>Bagaimana caranya\?<\/strong>/);
  assert.doesNotMatch(result.answer, /script|onclick|javascript:/i);
  assert.match(result.answer, /<p>Jawaban<\/p>/);
});
