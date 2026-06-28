"use client";

import { useState, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import {
  Stack,
  Title,
  Table,
  Card,
  Text,
  Group,
  TextInput,
  Select,
  Button,
  Badge,
  Loader,
  Center,
  ActionIcon,
  Modal,
  PasswordInput,
  SegmentedControl,
  ScrollArea,
} from "@mantine/core";
import { IconSearch, IconPlus, IconPencil, IconTrash, IconLock, IconShield } from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";

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

interface DBRole {
  id: number;
  name: string;
  permissions?: RolePermission[];
}

interface UserPermissionOverride {
  permissionId: number;
  permission: Permission;
  value: string;
}

interface DBUser {
  id: number;
  email: string;
  name: string;
  roleId: number;
  role: DBRole;
  permissions?: UserPermissionOverride[];
  password?: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const { data: identity, isPending: isIdentityLoading } = useGetIdentity<any>();
  const router = useRouter();

  // Role Guard
  useEffect(() => {
    if (!isIdentityLoading && identity && (!identity.permissions || !identity.permissions.includes("users:read"))) {
      notifications.show({
        title: "Akses Ditolak",
        message: "Anda tidak memiliki hak akses untuk membuka halaman ini.",
        color: "red",
      });
      router.push("/");
    }
  }, [identity, isIdentityLoading, router]);

  // States
  const [users, setUsers] = useState<DBUser[]>([]);
  const [dbRoles, setDbRoles] = useState<DBRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modals States
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [overridesModalOpened, setOverridesModalOpened] = useState(false);
  
  // Selected user for Edit/Delete/Overrides
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);

  // Overrides management states
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [currentOverrides, setCurrentOverrides] = useState<Record<number, string>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("0");
  const [password, setPassword] = useState("");

  const fetchAllPermissions = async () => {
    try {
      const response = await fetch("/api/permissions?_start=0&_end=1000&_sort=resource&_order=asc");
      if (response.ok) {
        const data = await response.json();
        setAllPermissions(data || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data permissions:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const _start = (page - 1) * pageSize;
      const _end = _start + pageSize;
      const response = await fetch(`/api/users?_start=${_start}&_end=${_end}&_sort=id&_order=asc`);
      
      if (!response.ok) throw new Error("Gagal mengambil data user");
      
      const totalCount = response.headers.get("x-total-count");
      const data = await response.json();
      
      setUsers(data || []);
      setTotal(Number(totalCount) || data.length || 0);
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal mengambil data user",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles?_sort=name&_order=asc");
      if (response.ok) {
        const data = await response.json();
        setDbRoles(data || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data role:", error);
    }
  };

  useEffect(() => {
    if (identity && identity.permissions && identity.permissions.includes("users:read")) {
      fetchUsers();
      fetchRoles();
      fetchAllPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, identity]);

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setRoleId(dbRoles[0]?.id?.toString() || "0");
    setPassword("");
    setAddModalOpened(true);
  };

  const handleAddUser = async () => {
    if (!name || !email || !password || !roleId || roleId === "0") {
      notifications.show({ message: "Semua kolom harus diisi", color: "orange" });
      return;
    }
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, roleId: Number(roleId), password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal menambahkan user");
      }

      notifications.show({
        title: "Berhasil",
        message: `User ${name} berhasil ditambahkan`,
        color: "green",
      });
      setAddModalOpened(false);
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal menambahkan user",
        color: "red",
      });
    }
  };

  const handleOpenEdit = (user: DBUser) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRoleId(user.roleId.toString());
    setPassword(""); // Keep blank unless updating
    setEditModalOpened(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!name || !email || !roleId || roleId === "0") {
      notifications.show({ message: "Nama, Email, dan Role harus diisi", color: "orange" });
      return;
    }

    try {
      const payload: any = { name, email, roleId: Number(roleId) };
      if (password) payload.password = password; // Only update password if filled

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal memperbarui user");
      }

      notifications.show({
        title: "Berhasil",
        message: `User ${name} berhasil diperbarui`,
        color: "green",
      });
      setEditModalOpened(false);
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal memperbarui user",
        color: "red",
      });
    }
  };

  const handleOpenDelete = (user: DBUser) => {
    setSelectedUser(user);
    setDeleteModalOpened(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal menghapus user");
      }

      notifications.show({
        title: "Berhasil",
        message: `User ${selectedUser.name} berhasil dihapus`,
        color: "green",
      });
      setDeleteModalOpened(false);
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal menghapus user",
        color: "red",
      });
    }
  };

  const handleOpenOverrides = (user: DBUser) => {
    setSelectedUser(user);
    const initialOverrides: Record<number, string> = {};
    if (user.permissions) {
      user.permissions.forEach((o) => {
        initialOverrides[o.permissionId] = o.value;
      });
    }
    setCurrentOverrides(initialOverrides);
    setResourceSearch("");
    setOverridesModalOpened(true);
  };

  const handleSaveOverrides = async () => {
    if (!selectedUser) return;
    setSavingOverrides(true);
    try {
      const overridesPayload = Object.entries(currentOverrides)
        .filter(([_, val]) => val !== "inherit")
        .map(([permId, val]) => ({
          permissionId: Number(permId),
          value: val,
        }));

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: overridesPayload }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal menyimpan permission overrides");
      }

      notifications.show({
        title: "Berhasil",
        message: `Permission overrides untuk user ${selectedUser.name} berhasil diperbarui`,
        color: "green",
      });
      setOverridesModalOpened(false);
      fetchUsers();
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error.message || "Gagal menyimpan permission overrides",
        color: "red",
      });
    } finally {
      setSavingOverrides(false);
    }
  };

  // Search logic client-side
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.role?.name || "").toLowerCase().includes(search)
    );
  });

  const resources = Array.from(new Set(allPermissions.map((p) => p.resource)));
  const filteredResources = resources.filter((res) =>
    res.toLowerCase().includes(resourceSearch.toLowerCase())
  );

  if (isIdentityLoading || (identity && (!identity.permissions || !identity.permissions.includes("users:read")))) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>User Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAdd}>
          Tambah User
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            placeholder="Cari user berdasarkan Nama, Email, atau Role..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />

          {loading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : (
            <>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 60, textAlign: "center" }}>ID</Table.Th>
                    <Table.Th>Nama</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th style={{ width: 120, textAlign: "center" }}>Role</Table.Th>
                    <Table.Th style={{ width: 180 }}>Dibuat Pada</Table.Th>
                    <Table.Th style={{ width: 140, textAlign: "center" }}>Aksi</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredUsers.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6} align="center" style={{ color: "var(--mantine-color-gray-5)", padding: "20px 0" }}>
                        Tidak ada data user.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td align="center">{user.id}</Table.Td>
                        <Table.Td style={{ fontWeight: 600 }}>{user.name}</Table.Td>
                        <Table.Td>{user.email}</Table.Td>
                        <Table.Td align="center">
                          <Badge color={user.role?.name === "admin" ? "blue" : "teal"} variant="filled">
                            {user.role?.name || "No Role"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{dayjs(user.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Table.Td>
                        <Table.Td align="center">
                          <Group gap="xs" justify="center">
                            <ActionIcon variant="subtle" color="blue" title="Edit User" onClick={() => handleOpenEdit(user)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="violet" title="Manage Permissions Override" onClick={() => handleOpenOverrides(user)}>
                              <IconShield size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" title="Hapus User" onClick={() => handleOpenDelete(user)} disabled={user.email === identity.email}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>

              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                showSizeChanger
                showTotal
              />
            </>
          )}
        </Stack>
      </Card>

      {/* Add User Modal */}
      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Tambah User Baru" size="sm" radius="md">
        <Stack gap="md">
          <TextInput
            label="Nama Lengkap"
            placeholder="John Doe"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            label="Email"
            placeholder="johndoe@mail.com"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Select
            label="Role"
            required
            data={dbRoles.map((r) => ({ value: r.id.toString(), label: r.name }))}
            value={roleId}
            onChange={(val) => setRoleId(val ?? "0")}
          />
          <PasswordInput
            label="Password"
            placeholder="********"
            required
            leftSection={<IconLock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleAddUser}>
              Simpan User
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={editModalOpened} onClose={() => setEditModalOpened(false)} title="Edit User" size="sm" radius="md">
        <Stack gap="md">
          <TextInput
            label="Nama Lengkap"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            label="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Select
            label="Role"
            required
            data={dbRoles.map((r) => ({ value: r.id.toString(), label: r.name }))}
            value={roleId}
            onChange={(val) => setRoleId(val ?? "0")}
            disabled={selectedUser?.email === identity?.email}
          />
          <PasswordInput
            label="Ubah Password (Kosongkan jika tidak diubah)"
            placeholder="********"
            leftSection={<IconLock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleEditUser}>
              Simpan Perubahan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal opened={deleteModalOpened} onClose={() => setDeleteModalOpened(false)} title="Hapus User" size="sm" radius="md">
        <Stack gap="md">
          <Text size="sm">Apakah Anda yakin ingin menghapus user <b>{selectedUser?.name}</b> ({selectedUser?.email})?</Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
              Batal
            </Button>
            <Button color="red" onClick={handleDeleteUser}>
              Hapus User
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Manage Overrides Modal */}
      <Modal
        opened={overridesModalOpened}
        onClose={() => setOverridesModalOpened(false)}
        title={
          <Stack gap={2}>
            <Text fw={700} size="lg">Manage Permissions Override</Text>
            <Text size="xs" c="dimmed">User: {selectedUser?.name} ({selectedUser?.email}) | Role: {selectedUser?.role?.name}</Text>
          </Stack>
        }
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          <TextInput
            placeholder="Cari resource/scope..."
            leftSection={<IconSearch size={16} />}
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.currentTarget.value)}
          />

          <ScrollArea style={{ height: 400 }}>
            <Table striped highlightOnHover withTableBorder style={{ fontSize: 13 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: "30%" }}>Resource / Scope</Table.Th>
                  <Table.Th style={{ textAlign: "center", width: "70%" }}>Permission Overrides</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredResources.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={2} align="center" style={{ color: "var(--mantine-color-gray-5)", padding: "20px 0" }}>
                      Tidak ada resource yang cocok.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredResources.map((res) => {
                    const actionsList = ["create", "read", "update", "delete"];
                    return (
                      <Table.Tr key={res}>
                        <Table.Td style={{ fontWeight: 600, textTransform: "capitalize" }}>
                          {res}
                        </Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            {actionsList.map((act) => {
                              const perm = allPermissions.find(p => p.resource === res && p.action === act);
                              if (!perm) return null;

                              const hasRolePerm = selectedUser?.role?.permissions?.some(
                                rp => rp.permissionId === perm.id
                              ) || false;

                              // If the user's role is admin, they implicitly have all permissions
                              const inheritedAllowed = selectedUser?.role?.name === "admin" || hasRolePerm;

                              const val = currentOverrides[perm.id] || "inherit";

                              return (
                                <Group key={act} justify="space-between" wrap="nowrap" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)", paddingBottom: 4 }}>
                                  <Text size="xs" fw={500} style={{ textTransform: "capitalize" }}>
                                    {act}
                                  </Text>
                                  <SegmentedControl
                                    size="xs"
                                    data={[
                                      { label: `Inherit (${inheritedAllowed ? "Allow" : "Deny"})`, value: "inherit" },
                                      { label: "Grant", value: "grant" },
                                      { label: "Deny", value: "deny" },
                                    ]}
                                    value={val}
                                    onChange={(newVal) => {
                                      setCurrentOverrides(prev => ({
                                        ...prev,
                                        [perm.id]: newVal
                                      }));
                                    }}
                                  />
                                </Group>
                              );
                            })}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOverridesModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveOverrides} loading={savingOverrides}>
              Simpan Overrides
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
