import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/akademi-risiko/lesson-player";
import { firstLesson } from "@/lib/akademi-risiko/lesson";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (lessonId !== firstLesson.id) notFound();
  return <LessonPlayer lesson={firstLesson} />;
}
