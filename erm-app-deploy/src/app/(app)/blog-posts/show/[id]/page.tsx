"use client";

import {
  useNavigation,
  useOne,
  useResourceParams,
  useShow,
} from "@refinedev/core";
import {
  Button,
  Group,
  Stack,
  Title,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";

export default function BlogPostShow() {
  const { edit, list } = useNavigation();
  const { id } = useResourceParams();
  const { result: record } = useShow({});

  const {
    result: category,
    query: { isLoading: categoryIsLoading },
  } = useOne({
    resource: "categories",
    id: record?.category?.id || "",
    queryOptions: {
      enabled: !!record,
    },
  });

  return (
    <Stack p="md">
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => list("blog_posts")}
        >
          Back
        </Button>
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={() => edit("blog_posts", id ?? "")}
        >
          Edit
        </Button>
      </Group>
      <Title order={3}>Show Blog Post</Title>
      <Stack gap="xs">
        <div>
          <Text fw={500}>ID</Text>
          <Text>{record?.id ?? ""}</Text>
        </div>
        <div>
          <Text fw={500}>Title</Text>
          <Text>{record?.title}</Text>
        </div>
        <div>
          <Text fw={500}>Content</Text>
          <Text>{record?.content}</Text>
        </div>
        <div>
          <Text fw={500}>Category</Text>
          <Text>{categoryIsLoading ? "Loading..." : category?.title}</Text>
        </div>
        <div>
          <Text fw={500}>Status</Text>
          <Text>{record?.status}</Text>
        </div>
        <div>
          <Text fw={500}>Created at</Text>
          <Text>
            {record?.createdAt
              ? new Date(record?.createdAt).toLocaleString(undefined, {
                  timeZone: "UTC",
                })
              : "-"}
          </Text>
        </div>
      </Stack>
    </Stack>
  );
}
