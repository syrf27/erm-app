"use client";

import { useState } from "react";
import {
  useTable,
  useCreate,
  useUpdate,
  useDelete,
  useList,
} from "@refinedev/core";
import type { CrudSort, Pagination } from "@refinedev/core";
import {
  Table,
  Button,
  TextInput,
  Textarea,
  Group,
  Stack,
  ActionIcon,
  Modal,
  Pagination as MantinePagination,
  NumberInput,
  Loader,
  Text,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconTrash, IconPlus, IconCheck, IconX } from "@tabler/icons-react";

interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  required?: boolean;
  relationResource?: string;
  relationField?: string;
  relationLabelField?: string;
}

interface CrudTableProps {
  resource: string;
}

const resourceLabels: Record<string, string> = {
  sasaran: "Sasaran",
  "proses-bisnis": "Proses Bisnis",
  "pemangku-kepentingan": "Pemangku Kepentingan",
  "peraturan-perundangan": "Peraturan Perundangan",
  "jenis-risiko": "Jenis Risiko",
  "sumber-risiko": "Sumber Risiko",
  "kategori-risiko": "Kategori Risiko",
  "area-dampak": "Area Dampak",
  "level-kemungkinan": "Level Kemungkinan",
  "level-dampak": "Level Dampak",
  "kriteria-kemungkinan": "Kriteria Kemungkinan",
  "kriteria-dampak": "Kriteria Dampak",
  "level-risiko": "Level Risiko",
  "selera-risiko": "Selera Risiko",
  "opsi-penanganan": "Opsi Penanganan",
  kri: "Key Risk Indicator",
};

