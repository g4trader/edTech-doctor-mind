import { ExamsBySpecialty } from "@/components/ExamsBySpecialty";

export default async function SpecialtyExamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ExamsBySpecialty slug={slug} />;
}
