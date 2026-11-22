import { redirect } from "next/navigation";

export default async function MotherDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/participants/${id}`);
}
