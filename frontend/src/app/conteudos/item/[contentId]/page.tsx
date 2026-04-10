import { ContentPage } from "@/components/ContentPage";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return <ContentPage contentId={contentId} />;
}
