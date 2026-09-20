"use client";

import { useLogout, useGetIdentity } from "@refinedev/core";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useEffect, useState, useCallback, type PropsWithChildren } from "react";

import {
  AppShell,
  Group,
  Title,
  Modal,
  Button,
  Text,
  Stack,
  ActionIcon,
  UnstyledButton,
  Avatar,
  Menu,
  Tooltip,
  useMantineColorScheme,
  Popover,
  Indicator,
  ScrollArea,
  Divider,
  Card,
  NumberInput,
  Badge,
  Collapse,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { getSafeDocumentHref } from "@/lib/safe-url";
import {
  IconDashboard,
  IconLogout,
  IconActivity,
  IconTargetArrow,
  IconQuestionMark,
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
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import { Breadcrumb } from "../breadcrumb";
import { YearProvider, useYear } from "@/lib/year-context";
import { useFcm } from "@/hooks/useFcm";
import { WelcomeTour } from "@/components/tour/WelcomeTour";
import { HelpChatWidget } from "@/components/help-chat-widget";
import { RiskAiWidget } from "@/components/risk-ai-widget";
import { hasClientPermission } from "@/lib/client-permissions";

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  dataTour?: string;
}

const sidebarTheme = {
  itemPaddingY: 4,
  itemPaddingX: 0,
  iconSize: 36,
  iconSizeChild: 32,
  iconRadius: 10,
  activeIconBg: "var(--mantine-color-blue-filled)",
  activeIconColor: "var(--mantine-color-white)",
  idleIconBg: "var(--mantine-color-blue-light)",
  idleIconColor: "var(--mantine-color-blue-filled)",
};

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

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveDescendant(item: MenuItem, pathname: string): boolean {
  if (!item.children?.length) {
    return false;
  }

  return item.children.some((child) => {
    const childActive = child.href ? matchesPath(pathname, child.href) : false;
    return childActive || hasActiveDescendant(child, pathname);
  });
}

function getSidebarKey(item: MenuItem, parentPath: string[] = []) {
  return [...parentPath, item.label].join(" > ");
}

function collectAutoOpenedKeys(
  items: MenuItem[],
  pathname: string,
  parentPath: string[] = []
) {
  const opened = new Set<string>();

  items.forEach((item) => {
    const key = getSidebarKey(item, parentPath);
    const childShouldOpen = hasActiveDescendant(item, pathname);
    const selfActive = item.href ? matchesPath(pathname, item.href) : false;

    if (item.children?.length && (selfActive || childShouldOpen)) {
      opened.add(key);
      const childOpened = collectAutoOpenedKeys(
        item.children,
        pathname,
        [...parentPath, item.label]
      );
      childOpened.forEach((childKey) => opened.add(childKey));
    }
  });

  return opened;
}

function SidebarIcon({
  icon,
  active,
  compact,
  tone = "default",
}: {
  icon?: React.ReactNode;
  active: boolean;
  compact?: boolean;
  tone?: "default" | "danger";
}) {
  const size = compact ? sidebarTheme.iconSizeChild : sidebarTheme.iconSize;
  const isDanger = tone === "danger";

  return (
    <Box
      className="risk-sidebar-icon"
      style={{
        width: size,
        height: size,
        borderRadius: sidebarTheme.iconRadius,
        backgroundColor: isDanger
          ? "var(--mantine-color-red-light)"
          : active
            ? sidebarTheme.activeIconBg
            : sidebarTheme.idleIconBg,
        color: isDanger
          ? "var(--mantine-color-red-filled)"
          : active
            ? sidebarTheme.activeIconColor
            : sidebarTheme.idleIconColor,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
  );
}

function SidebarItem({
  item,
  pathname,
  depth = 0,
  parentPath = [],
  openedKeys,
  toggleOpen,
}: {
  item: MenuItem;
  pathname: string;
  depth?: number;
  parentPath?: string[];
  openedKeys: string[];
  toggleOpen: (key: string) => void;
}) {
  const key = getSidebarKey(item, parentPath);
  const selfActive = item.href ? matchesPath(pathname, item.href) : false;
  const childActive = hasActiveDescendant(item, pathname);
  const isActive = selfActive || childActive;
  const isOpen = item.children?.length
    ? isActive || openedKeys.includes(key)
    : false;
  const isCompact = depth > 0;
  const hasChildren = Boolean(item.children?.length);
  const itemStyles = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: `${sidebarTheme.itemPaddingY}px ${sidebarTheme.itemPaddingX}px`,
    color: isActive ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)",
    transition: "color 150ms ease",
    cursor: hasChildren && !selfActive ? "pointer" : item.href ? "pointer" : "default",
    textAlign: "left" as const,
  };

  return (
    <Box
      style={{
        position: "relative",
      }}
    >
      {item.href ? (
        <UnstyledButton
          component={Link}
          href={item.href}
          data-tour={item.dataTour}
          className="risk-sidebar-item"
          style={itemStyles}
        >
          <SidebarIcon icon={item.icon} active={isActive} compact={isCompact} />

          <Box
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              size="sm"
              fw={isActive ? 700 : 500}
              c={isActive ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)"}
              style={{ lineHeight: 1.2 }}
            >
              {item.label}
            </Text>

            {hasChildren && (
              <Box c="dimmed" style={{ display: "flex", alignItems: "center" }}>
                {isOpen ? (
                  <IconChevronDown size={16} stroke={1.8} />
                ) : (
                  <IconChevronRight size={16} stroke={1.8} />
                )}
              </Box>
            )}
          </Box>
        </UnstyledButton>
      ) : (
        <UnstyledButton
          data-tour={item.dataTour}
          onClick={hasChildren && !selfActive ? () => toggleOpen(key) : undefined}
          className="risk-sidebar-item"
          style={itemStyles}
        >
          <SidebarIcon icon={item.icon} active={isActive} compact={isCompact} />

          <Box
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              size="sm"
              fw={isActive ? 700 : 500}
              c={isActive ? "var(--mantine-color-text)" : "var(--mantine-color-dimmed)"}
              style={{ lineHeight: 1.2 }}
            >
              {item.label}
            </Text>

            {hasChildren && (
              <Box c="dimmed" style={{ display: "flex", alignItems: "center" }}>
                {isOpen ? (
                  <IconChevronDown size={16} stroke={1.8} />
                ) : (
                  <IconChevronRight size={16} stroke={1.8} />
                )}
              </Box>
            )}
          </Box>
        </UnstyledButton>
      )}

      {hasChildren && (
        <Collapse in={isOpen}>
          <Box
            style={{
              marginTop: 4,
              marginLeft: depth === 0 ? 16 : 10,
              paddingLeft: 14,
              borderLeft: "1px solid var(--mantine-color-gray-3)",
            }}
          >
            <Stack gap={4}>
              {item.children!.map((child) => {
                const childIsActive = child.href
                  ? matchesPath(pathname, child.href)
                  : hasActiveDescendant(child, pathname);

                return (
                  <Box key={getSidebarKey(child, [...parentPath, item.label])} style={{ position: "relative" }}>
                    {childIsActive && (
                      <Box
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -16,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          borderRadius: 2,
                          backgroundColor: "var(--mantine-color-blue-filled)",
                        }}
                      />
                    )}
                    <SidebarItem
                      item={child}
                      pathname={pathname}
                      depth={depth + 1}
                      parentPath={[...parentPath, item.label]}
                      openedKeys={openedKeys}
                      toggleOpen={toggleOpen}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

function SidebarNavList({
  items,
  pathname,
  depth = 0,
}: {
  items: MenuItem[];
  pathname: string;
  depth?: number;
}) {
  const [openedKeys, setOpenedKeys] = useState<string[]>([]);

  useEffect(() => {
    const autoOpened = collectAutoOpenedKeys(items, pathname);
    setOpenedKeys((current) =>
      Array.from(new Set([...current, ...Array.from(autoOpened)]))
    );
  }, [items, pathname]);

  const toggleOpen = useCallback((key: string) => {
    setOpenedKeys((current) =>
      current.includes(key)
        ? current.filter((existing) => existing !== key)
        : [...current, key]
    );
  }, []);

  return (
    <Stack gap={8}>
      {items.map((item) => (
        <SidebarItem
          key={getSidebarKey(item)}
          item={item}
          pathname={pathname}
          depth={depth}
          openedKeys={openedKeys}
          toggleOpen={toggleOpen}
        />
      ))}
    </Stack>
  );
}

function SidebarLogoutItem({ onClick }: { onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-label="Logout"
      className="risk-sidebar-item risk-sidebar-item--danger"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `${sidebarTheme.itemPaddingY}px ${sidebarTheme.itemPaddingX}px`,
        color: "var(--mantine-color-red-filled)",
        transition: "color 150ms ease",
        textAlign: "left",
      }}
    >
      <SidebarIcon
        icon={<IconLogout size={18} />}
        active={false}
        tone="danger"
      />
      <Text
        size="sm"
        fw={500}
        c="var(--mantine-color-red-filled)"
        style={{ lineHeight: 1.2 }}
      >
        Logout
      </Text>
    </UnstyledButton>
  );
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
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, open: openDesktop }] = useDisclosure(true);
  const [logoutOpened, { open: openLogout, close: closeLogout }] = useDisclosure(false);
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: identity } = useGetIdentity<any>();
  const { permissionStatus, enableNotifications } = useFcm(identity);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { tahunDari, tahunSampai, setTahunDari, setTahunSampai } = useYear();
  const currentYear = new Date().getFullYear();
  const [periodOpened, setPeriodOpened] = useState(false);
  const [mobilePeriodOpened, setMobilePeriodOpened] = useState(false);
  const [draftTahunDari, setDraftTahunDari] = useState(tahunDari);
  const [draftTahunSampai, setDraftTahunSampai] = useState(tahunSampai);
  const [mounted, setMounted] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const shouldShowBreadcrumb =
    pathname.startsWith("/manajemen-risiko/penetapan-konteks") ||
    pathname.startsWith("/manajemen-risiko/identifikasi") ||
    pathname.startsWith("/manajemen-risiko/analisis") ||
    pathname.startsWith("/manajemen-risiko/evaluasi") ||
    pathname.startsWith("/manajemen-risiko/rencana") ||
    pathname.startsWith("/manajemen-risiko/matriks-risiko") ||
    pathname.startsWith("/notification-center") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/roles");

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
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchNotifications();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [identity]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraftTahunDari(tahunDari);
    setDraftTahunSampai(tahunSampai);
  }, [tahunDari, tahunSampai]);

  const applyPeriodFilter = useCallback(() => {
    if (draftTahunDari > draftTahunSampai) {
      notifications.show({
        title: "Periode Tidak Valid",
        message: "Dari Tahun tidak boleh lebih besar dari Sampai Tahun.",
        color: "orange",
      });
      return;
    }

    setTahunDari(draftTahunDari);
    setTahunSampai(draftTahunSampai);
    setPeriodOpened(false);
    setMobilePeriodOpened(false);
  }, [draftTahunDari, draftTahunSampai, setTahunDari, setTahunSampai]);

  const resetDraftPeriodFilter = useCallback(() => {
    setDraftTahunDari(tahunDari);
    setDraftTahunSampai(tahunSampai);
  }, [tahunDari, tahunSampai]);

  const filteredMenuItems = useMemo(() => {
    return menuItems
      .filter((item) => {
        if (item.href === "/audit-log") {
          return hasClientPermission(identity, "audit-logs:read");
        }
        return true;
      })
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.href === "/users") {
              return hasClientPermission(identity, "users:read");
            }
            if (child.href === "/roles") {
              return hasClientPermission(identity, "roles:read");
            }
            if (child.href === "/notification-center") {
              return hasClientPermission(identity, "users:update");
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

  const startGuide = useCallback(() => {
    closeMobile();
    window.setTimeout(() => {
      window.dispatchEvent(new Event("erm:start-tour"));
    }, 150);
  }, [closeMobile]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: desktopOpened ? 280 : 60,
        breakpoint: "sm",
        collapsed: { desktop: false, mobile: !mobileOpened },
      }}
      padding={{ base: "xs", sm: "md" }}
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
            <ActionIcon
              onClick={toggleMobile}
              hiddenFrom="sm"
              variant="light"
              color="blue"
              size="lg"
              aria-label={mobileOpened ? "Tutup menu" : "Buka menu"}
            >
              {mobileOpened ? <IconX size={20} /> : <IconMenu2 size={20} />}
            </ActionIcon>

            <Group gap="sm" visibleFrom="sm">
            {mounted && (
              <Group gap="xs">
                <Popover
                  width={300}
                  position="bottom-end"
                  withArrow
                  shadow="md"
                  opened={periodOpened}
                  onChange={setPeriodOpened}
                >
                  <Popover.Target>
                    <Button
                      variant="light"
                      color="blue"
                      size="xs"
                      onClick={() => setPeriodOpened((opened) => !opened)}
                      data-tour="tour-year-filter"
                      aria-label="Ubah periode data"
                    >
                      Periode Data: {tahunDari === tahunSampai ? tahunDari : `${tahunDari}-${tahunSampai}`}
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack gap="sm">
                      <Stack gap={2}>
                        <Text size="sm" fw={700}>Periode Data</Text>
                        <Text size="xs" c="dimmed">
                          Filter ini memengaruhi dashboard dan data risiko. Perubahan baru diterapkan setelah menekan tombol Terapkan.
                        </Text>
                      </Stack>
                      <Group grow align="flex-start">
                        <NumberInput
                          label="Dari Tahun"
                          value={draftTahunDari}
                          min={2020}
                          max={currentYear + 10}
                          step={1}
                          allowDecimal={false}
                          onChange={(value) => setDraftTahunDari(Number(value) || currentYear)}
                        />
                        <NumberInput
                          label="Sampai Tahun"
                          value={draftTahunSampai}
                          min={2020}
                          max={currentYear + 10}
                          step={1}
                          allowDecimal={false}
                          onChange={(value) => setDraftTahunSampai(Number(value) || currentYear)}
                        />
                      </Group>
                      {draftTahunDari > draftTahunSampai && (
                        <Text size="xs" c="orange">
                          Dari Tahun tidak boleh lebih besar dari Sampai Tahun.
                        </Text>
                      )}
                      <Group justify="space-between">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={resetDraftPeriodFilter}
                        >
                          Reset
                        </Button>
                        <Group gap="xs">
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => {
                              resetDraftPeriodFilter();
                              setPeriodOpened(false);
                            }}
                          >
                            Batal
                          </Button>
                          <Button
                            size="xs"
                            onClick={applyPeriodFilter}
                            disabled={draftTahunDari > draftTahunSampai}
                          >
                            Terapkan
                          </Button>
                        </Group>
                      </Group>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>

                <Popover width={380} position="bottom-end" withArrow shadow="md">
                  <Popover.Target>
                    <ActionIcon variant="light" size="lg" color="gray" aria-label="Notifikasi" data-tour="tour-notifikasi">
                      <Indicator
                        label={notificationsList.length}
                        size={16}
                        color="red"
                        offset={2}
                        disabled={notificationsList.length === 0}
                        inline
                      >
                        <IconBell size={18} />
                      </Indicator>
                    </ActionIcon>
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
                      <Card withBorder padding="xs" radius="sm">
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Stack gap={1}>
                            <Text size="xs" fw={600}>Notifikasi perangkat</Text>
                            <Text size="11px" c="dimmed">
                              Izinkan aplikasi mengirim pengingat meskipun halaman tidak sedang dibuka.
                            </Text>
                          </Stack>
                          {permissionStatus === "granted" ? (
                            <Badge color="green" variant="light">
                              Aktif
                            </Badge>
                          ) : permissionStatus === "unsupported" ? (
                            <Badge color="gray" variant="light">
                              Tidak didukung
                            </Badge>
                          ) : permissionStatus === "denied" ? (
                            <Badge color="red" variant="light">
                              Diblokir
                            </Badge>
                          ) : (
                            <Button
                              size="compact-xs"
                              variant="light"
                              onClick={() => enableNotifications()}
                            >
                              Aktifkan
                            </Button>
                          )}
                        </Group>
                        {permissionStatus === "denied" && (
                          <Text size="11px" c="dimmed" mt={6}>
                            Izin notifikasi diblokir di browser. Buka pengaturan situs browser untuk mengaktifkannya kembali.
                          </Text>
                        )}
                      </Card>
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
                                    const safeUrl = getSafeDocumentHref(notif.url);
                                    if (safeUrl) {
                                      window.location.assign(safeUrl);
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
                      onClick={startGuide}
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
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="xs"
        style={{
          display: "flex",
          flexDirection: "column",
          width: desktopOpened ? "min(280px, 100vw)" : 60,
          maxWidth: "100vw",
          overflowX: "hidden",
        }}
      >
        <AppShell.Section
          grow
          my="xs"
          style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
        >
          <Stack gap={4} align={desktopOpened ? "stretch" : "center"}>
            <Box hiddenFrom="sm" mb="sm">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
                Preferensi
              </Text>
              <Group grow gap="xs" align="stretch">
                <Button
                  variant="light"
                  color="blue"
                  size="xs"
                  leftSection={<IconCalendar size={15} />}
                  onClick={() => setMobilePeriodOpened(true)}
                >
                  {tahunDari === tahunSampai ? `Periode ${tahunDari}` : `${tahunDari}-${tahunSampai}`}
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  size="xs"
                  leftSection={mounted && colorScheme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
                  onClick={() => toggleColorScheme()}
                >
                  {mounted && colorScheme === "dark" ? "Terang" : "Gelap"}
                </Button>
              </Group>

              {identity && (
                <Card withBorder padding="sm" radius="md" mt="sm">
                  <Text size="xs" fw={700} lineClamp={1}>
                    {identity.name ?? "User"}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                    {identity.email ?? ""}
                  </Text>
                </Card>
              )}
              <Divider my="sm" />
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Navigasi
              </Text>
            </Box>

            {desktopOpened
              ? <SidebarNavList items={filteredMenuItems} pathname={pathname} />
              : renderMiniNavItems(filteredMenuItems, pathname)}
            <Button
              hiddenFrom="sm"
              variant="subtle"
              color="blue"
              leftSection={<IconRoute size={18} />}
              onClick={startGuide}
              fullWidth
              justify="flex-start"
              mt="sm"
            >
              Lihat Panduan
            </Button>
            {desktopOpened ? (
              <SidebarLogoutItem onClick={openLogout} />
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
        {shouldShowBreadcrumb && <Breadcrumb />}
        {children}
      </AppShell.Main>

      <HelpChatWidget />
      <RiskAiWidget />
      <WelcomeTour onBeforeStart={handleTourBeforeStart} />

      <Modal
        opened={mobilePeriodOpened}
        onClose={() => {
          resetDraftPeriodFilter();
          setMobilePeriodOpened(false);
        }}
        title="Periode Data"
        size="xs"
        radius="md"
        hiddenFrom="sm"
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Filter ini memengaruhi dashboard dan data risiko.
          </Text>
          <NumberInput
            label="Dari Tahun"
            value={draftTahunDari}
            min={2020}
            max={currentYear + 10}
            step={1}
            allowDecimal={false}
            onChange={(value) => setDraftTahunDari(Number(value) || currentYear)}
          />
          <NumberInput
            label="Sampai Tahun"
            value={draftTahunSampai}
            min={2020}
            max={currentYear + 10}
            step={1}
            allowDecimal={false}
            onChange={(value) => setDraftTahunSampai(Number(value) || currentYear)}
          />
          {draftTahunDari > draftTahunSampai && (
            <Text size="xs" c="orange">
              Dari Tahun tidak boleh lebih besar dari Sampai Tahun.
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                resetDraftPeriodFilter();
                setMobilePeriodOpened(false);
              }}
            >
              Batal
            </Button>
            <Button onClick={applyPeriodFilter} disabled={draftTahunDari > draftTahunSampai}>
              Terapkan
            </Button>
          </Group>
        </Stack>
      </Modal>

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
      <style jsx global>{`
        .risk-sidebar-item {
          border-radius: ${sidebarTheme.iconRadius}px;
          transition:
            background-color 160ms ease,
            transform 160ms ease;
        }

        .risk-sidebar-item:hover {
          background-color: var(--mantine-color-blue-light);
          transform: translateX(2px);
        }

        .risk-sidebar-item .risk-sidebar-icon {
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .risk-sidebar-item:hover .risk-sidebar-icon {
          box-shadow: 0 4px 12px color-mix(in srgb, var(--mantine-color-blue-filled) 18%, transparent);
          transform: translateY(-1px);
        }

        .risk-sidebar-item--danger:hover {
          background-color: var(--mantine-color-red-light);
        }

        .risk-sidebar-item--danger:hover .risk-sidebar-icon {
          box-shadow: 0 4px 12px color-mix(in srgb, var(--mantine-color-red-filled) 18%, transparent);
        }

        .risk-sidebar-item:focus-visible {
          outline: 2px solid var(--mantine-color-blue-filled);
          outline-offset: 2px;
        }

        .risk-sidebar-item--danger:focus-visible {
          outline-color: var(--mantine-color-red-filled);
        }

        @media (prefers-reduced-motion: reduce) {
          .risk-sidebar-item,
          .risk-sidebar-item .risk-sidebar-icon {
            transition: none;
          }

          .risk-sidebar-item:hover,
          .risk-sidebar-item:hover .risk-sidebar-icon {
            transform: none;
          }
        }
      `}</style>
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
