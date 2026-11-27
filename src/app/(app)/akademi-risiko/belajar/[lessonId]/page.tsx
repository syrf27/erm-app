import { notFound } from "next/navigation";
import { BpsLessonPlayer } from "@/components/akademi-risiko/bps-lesson-player";
import { academyLessonById } from "@/lib/akademi-risiko/curriculum";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = academyLessonById(lessonId);
  if (!lesson) notFound();
  return <BpsLessonPlayer lesson={lesson} />;
}
