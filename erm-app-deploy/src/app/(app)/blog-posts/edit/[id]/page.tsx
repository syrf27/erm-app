"use client";

import { useNavigation, useSelect } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";
import React from "react";
import {
  Button,
  Group,
  Stack,
  TextInput,
  Textarea,
  Select,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

export default function BlogPostEdit() {
  const { list } = useNavigation();

  const {
    refineCore: { onFinish, query },
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({});

  const blogPostsData = query?.data?.data;

  const { options: categoryOptions } = useSelect({
    resource: "categories",
    defaultValue: blogPostsData?.category?.id,
  });

  React.useEffect(() => {
    setValue("category.id", blogPostsData?.category?.id);
  }, [categoryOptions, blogPostsData?.category?.id, setValue]);

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
      </Group>
      <Title order={3}>Edit Blog Post</Title>
      <form onSubmit={handleSubmit(onFinish)}>
        <Stack>
          <TextInput
            label="Title"
            error={(errors as any)?.title?.message as string}
            {...register("title", { required: "This field is required" })}
          />
          <Textarea
            label="Content"
            rows={5}
            error={(errors as any)?.content?.message as string}
            {...register("content", { required: "This field is required" })}
          />
          <Controller
            name="category.id"
            control={control}
            rules={{ required: "This field is required" }}
            render={({ field }) => (
              <Select
                label="Category"
                data={categoryOptions?.map((opt) => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
                value={field.value != null ? String(field.value) : ""}
                onChange={(value) => field.onChange(value ? Number(value) : value)}
                error={(errors as any)?.category?.id?.message as string}
              />
            )}
          />
          <Controller
            name="status"
            control={control}
            rules={{ required: "This field is required" }}
            render={({ field }) => (
              <Select
                label="Status"
                data={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "rejected", label: "Rejected" },
                ]}
                value={field.value}
                onChange={field.onChange}
                error={(errors as any)?.status?.message as string}
              />
            )}
          />
          <Group>
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
