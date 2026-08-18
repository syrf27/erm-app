"use client";

import { useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import {
  Button,
  Group,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

export default function CategoryEdit() {
  const { list } = useNavigation();

  const {
    refineCore: { onFinish },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

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
      </Group>
      <Title order={3}>Edit Category</Title>
      <form onSubmit={handleSubmit(onFinish)}>
        <Stack>
          <TextInput
            label="Title"
            error={(errors as any)?.title?.message as string}
            {...register("title", { required: "This field is required" })}
          />
          <Group>
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
