import prisma from "@/lib/prisma";
import { TemplatesListClient, TemplateItem } from "./TemplatesListClient";

export const dynamic = "force-dynamic";

export default async function MessageBankPage() {
  const templates = await prisma.messageTemplate.findMany({
    include: {
      variants: {
        orderBy: [{ language: "asc" }, { framing: "asc" }],
      },
    },
    orderBy: { code: "asc" },
  });

  const items: TemplateItem[] = templates.flatMap((tpl) =>
    tpl.variants.map((v) => ({
      id: tpl.id,
      variantId: v.id,
      code: tpl.code,
      stream: tpl.stream,
      topic: tpl.topic,
      language: v.language,
      framing: v.framing,
      approvalStatus: tpl.approvalStatus,
      body: v.body,
      segmentCount: v.segmentCount,
    }))
  );

  return <TemplatesListClient items={items} />;
}
