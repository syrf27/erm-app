"use client";

import { useLogout, useGetIdentity } from "@refinedev/core";
import Image from "next/image";
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
  Menu,
  Tooltip,
  Box,
  useMantineColorScheme,
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
} from "@tabler/icons-react";
import { Breadcrumb } from "../breadcrumb";
import { YearProvider, useYear } from "@/lib/year-context";
import { YearFilter } from "@/components/YearFilter";

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
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [logoutOpened, { open: openLogout, close: closeLogout }] =
    useDisclosure(false);
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: identity } = useGetIdentity<any>();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { tahunDari, tahunSampai, setTahunDari, setTahunSampai } = useYear();

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
            <Image
              src="/manajemen-risiko-logo.svg"
              alt="Manajemen Risiko App - Pusdiklat BPS"
              width={32}
              height={32}
              priority
            />
            <Title order={4}>MR</Title>

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
            <Tooltip
              label={colorScheme === "dark" ? "Light mode" : "Dark mode"}
            >
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => toggleColorScheme()}
                aria-label="Toggle color scheme"
              >
                {colorScheme === "dark" ? (
                  <IconSun size={18} />
                ) : (
                  <IconMoon size={18} />
                )}
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
                <Box p="xs" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
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
