import { SpecialtyPage } from "@/components/SpecialtyPage";

export default async function SpecialtyContentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SpecialtyPage slug={slug} />;
}
