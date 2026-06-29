"use client";

import { useLogout, useGetIdentity } from "@refinedev/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type PropsWithChildren } from "react";

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
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDashboard,
  IconLogout,
  IconFileDescription,
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
} from "@tabler/icons-react";
import { Breadcrumb } from "../breadcrumb";

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <IconDashboard size={18} />,
    href: "/",
  },
  {
    label: "Manajemen Risiko",
    icon: <IconFolders size={18} />,
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
        label: "Risk Appetite",
        icon: <IconHeartRateMonitor size={16} />,
        href: "/manajemen-risiko/risk-appetite",
      },
    ],
  },
  {
    label: "Pemantauan Risiko",
    icon: <IconActivity size={18} />,
    href: "/pemantauan-risiko",
  },
  {
    label: "KRI",
    icon: <IconChartBar size={18} />,
    href: "/kri",
  },
  {
    label: "Pelaporan Risiko",
    icon: <IconTargetArrow size={18} />,
    href: "/pelaporan-risiko",
  },
  {
    label: "Audit Log",
    icon: <IconFileAnalytics size={18} />,
    href: "/audit-log",
  },
  {
    label: "User Management",
    icon: <IconUsers size={18} />,
    href: "/users",
  },
  {
    label: "Role Management",
    icon: <IconSettings size={18} />,
    href: "/roles",
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
          defaultOpened={pathname.startsWith("/manajemen-risiko")}
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

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [logoutOpened, { open: openLogout, close: closeLogout }] = useDisclosure(false);
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: identity } = useGetIdentity<any>();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const filteredMenuItems = useMemo(() => {
    const permissions = identity?.permissions || [];
    return menuItems.filter((item) => {
      if (item.href === "/audit-log") {
        return permissions.includes("audit-logs:read");
      }
      if (item.href === "/users") {
        return permissions.includes("users:read");
      }
      if (item.href === "/roles") {
        return permissions.includes("roles:read");
      }
      return true;
    });
  }, [identity]);

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
            <IconFileDescription size={24} />
            <Title order={4}>ERM App</Title>

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
            <Tooltip label={colorScheme === "dark" ? "Light mode" : "Dark mode"}>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => toggleColorScheme()}
                aria-label="Toggle color scheme"
              >
                {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            {identity && (
              <Group gap="sm" visibleFrom="sm">
                <Avatar
                  color="blue"
                  radius="xl"
                  size="sm"
                  src={identity.avatar}
                >
                  {(identity.name ?? identity.email ?? "U").charAt(0).toUpperCase()}
                </Avatar>
                <Stack gap={0}>
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

      <AppShell.Navbar p="xs">
        <AppShell.Section grow my="xs">
          <Stack gap={4} align={desktopOpened ? "stretch" : "center"}>
            {desktopOpened
              ? renderNavItems(filteredMenuItems, pathname)
              : renderMiniNavItems(filteredMenuItems, pathname)}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          {desktopOpened ? (
            <NavLink
              label="Logout"
              leftSection={<IconLogout color="red" size={18} />}
              onClick={openLogout}
            />
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
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Breadcrumb />
        {children}
      </AppShell.Main>

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
            <Button
              color="red"
              onClick={() => logout()}
              loading={isLoggingOut}
            >
              Logout
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
};
