"use client";

import { useNavigation, useResourceParams, useShow } from "@refinedev/core";
import {
  Button,
  Group,
  Stack,
  Title,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";

export default function CategoryShow() {
  const { edit, list } = useNavigation();
  const { id } = useResourceParams();
  const { result: record } = useShow({});

  return (
    <Stack p="md">
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => list("categories")}
        >
          Back
        </Button>
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={() => edit("categories", id ?? "")}
        >
          Edit
        </Button>
      </Group>
      <Title order={3}>Show Category</Title>
      <Stack gap="xs">
        <div>
          <Text fw={500}>ID</Text>
          <Text>{record?.id ?? ""}</Text>
        </div>
        <div>
          <Text fw={500}>Title</Text>
          <Text>{record?.title}</Text>
        </div>
      </Stack>
    </Stack>
  );
}