const fieldConfigs: Record<string, FieldConfig[]> = {
  sasaran: [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "proses-bisnis": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "pemangku-kepentingan": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "peraturan-perundangan": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "jenis-risiko": [
    { key: "nama", label: "Nama", type: "text", required: true },
  ],
  "sumber-risiko": [
    { key: "nama", label: "Nama", type: "text", required: true },
  ],
  "kategori-risiko": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "area-dampak": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "level-kemungkinan": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "skala", label: "Skala", type: "number", required: true },
  ],
  "level-dampak": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "level-risiko": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "opsi-penanganan": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "kriteria-kemungkinan": [
    { key: "kategoriRisikoId", label: "Kategori Risiko", type: "select", required: true, relationResource: "kategori-risiko", relationField: "kategoriRisiko" },
    { key: "levelKemungkinanId", label: "Level Kemungkinan", type: "select", required: true, relationResource: "level-kemungkinan", relationField: "levelKemungkinan" },
    { key: "persentaseKemungkinan", label: "Persentase Kemungkinan", type: "number", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "kriteria-dampak": [
    { key: "kategoriRisikoId", label: "Kategori Risiko", type: "select", required: true, relationResource: "kategori-risiko", relationField: "kategoriRisiko" },
    { key: "levelDampakId", label: "Level Dampak", type: "select", required: true, relationResource: "level-dampak", relationField: "levelDampak" },
    { key: "persentaseDampak", label: "Persentase Dampak", type: "number", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  "selera-risiko": [
    { key: "kategoriRisikoId", label: "Kategori Risiko", type: "select", required: true, relationResource: "kategori-risiko", relationField: "kategoriRisiko" },
    { key: "besaranRisikoMinimum", label: "Besaran Risiko Minimum", type: "number", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  kri: [
    { key: "namaIndikator", label: "Nama Indikator", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
    { key: "batasHijau", label: "Batas Hijau", type: "number" },
    { key: "batasKuning", label: "Batas Kuning", type: "number" },
    { key: "batasMerah", label: "Batas Merah", type: "number" },
    { key: "nilaiAktual", label: "Nilai Aktual", type: "number" },
    { key: "frekuensiPemantauan", label: "Frekuensi Pemantauan", type: "text" },
    { key: "identifikasiRisikoId", label: "Risiko Terkait", type: "select", relationResource: "identifikasi-risiko", relationField: "identifikasiRisiko", relationLabelField: "risiko" },
    { key: "penanggungJawab", label: "Penanggung Jawab", type: "text" },
    { key: "targetNilaiHarapan", label: "Target/Nilai Harapan", type: "number" },
  ],
};

export function CrudTable({ resource }: CrudTableProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalKey, setModalKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const pagination: Pagination = { currentPage: 1, pageSize: 10, mode: "server" };
  const initialSort: CrudSort[] = [{ field: "id", order: "asc" }];

  const {
    result,
    currentPage,
    setCurrentPage,
    pageSize,
    tableQuery,
  } = useTable({
    resource,
    pagination,
    sorters: { initial: initialSort },
  });

  const { mutate: createMutate, mutation: { isPending: isCreating } } = useCreate();
  const { mutate: updateMutate, mutation: { isPending: isUpdating } } = useUpdate();
  const { mutate: deleteMutate, mutation: { isPending: isDeleting } } = useDelete();

  const data = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const isLoading = tableQuery?.isPending ?? false;
  const label = resourceLabels[resource] ?? resource;
  const fields = fieldConfigs[resource] ?? [];

  // Fetch relation options for select fields
  const kategoriRisikoQuery = useList({
    resource: "kategori-risiko",
    pagination: { mode: "off" },
  });
  const levelKemungkinanQuery = useList({
    resource: "level-kemungkinan",
    pagination: { mode: "off" },
  });
  const levelDampakQuery = useList({
    resource: "level-dampak",
    pagination: { mode: "off" },
  });
  const identifikasiRisikoQuery = useList({
    resource: "identifikasi-risiko",
    pagination: { mode: "off" },
  });

  const optionMap: Record<string, { value: string; label: string }[]> = {
    "kategori-risiko": (kategoriRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-kemungkinan": (levelKemungkinanQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-dampak": (levelDampakQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  };

  function getRelationOptions(relationResource?: string) {
    return relationResource ? optionMap[relationResource] ?? [] : [];
  }

  function getRelationLabel(item: any, field: FieldConfig) {
    if (field.type !== "select" || !field.relationField) return "";
    const rel = item[field.relationField];
    return rel?.[field.relationLabelField ?? "nama"] ?? "";
  }

  function openCreate() {
    setEditingItem(null);
    setModalKey((k) => k + 1);
    open();
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setModalKey((k) => k + 1);
    open();
  }

  function handleSave(formData: Record<string, any>) {
    if (editingItem) {
      updateMutate(
        { resource, id: editingItem.id, values: formData },
        {
          onSuccess: () => {
            notifications.show({
              title: "Berhasil",
              message: `${label} berhasil diperbarui`,
              color: "green",
              icon: <IconCheck size={18} />,
            });
            close();
          },
          onError: () => {
            notifications.show({
              title: "Gagal",
              message: `Gagal memperbarui ${label}`,
              color: "red",
              icon: <IconX size={18} />,
            });
          },
        },
      );
    } else {
      createMutate(
        { resource, values: formData },
        {
          onSuccess: () => {
            notifications.show({
              title: "Berhasil",
              message: `${label} berhasil ditambahkan`,
              color: "green",
              icon: <IconCheck size={18} />,
            });
            close();
          },
          onError: () => {
            notifications.show({
              title: "Gagal",
              message: `Gagal menambahkan ${label}`,
              color: "red",
              icon: <IconX size={18} />,
            });
          },
        },
      );
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutate(
      { resource, id: deleteTarget.id },
      {
        onSuccess: () => {
          notifications.show({
            title: "Berhasil",
            message: `${label} berhasil dihapus`,
            color: "green",
            icon: <IconCheck size={18} />,
          });
          setDeleteTarget(null);
        },
        onError: () => {
          notifications.show({
            title: "Gagal",
            message: `Gagal menghapus ${label}`,
            color: "red",
            icon: <IconX size={18} />,
          });
          setDeleteTarget(null);
        },
      },
    );
  }

  const isSaving = isCreating || isUpdating;

  return (
    <Stack>
      <Group justify="space-between">
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Tambah {label}
        </Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            {fields.map((f) => (
              <Table.Th key={f.key}>{f.label}</Table.Th>
            ))}
            <Table.Th w={120}>Aksi</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={fields.length + 2} ta="center">
                <Loader size="sm" />
              </Table.Td>
            </Table.Tr>
          ) : data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={fields.length + 2}>
                <Group justify="center" c="dimmed" py="md">
                  Belum ada data
                </Group>
              </Table.Td>
            </Table.Tr>
          ) : (
            data.map((item: any) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.id}</Table.Td>
                {fields.map((f) => (
                  <Table.Td key={f.key}>
                    {f.type === "select" ? getRelationLabel(item, f) : String(item[f.key] ?? "")}
                  </Table.Td>
                ))}
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => openEdit(item)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="center">
          <MantinePagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      )}

      <CrudModal
        key={modalKey}
        opened={opened}
        onClose={close}
        onSave={handleSave}
        editingItem={editingItem}
        fields={fields}
        label={label}
        loading={isSaving}
        getRelationOptions={getRelationOptions}
      />

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus"
      >
        <Stack>
          <Text size="sm">
            Apakah Anda yakin ingin menghapus <b>{deleteTarget?.nama ?? deleteTarget?.id}</b>?
          </Text>
          <Text size="sm" c="dimmed">
            Tindakan ini tidak dapat dibatalkan.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              color="red"
              onClick={confirmDelete}
              loading={isDeleting}
            >
              Hapus
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

interface CrudModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  editingItem: any;
  fields: FieldConfig[];
  label: string;
  loading: boolean;
  getRelationOptions: (relationResource?: string) => { value: string; label: string }[];
}

function CrudModal({
  opened,
  onClose,
  onSave,
  editingItem,
  fields,
  label,
  loading,
  getRelationOptions,
}: CrudModalProps) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const f of fields) {
      if (f.type === "select") {
        initial[f.key] = editingItem ? String(editingItem[f.key] ?? "") : "";
      } else {
        initial[f.key] = editingItem?.[f.key] ?? "";
      }
    }
    return initial;
  });

  const title = editingItem ? `Edit ${label}` : `Tambah ${label}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (f.type === "number") {
        data[f.key] = Number(values[f.key]);
      } else if (f.type === "select") {
        data[f.key] = Number(values[f.key]);
      } else {
        data[f.key] = values[f.key];
      }
    }
    onSave(data);
  }

  function handleChange(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <Stack>
          {fields.map((f) => {
            if (f.type === "select") {
              return (
                <Select
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  data={getRelationOptions(f.relationResource)}
                  value={values[f.key] as string}
                  onChange={(v) => handleChange(f.key, v ?? "")}
                  searchable
                  clearable
                />
              );
            }
            if (f.type === "number") {
              return (
                <NumberInput
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  value={values[f.key] as number | string}
                  onChange={(v) => handleChange(f.key, v ?? "")}
                  min={0}
                />
              );
            }
            if (f.key === "deskripsi") {
              return (
                <Textarea
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  value={values[f.key] as string}
                  onChange={(e) => handleChange(f.key, e.currentTarget.value)}
                />
              );
            }
            return (
              <TextInput
                key={f.key}
                label={f.label}
                required={f.required}
                value={values[f.key] as string}
                onChange={(e) => handleChange(f.key, e.currentTarget.value)}
              />
            );
          })}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              Simpan
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
