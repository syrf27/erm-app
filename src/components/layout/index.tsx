"use client";

import { useLogout, useGetIdentity } from "@refinedev/core";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useEffect, useState, useCallback, type PropsWithChildren } from "react";

import {
  AppShell,
  Group,
  NavLink,
  Title,
  Modal,
  Button,
  Text,
  Stack,
  ActionIcon,
  Avatar,
  Menu,
  Tooltip,
  Box,
  useMantineColorScheme,
  Popover,
  Indicator,
  ScrollArea,
  Divider,
  UnstyledButton,
  Card,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDashboard,
  IconLogout,
  IconActivity,
  IconTargetArrow,
  IconQuestionMark,
  IconChartBar,
  IconFolders,
  IconSettings,
  IconListSearch,
  IconCalculator,
  IconScale,
  IconFileCheck,
  IconHeartRateMonitor,
  IconSun,
  IconMoon,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMenu2,
  IconFileAnalytics,
  IconUsers,
  IconLibrary,
  IconShieldCheck,
  IconDatabase,
  IconRoute,
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconCheck,
} from "@tabler/icons-react";
import { Breadcrumb } from "../breadcrumb";
import { YearProvider, useYear } from "@/lib/year-context";
import { YearFilter } from "@/components/YearFilter";
import { useFcm } from "@/hooks/useFcm";
import { WelcomeTour } from "@/components/tour/WelcomeTour";

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  dataTour?: string;
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <IconDashboard size={18} />,
    href: "/",
    dataTour: "nav-dashboard",
  },
  {
    label: "Manajemen Risiko",
    icon: <IconFolders size={18} />,
    dataTour: "nav-manajemen-risiko",
    children: [
      {
        label: "Penetapan Konteks",
        icon: <IconLibrary size={16} />,
        href: "/manajemen-risiko/penetapan-konteks",
      },
      {
        label: "Identifikasi Risiko",
        icon: <IconListSearch size={16} />,
        href: "/manajemen-risiko/identifikasi",
      },
      {
        label: "Analisis Risiko",
        icon: <IconCalculator size={16} />,
        href: "/manajemen-risiko/analisis",
      },
      {
        label: "Evaluasi Risiko",
        icon: <IconScale size={16} />,
        href: "/manajemen-risiko/evaluasi",
      },
      {
        label: "Rencana Penanganan",
        icon: <IconFileCheck size={16} />,
        href: "/manajemen-risiko/rencana",
      },
      {
        label: "Matriks Risiko",
        icon: <IconHeartRateMonitor size={16} />,
        href: "/manajemen-risiko/matriks-risiko",
      },
    ],
  },
  {
    label: "Pemantauan Risiko",
    icon: <IconActivity size={18} />,
    href: "/pemantauan-risiko",
    dataTour: "nav-pemantauan-risiko",
  },
  // {
  //   label: "KRI",
  //   icon: <IconChartBar size={18} />,
  //   href: "/kri",
  // },
  {
    label: "Pelaporan Risiko",
    icon: <IconTargetArrow size={18} />,
    href: "/pelaporan-risiko",
  },
  {
    label: "Bank Risiko",
    icon: <IconDatabase size={18} />,
    href: "/bank-risiko",
    dataTour: "nav-bank-risiko",
  },
  {
    label: "Repositori Dokumen",
    icon: <IconFolders size={18} />,
    href: "/repositori",
    dataTour: "nav-repositori",
  },
  {
    label: "Audit Log",
    icon: <IconFileAnalytics size={18} />,
    href: "/audit-log",
  },
  {
    label: "Manajemen Akses",
    icon: <IconShieldCheck size={18} />,
    children: [
      {
        label: "Pusat Notifikasi",
        icon: <IconBell size={16} />,
        href: "/notification-center",
      },
      {
        label: "Pengguna",
        icon: <IconUsers size={16} />,
        href: "/users",
      },
      {
        label: "Role Permissions",
        icon: <IconSettings size={16} />,
        href: "/roles",
      },
    ],
  },
  {
    label: "FAQ",
    icon: <IconQuestionMark size={18} />,
    href: "/faq",
  },
];

function renderNavItems(items: MenuItem[], pathname: string, depth = 0) {
  return items.map((item) => {
    const isActive = item.href
      ? pathname === item.href || pathname.startsWith(item.href + "/")
      : false;

    if (item.children) {
      return (
        <NavLink
          key={item.label}
          label={item.label}
          leftSection={item.icon}
          data-tour={item.dataTour}
          defaultOpened={
            pathname.startsWith("/manajemen-risiko") ||
            item.children.some((child) =>
              child.href
                ? pathname === child.href ||
                  pathname.startsWith(child.href + "/")
                : false
            )
          }
          childrenOffset={depth === 0 ? 16 : 8}
        >
          {renderNavItems(item.children, pathname, depth + 1)}
        </NavLink>
      );
    }

    if (!item.href) return null;

    return (
      <NavLink
        key={item.label}
        label={item.label}
        leftSection={item.icon}
        href={item.href}
        active={isActive}
        component={Link}
        data-tour={item.dataTour}
      />
    );
  });
}

