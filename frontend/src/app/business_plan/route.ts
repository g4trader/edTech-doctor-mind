import { readFile } from "node:fs/promises";

export const dynamic = "force-static";

export async function GET() {
  const html = await readFile(
    new URL("../../../public/business_plan/index.html", import.meta.url),
    "utf8",
  );

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
