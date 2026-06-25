"use client";

import { useBreadcrumb } from "@refinedev/core";
import Link from "next/link";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

export const Breadcrumb = () => {
  const { breadcrumbs } = useBreadcrumb();

  if (breadcrumbs.length === 0) return null;

  return (
    <Breadcrumbs mb="md">
      {breadcrumbs.map((breadcrumb) => {
        return breadcrumb.href ? (
          <Anchor key={breadcrumb.label} component={Link} href={breadcrumb.href}>
            {breadcrumb.label}
          </Anchor>
        ) : (
          <Text key={breadcrumb.label} size="sm">
            {breadcrumb.label}
          </Text>
        );
      })}
    </Breadcrumbs>
  );
};
