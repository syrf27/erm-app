"use client";

import { useNavigation } from "@refinedev/core";
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

export default function CategoryList() {
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
        id: "actions",
        accessorKey: "id",
        header: "Actions",
        cell: function render({ getValue }) {
          return (
            <Group gap="xs">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => show("categories", getValue() as string)}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="yellow"
                onClick={() => edit("categories", getValue() as string)}
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
    reactTable: {
      getHeaderGroups,
      getRowModel,
      getState,
      setPageIndex,
      getPageCount,
      setPageSize,
    },
  } = useTable({
    columns,
  });

  return (
    <Stack p="md">
      <Group justify="space-between">
        <Title order={3}>Categories</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => create("categories")}>
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
