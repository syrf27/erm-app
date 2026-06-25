"use client";

import { GetManyResponse, useMany, useNavigation } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import React from "react";
import {
  Table,
  Button,
  Group,
  Pagination,
  Select,
  TextInput,
  Title,
  Stack,
  ActionIcon,
} from "@mantine/core";
import { IconEdit, IconEye, IconPlus } from "@tabler/icons-react";

export default function BlogPostList() {
  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
      },
      {
        id: "content",
        accessorKey: "content",
        header: "Content",
      },
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        cell: function render({ getValue, table }) {
          const meta = table.options.meta as {
            categories: GetManyResponse["data"];
          };

          try {
            const category = meta.categories?.find(
              (item) => item.id == getValue<any>()?.id
            );

            return category?.title ?? "Loading...";
          } catch (error) {
            return null;
          }
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created At",
        cell: function render({ getValue }) {
          const dateValue = getValue<any>();
          return dateValue
            ? new Date(dateValue).toLocaleString(undefined, {
                timeZone: "UTC",
              })
            : "-";
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Actions",
        cell: function render({ getValue }) {
          return (
            <Group gap="xs">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => show("blog_posts", getValue() as string)}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="yellow"
                onClick={() => edit("blog_posts", getValue() as string)}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
          );
        },
      },
    ],
    []
  );

  const { edit, show, create } = useNavigation();

  const {
    refineCore: {
      result: { data: tableData },
    },
    reactTable: {
      getHeaderGroups,
      getRowModel,
      setOptions,
      getState,
      setPageIndex,
      getCanPreviousPage,
      getPageCount,
      getCanNextPage,
      nextPage,
      previousPage,
      setPageSize,
    },
  } = useTable({
    columns,
  });

  const {
    result: { data: categories },
  } = useMany({
    resource: "categories",
    ids: tableData?.map((item) => item?.category?.id).filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!tableData,
    },
  });

  setOptions((prev) => ({
    ...prev,
    meta: {
      ...prev.meta,
      categories,
    },
  }));

  return (
    <Stack p="md">
      <Group justify="space-between">
        <Title order={3}>Blog Posts</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => create("blog_posts")}>
          Create
        </Button>
      </Group>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          {getHeaderGroups().map((headerGroup) => (
            <Table.Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Th key={header.id}>
                  {!header.isPlaceholder &&
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </Table.Th>
              ))}
            </Table.Tr>
          ))}
        </Table.Thead>
        <Table.Tbody>
          {getRowModel().rows.map((row) => (
            <Table.Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Table.Td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="space-between" mt="md">
        <Group gap="xs">
          <TextInput
            type="number"
            defaultValue={getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              setPageIndex(page);
            }}
            style={{ width: 80 }}
          />
          <span>
            Page {getState().pagination.pageIndex + 1} of {getPageCount()}
          </span>
        </Group>
        <Group gap="xs">
          <Select
            value={String(getState().pagination.pageSize)}
            onChange={(value) => setPageSize(Number(value))}
            data={["10", "20", "30", "40", "50"]}
            style={{ width: 80 }}
          />
          <Pagination
            total={getPageCount()}
            value={getState().pagination.pageIndex + 1}
            onChange={(page) => setPageIndex(page - 1)}
          />
        </Group>
      </Group>
    </Stack>
  );
}
