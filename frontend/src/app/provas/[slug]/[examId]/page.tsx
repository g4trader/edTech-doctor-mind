import { ExamPage } from "@/components/ExamPage";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  return <ExamPage slug={slug} examId={examId} />;
}
