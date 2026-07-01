"use client";

import { useState, useEffect, useMemo } from "react";
import { useGetIdentity } from "@refinedev/core";
import { notifications } from "@mantine/notifications";
import {
  Stack,
  Title,
  Card,
  Text,
  Group,
  Button,
  ActionIcon,
  Modal,
  Accordion,
  Loader,
  Center,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { IconPlus, IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export default function FaqPage() {
  const { data: identity, isPending: isIdentityLoading } = useGetIdentity<any>();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const permissions = useMemo(() => identity?.permissions || [], [identity]);
  const canCreate = permissions.includes("faq:create");
  const canUpdate = permissions.includes("faq:update");
  const canDelete = permissions.includes("faq:delete");

  const questionEditor = useEditor({
    extensions: [StarterKit, Underline, LinkExtension.configure({ openOnClick: false })],
    content: "",
    immediatelyRender: false,
  });

  const answerEditor = useEditor({
    extensions: [StarterKit, Underline, LinkExtension.configure({ openOnClick: false })],
    content: "",
    immediatelyRender: false,
  });

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faq?_start=0&_end=1000&_sort=id&_order=asc");
      if (!res.ok) throw new Error("Gagal mengambil data FAQ");
      const data = await res.json();
      setFaqs(data || []);
    } catch (err: any) {
      notifications.show({
        title: "Gagal",
        message: err.message || "Gagal memuat FAQ",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isIdentityLoading) fetchFaqs();
  }, [isIdentityLoading]);

  const resetEditorContent = (question: string, answer: string) => {
    if (questionEditor) questionEditor.commands.setContent(question || "");
    if (answerEditor) answerEditor.commands.setContent(answer || "");
  };

  const openCreate = () => {
    setEditingItem(null);
    resetEditorContent("", "");
    setModalOpened(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditingItem(item);
    resetEditorContent(item.question, item.answer);
    setModalOpened(true);
  };

  const handleSave = async () => {
    const questionHtml = questionEditor?.getHTML() || "";
    const answerHtml = answerEditor?.getHTML() || "";
    const questionText = questionEditor?.getText() || "";
    const answerText = answerEditor?.getText() || "";

    if (!questionText.trim() || !answerText.trim()) {
      notifications.show({ message: "Pertanyaan dan jawaban harus diisi", color: "orange" });
      return;
    }

    setSaving(true);
    try {
      const body = { question: questionHtml, answer: answerHtml };
      const url = editingItem ? `/api/faq/${editingItem.id}` : "/api/faq";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan FAQ");
      }

      notifications.show({
        title: "Berhasil",
        message: editingItem ? "FAQ berhasil diperbarui" : "FAQ berhasil ditambahkan",
        color: "green",
      });
      setModalOpened(false);
      fetchFaqs();
    } catch (err: any) {
      notifications.show({
        title: "Gagal",
        message: err.message || "Gagal menyimpan FAQ",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/faq/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus FAQ");
      }
      notifications.show({
        title: "Berhasil",
        message: "FAQ berhasil dihapus",
        color: "green",
      });
      setDeleteTarget(null);
      fetchFaqs();
    } catch (err: any) {
      notifications.show({
        title: "Gagal",
        message: err.message || "Gagal menghapus FAQ",
        color: "red",
      });
    }
  };

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return faqs;
    const search = searchTerm.toLowerCase();
    return faqs.filter((faq) => {
      const qText = stripHtml(faq.question).toLowerCase();
      const aText = stripHtml(faq.answer).toLowerCase();
      return qText.includes(search) || aText.includes(search);
    });
  }, [faqs, searchTerm]);

  const totalFiltered = filteredFaqs.length;
  const paginatedFaqs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFaqs.slice(start, start + pageSize);
  }, [filteredFaqs, page, pageSize]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (isIdentityLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>FAQ</Title>
        {canCreate && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Tambah FAQ
          </Button>
        )}
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            placeholder="Cari pertanyaan atau jawaban..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.currentTarget.value);
              setPage(1);
            }}
          />

          {loading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : paginatedFaqs.length === 0 ? (
            <Center h={150}>
              <Text c="dimmed" size="sm">
                {searchTerm ? "Tidak ada hasil yang cocok." : "Belum ada data FAQ."}
              </Text>
            </Center>
          ) : (
            <Accordion variant="separated" radius="md" multiple>
              {paginatedFaqs.map((faq) => (
                <Accordion.Item key={faq.id} value={String(faq.id)}>
                  <Accordion.Control>
                    <Text fw={600} lineClamp={1} dangerouslySetInnerHTML={{ __html: faq.question }} />
                  </Accordion.Control>
                  <Accordion.Panel>
                    <div
                      className="tiptap-content"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                      style={{ lineHeight: 1.7, color: "var(--mantine-color-dimmed)" }}
                    />
                    {(canUpdate || canDelete) && (
                      <Group gap="xs" mt="lg" pt="md" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
                        {canUpdate && (
                          <Tooltip label="Edit FAQ">
                            <ActionIcon variant="light" color="blue" size="md" onClick={() => openEdit(faq)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip label="Hapus FAQ">
                            <ActionIcon variant="light" color="red" size="md" onClick={() => setDeleteTarget(faq)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}

          {totalFiltered > 0 && (
            <Pagination
              current={page}
              total={totalFiltered}
              pageSize={pageSize}
              onChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              showSizeChanger
              showTotal
            />
          )}
        </Stack>
      </Card>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingItem ? "Edit FAQ" : "Tambah FAQ"}
        size="xl"
        radius="md"
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb={4}>
              Pertanyaan <span style={{ color: "red" }}>*</span>
            </Text>
            <RichTextEditor editor={questionEditor} style={{ border: "1px solid var(--mantine-color-gray-3)" }}>
              <RichTextEditor.Toolbar sticky stickyOffset={0}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.Underline />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content style={{ minHeight: 60 }} />
            </RichTextEditor>
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>
              Jawaban <span style={{ color: "red" }}>*</span>
            </Text>
            <RichTextEditor editor={answerEditor} style={{ border: "1px solid var(--mantine-color-gray-3)" }}>
              <RichTextEditor.Toolbar sticky stickyOffset={0}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.Underline />
                  <RichTextEditor.Strikethrough />
                  <RichTextEditor.ClearFormatting />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.H1 />
                  <RichTextEditor.H2 />
                  <RichTextEditor.H3 />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.BulletList />
                  <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Link />
                  <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content style={{ minHeight: 200 }} />
            </RichTextEditor>
          </div>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Simpan
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">Apakah Anda yakin ingin menghapus FAQ berikut?</Text>
          {deleteTarget && (
            <Card withBorder padding="sm" radius="sm" bg="gray.0">
              <Text size="sm" fw={500} lineClamp={2} dangerouslySetInnerHTML={{ __html: deleteTarget.question }} />
            </Card>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button color="red" onClick={handleDelete}>
              Hapus
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
