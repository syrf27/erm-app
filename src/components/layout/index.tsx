"use client";

import { useLogout, useGetIdentity } from "@refinedev/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

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
  Center,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDashboard,
  IconLogout,
  IconFileDescription,
  IconEye,
  IconTargetArrow,
  IconQuestionMark,
  IconChartBar,
  IconFolders,
  IconSubtask,
  IconSun,
  IconMoon,
  IconLayoutSidebar,
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
        icon: <IconSubtask size={16} />,
        href: "/manajemen-risiko/penetapan-konteks",
      },
      {
        label: "Identifikasi Risiko",
        href: "/manajemen-risiko/identifikasi",
      },
      {
        label: "Analisis Risiko",
        href: "/manajemen-risiko/analisis",
      },
      {
        label: "Evaluasi Risiko",
        href: "/manajemen-risiko/evaluasi",
      },
      {
        label: "Rencana Penanganan",
        href: "/manajemen-risiko/rencana",
      },
    ],
  },
  {
    label: "Pemantauan Risiko",
    icon: <IconEye size={18} />,
    href: "/pemantauan-risiko",
  },
  {
    label: "KRI",
    icon: <IconChartBar size={18} />,
    href: "/kri",
  },
  {
    label: "Penetapan Risiko",
    icon: <IconTargetArrow size={18} />,
    href: "/penetapan-risiko",
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
              {child.icon ?? <IconSubtask size={18} />}
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
          <Group>
            <ActionIcon
              onClick={toggleMobile}
              hiddenFrom="sm"
              variant="subtle"
              size="lg"
              aria-label="Toggle sidebar"
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
            <ActionIcon
              onClick={toggleDesktop}
              visibleFrom="sm"
              variant="subtle"
              size="lg"
              aria-label="Toggle sidebar"
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
            <IconFileDescription size={24} />
            <Title order={4}>ERM App</Title>
          </Group>
          <Group>
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
        <AppShell.Section>
          <Center p="xs">
            {desktopOpened ? (
              <Group gap="xs">
                <IconFileDescription size={24} />
                <Title order={4}>ERM App</Title>
              </Group>
            ) : (
              <IconFileDescription size={24} />
            )}
          </Center>
        </AppShell.Section>
        <AppShell.Section grow>
          <Stack gap={4} align={desktopOpened ? "stretch" : "center"} pt="xs">
            {desktopOpened
              ? renderNavItems(menuItems, pathname)
              : renderMiniNavItems(menuItems, pathname)}
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
