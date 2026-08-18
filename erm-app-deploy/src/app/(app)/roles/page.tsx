"use client";

import { useState, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Pagination } from "@/components/pagination";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import {
  Stack,
  Title,
  Table,
  Card,
  Text,
  Group,
  Button,
  Badge,
  Loader,
  Center,
  Checkbox,
  ScrollArea,
  ActionIcon,
  Modal,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

interface Permission {
  id: number;
  resource: string;
  action: string;
}

interface RolePermission {
  roleId: number;
  permissionId: number;
  permission: Permission;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: RolePermission[];
}

export default function RolesManagementPage() {
  const { data: identity, isPending: isIdentityLoading } = useGetIdentity<any>();
  const router = useRouter();

  // Role Guard
  useEffect(() => {
    if (!isIdentityLoading && identity && (!identity.permissions || !identity.permissions.includes("roles:read"))) {
      notifications.show({
        title: "Akses Ditolak",
        message: "Anda tidak memiliki hak akses untuk membuka halaman ini.",
        color: "red",
      });
      router.push("/");
    }
  }, [identity, isIdentityLoading, router]);

  // Data states
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states for permissions matrix
  const [pages, setPages] = useState<Record<number, number>>({});
  const pageSize = 10;
  const getPage = (roleId: number) => pages[roleId] || 1;
  const setRolePage = (roleId: number, p: number) =>
    setPages((prev) => ({ ...prev, [roleId]: p }));

  // Modal states
  const [addRoleOpened, setAddRoleOpened] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Load roles & permissions
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles?_sort=id&_order=asc"),
        // Load all permissions to construct resource listing, but we will chunk/paginate it on client side
        fetch("/api/permissions?_start=0&_end=1000&_sort=resource&_order=asc"),
      ]);

      if (!rolesRes.ok || !permsRes.ok) {
        throw new Error("Gagal mengambil data dari server");
      }

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      setRoles(rolesData || []);
      setPermissions(permsData || []);
    } catch (error: any) {
      notifications.show({
        title: "Gagal memuat data",
        message: error.message || "Gagal mengambil data Roles dan Permissions",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (identity && identity.permissions && identity.permissions.includes("roles:read")) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  // Unique resources (scopes)
  const resources = Array.from(new Set(permissions.map((p) => p.resource)));
  const actions = ["create", "read", "update", "delete"];

  // Paginated resources list
  const totalResources = resources.length;

  // Helper to check if role has permission
  const hasPermission = (role: Role, resource: string, action: string) => {
    return role.permissions.some(
      (rp) => rp.permission.resource === resource && rp.permission.action === action
    );
  };

  // Toggle permission mapping
  const handleTogglePermission = async (role: Role, resource: string, action: string, checked: boolean) => {
    // Find permission ID
    const perm = permissions.find((p) => p.resource === resource && p.action === action);
    if (!perm) return;

    try {
      let updatedRolePerms = [...role.permissions];
      if (checked) {
        // Add locally first
        const mockRolePerm: RolePermission = {
          roleId: role.id,
          permissionId: perm.id,
          permission: perm,
        };
        updatedRolePerms.push(mockRolePerm);
      } else {
        // Remove locally first
        updatedRolePerms = updatedRolePerms.filter((rp) => rp.permissionId !== perm.id);
      }

      // Update state immediately for rapid feedback
      setRoles(roles.map((r) => (r.id === role.id ? { ...r, permissions: updatedRolePerms } : r)));

      // Send to server
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: updatedRolePerms.map((rp) => rp.permissionId),
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengupdate permission role");
      }

      notifications.show({
        title: "Berhasil",
        message: `Izin ${resource}:${action} untuk role ${role.name} berhasil diperbarui`,
        color: "green",
      });
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error.message || "Gagal mengupdate permission role",
        color: "red",
      });
      // Revert fetch to stay sync'ed
      fetchData();
    }
  };

  // Create role
  const handleCreateRole = async () => {
    if (!newRoleName) {
      notifications.show({ message: "Nama role harus diisi", color: "orange" });
      return;
    }
    setIsSubmittingRole(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.toLowerCase(), description: newRoleDesc }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal membuat role");
      }

      notifications.show({
        title: "Berhasil",
        message: `Role ${newRoleName} berhasil dibuat`,
        color: "green",
      });
      setAddRoleOpened(false);
      setNewRoleName("");
      setNewRoleDesc("");
      fetchData();
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error.message || "Gagal membuat role",
        color: "red",
      });
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (role: Role) => {
    if (role.name === "admin") {
      notifications.show({ message: "Role admin tidak dapat dihapus", color: "red" });
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus role "${role.name}"?`)) {
      try {
        const response = await fetch(`/api/roles/${role.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Gagal menghapus role");
        }

        notifications.show({
          title: "Berhasil",
          message: `Role ${role.name} berhasil dihapus`,
          color: "green",
        });
        fetchData();
      } catch (error: any) {
        notifications.show({
          title: "Gagal",
          message: error.message || "Gagal menghapus role",
          color: "red",
        });
      }
    }
  };

  if (isIdentityLoading || (identity && (!identity.permissions || !identity.permissions.includes("roles:read")))) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Role & Access Control Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddRoleOpened(true)}>
          Tambah Role Baru
        </Button>
      </Group>

      {loading ? (
        <Center h={300}>
          <Loader />
        </Center>
      ) : (
        <Stack gap="xl">
          {roles.map((role) => {
            const currentPage = getPage(role.id);
            const roleResources = resources.slice(
              (currentPage - 1) * pageSize,
              currentPage * pageSize
            );
            return (
            <Card key={role.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Title order={4} style={{ textTransform: "capitalize" }}>
                        {role.name}
                      </Title>
                      <Badge color={role.name === "admin" ? "blue" : "teal"} variant="light">
                        ID: {role.id}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {role.description || "Tidak ada deskripsi."}
                    </Text>
                  </Stack>
                  {role.name !== "admin" && (
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteRole(role)} title="Hapus Role">
                      <IconTrash size={18} />
                    </ActionIcon>
                  )}
                </Group>

                {role.name === "admin" ? (
                  <Text size="sm" fw={500} c="blue">
                    * Role Administrator secara default memiliki hak akses penuh ke seluruh scope dan action.
                  </Text>
                ) : (
                  <Stack gap="sm">
                    <ScrollArea style={{ width: "100%" }}>
                      <Table striped highlightOnHover withTableBorder style={{ fontSize: 13, minWidth: 600 }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: "40%" }}>Resource / Scope</Table.Th>
                            <Table.Th style={{ textAlign: "center", width: "15%" }}>Create</Table.Th>
                            <Table.Th style={{ textAlign: "center", width: "15%" }}>Read</Table.Th>
                            <Table.Th style={{ textAlign: "center", width: "15%" }}>Update</Table.Th>
                            <Table.Th style={{ textAlign: "center", width: "15%" }}>Delete</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {roleResources.map((res) => (
                            <Table.Tr key={res}>
                              <Table.Td style={{ fontWeight: 600 }}>{res}</Table.Td>
                              {actions.map((act) => {
                                const active = hasPermission(role, res, act);
                                return (
                                  <Table.Td key={act} style={{ textAlign: "center" }}>
                                    <Center>
                                      <Checkbox
                                        checked={active}
                                        onChange={(e) =>
                                          handleTogglePermission(
                                            role,
                                            res,
                                            act,
                                            e.currentTarget.checked
                                          )
                                        }
                                      />
                                    </Center>
                                  </Table.Td>
                                );
                              })}
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                    {totalResources > pageSize && (
                      <div style={{ marginTop: 16 }}>
                        <Pagination
                          current={currentPage}
                          total={totalResources}
                          pageSize={pageSize}
                          showSizeChanger={false}
                          onChange={(p) => setRolePage(role.id, p)}
                          totalText={(t, [st, en]) => `Menampilkan ${st}-${en} dari ${t} scope`}
                        />
                      </div>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
            );
          })}
        </Stack>
      )}

      {/* Add Role Modal */}
      <Modal opened={addRoleOpened} onClose={() => setAddRoleOpened(false)} title="Tambah Role Baru" size="sm" radius="md">
        <Stack gap="md">
          <TextInput
            label="Nama Role"
            placeholder="e.g. supervisor, staff"
            required
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.currentTarget.value)}
          />
          <TextInput
            label="Deskripsi"
            placeholder="Keterangan mengenai fungsi role ini..."
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setAddRoleOpened(false)} disabled={isSubmittingRole}>
              Batal
            </Button>
            <Button onClick={handleCreateRole} loading={isSubmittingRole}>
              Simpan Role
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