function renderMiniNavItems(items: MenuItem[], pathname: string) {
  return items.flatMap((item) => {
    const isActive = item.href
      ? pathname === item.href || pathname.startsWith(item.href + "/")
      : false;

    if (item.children) {
      return item.children
        .filter((c) => c.href)
        .map((child) => (
          <Tooltip key={child.label} label={child.label} position="right">
            <ActionIcon
              component={Link}
              href={child.href!}
              variant={
                pathname === child.href || pathname.startsWith(child.href + "/")
                  ? "light"
                  : "subtle"
              }
              color={
                pathname === child.href || pathname.startsWith(child.href + "/")
                  ? "blue"
                  : "gray"
              }
              size="lg"
              aria-label={child.label}
            >
              {child.icon}
            </ActionIcon>
          </Tooltip>
        ));
    }

    if (!item.href) return [];

    return (
      <Tooltip key={item.label} label={item.label} position="right">
        <ActionIcon
          component={Link}
          href={item.href}
          variant={isActive ? "light" : "subtle"}
          color={isActive ? "blue" : "gray"}
          size="lg"
          aria-label={item.label}
        >
          {item.icon}
        </ActionIcon>
      </Tooltip>
    );
  });
}

function LayoutContent({ children }: PropsWithChildren) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, open: openDesktop }] = useDisclosure(true);
  const [logoutOpened, { open: openLogout, close: closeLogout }] = useDisclosure(false);
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: identity } = useGetIdentity<any>();
  const { permissionStatus, enableNotifications } = useFcm(identity);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { tahunDari, tahunSampai, setTahunDari, setTahunSampai } = useYear();
  const [mounted, setMounted] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/custom-notifications");
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch("/api/custom-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotificationsList((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/custom-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      if (res.ok) {
        setNotificationsList([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (identity) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [identity]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredMenuItems = useMemo(() => {
    const permissions = identity?.permissions || [];
    return menuItems
      .filter((item) => {
        if (item.href === "/audit-log") {
          return permissions.includes("audit-logs:read");
        }
        return true;
      })
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.href === "/users") {
              return permissions.includes("users:read");
            }
            if (child.href === "/roles") {
              return permissions.includes("roles:read");
            }
            if (child.href === "/notification-center") {
              return permissions.includes("users:update");
            }
            return true;
          });
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter((item) => !item.children || item.children.length > 0);
  }, [identity]);

  const handleTourBeforeStart = useCallback(() => {
    if (!desktopOpened) openDesktop();
  }, [desktopOpened]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: desktopOpened ? 280 : 60,
        breakpoint: "sm",
        collapsed: { desktop: false, mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            {/* Logo and Title */}
            <Image
              src="/gojags.png"
              alt="gojags risk logo"
              width={36}
              height={36}
              priority
            />
            <Title order={4} style={{ letterSpacing: 0.5 }}>Risk</Title>

            {/* Mobile toggle */}
            <ActionIcon
              onClick={toggleMobile}
              hiddenFrom="sm"
              variant="subtle"
              size="lg"
              aria-label="Toggle mobile menu"
            >
              <IconMenu2 size={20} />
            </ActionIcon>

            {/* Desktop toggle */}
            <Tooltip
              label={desktopOpened ? "Collapse sidebar" : "Expand sidebar"}
              position="bottom"
            >
              <ActionIcon
                onClick={toggleDesktop}
                visibleFrom="sm"
                variant="subtle"
                size="lg"
                aria-label="Toggle sidebar"
              >
                {desktopOpened ? (
                  <IconLayoutSidebarLeftCollapse size={20} />
                ) : (
                  <IconLayoutSidebarLeftExpand size={20} />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>    

          <Group gap="sm">
            {mounted && (
              <Group gap="xs">
                {/* 1. Push Notifikasi Browser Toggle */}
                <Tooltip
                  label={permissionStatus === "granted" ? "Push Notifikasi Browser: Aktif" : "Aktifkan Push Notifikasi Browser"}
                >
                  <ActionIcon
                    variant="light"
                    size="lg"
                    color={permissionStatus === "granted" ? "blue" : "gray"}
                    onClick={() => enableNotifications()}
                    aria-label="Toggle browser push notifications"
                  >
                    {permissionStatus === "granted" ? <IconBellRinging size={18} /> : <IconBellOff size={18} />}
                  </ActionIcon>
                </Tooltip>

                {/* 2. In-App Notification Center Dropdown */}
                <Popover width={350} position="bottom-end" withArrow shadow="md">
                  <Popover.Target>
                    <UnstyledButton style={{ display: "inline-flex" }}>
                      <Indicator
                        label={notificationsList.length}
                        size={16}
                        color="red"
                        offset={2}
                        disabled={notificationsList.length === 0}
                      >
                        <ActionIcon variant="light" size="lg" color="gray" aria-label="Notifikasi" data-tour="tour-notifikasi">
                          <IconBell size={18} />
                        </ActionIcon>
                      </Indicator>
                    </UnstyledButton>
                  </Popover.Target>
                  <Popover.Dropdown p="xs">
                    <Stack gap="xs">
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={700}>Notifikasi</Text>
                        {notificationsList.length > 0 && (
                          <Button variant="subtle" size="compact-xs" onClick={markAllAsRead} style={{ height: 20, fontSize: 10 }}>
                            Tandai semua dibaca
                          </Button>
                        )}
                      </Group>
                      <Divider />
                      {notificationsList.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center" py="md">Tidak ada notifikasi baru</Text>
                      ) : (
                        <ScrollArea h={320} type="hover">
                          <Stack gap={6}>
                            {notificationsList.map((notif) => (
                              <Card key={notif.id} withBorder padding={8} radius="xs" style={{ cursor: "pointer", position: "relative" }}>
                                <Group gap="xs" align="flex-start" wrap="nowrap">
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "var(--mantine-color-blue-light)",
                                      color: "var(--mantine-color-blue-filled)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <IconBell size={14} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => {
                                    markAsRead(notif.id);
                                    if (notif.url) {
                                      window.location.href = notif.url;
                                    }
                                  }}>
                                    <Text size="xs" fw={700} lineClamp={1}>{notif.title}</Text>
                                    <Text size="xs" c="dimmed" lineClamp={2} style={{ whiteSpace: "normal", fontSize: 11 }}>
                                      {notif.body}
                                    </Text>
                                    <Text size="10px" c="dimmed" mt={4}>
                                      {new Date(notif.createdAt).toLocaleDateString("id-ID", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </Text>
                                  </div>
                                  <ActionIcon variant="subtle" color="blue" size="sm" onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }} title="Tandai sudah dibaca">
                                    <IconCheck size={14} />
                                  </ActionIcon>
                                </Group>
                              </Card>
                            ))}
                          </Stack>
                        </ScrollArea>
                      )}
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              </Group>
            )}
            <Tooltip
              label={colorScheme === "dark" ? "Light mode" : "Dark mode"}
            >
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => toggleColorScheme()}
                aria-label="Toggle color scheme"
                data-tour="tour-theme"
              >
                {mounted ? (colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />) : null}
              </ActionIcon>
            </Tooltip>
            {identity && (
              <Group gap="sm">
                <Menu position="bottom-end" withArrow shadow="md" width={240}>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      radius="xl"
                      size="lg"
                      aria-label="Open profile menu"
                      data-tour="tour-profile"
                    >
                      <Avatar
                        color="blue"
                        radius="xl"
                        size="sm"
                        src={identity.avatar}
                      >
                        {(identity.name ?? identity.email ?? "U")
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>
                      <Stack gap={2}>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {identity.name ?? "User"}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {identity.email ?? ""}
                        </Text>
                      </Stack>
                    </Menu.Label>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconRoute size={16} />}
                      onClick={() => window.dispatchEvent(new Event("erm:start-tour"))}
                    >
                      Lihat Panduan
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={openLogout}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Stack gap={0} visibleFrom="sm">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {identity.name ?? "User"}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {identity.email ?? ""}
                  </Text>
                </Stack>
              </Group>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="xs"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <AppShell.Section
          grow
          my="xs"
          style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
        >
          <Stack gap={4} align={desktopOpened ? "stretch" : "center"}>
            {desktopOpened
              ? renderNavItems(filteredMenuItems, pathname)
              : renderMiniNavItems(filteredMenuItems, pathname)}
            {desktopOpened ? (
              <>
                <Box p="xs" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }} data-tour="tour-year-filter">
                  <YearFilter
                    tahunDari={tahunDari}
                    tahunSampai={tahunSampai}
                    onChange={(d, s) => { setTahunDari(d); setTahunSampai(s); }}
                  />
                </Box>
                <NavLink
                  label="Logout"
                  leftSection={<IconLogout color="red" size={18} />}
                  onClick={openLogout}
                />
              </>
            ) : (
              <Tooltip label="Logout" position="right">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  onClick={openLogout}
                  aria-label="Logout"
                >
                  <IconLogout size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Breadcrumb />
        {children}
      </AppShell.Main>

      <WelcomeTour onBeforeStart={handleTourBeforeStart} />

      <Modal
        opened={logoutOpened}
        onClose={closeLogout}
        title="Konfirmasi Logout"
      >
        <Stack>
          <Text size="sm">Apakah Anda yakin ingin logout?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeLogout}>
              Batal
            </Button>
            <Button color="red" onClick={() => logout()} loading={isLoggingOut}>
              Logout
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <YearProvider>
      <LayoutContent>{children}</LayoutContent>
    </YearProvider>
  );
};
