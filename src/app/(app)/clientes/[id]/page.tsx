import { ClienteFichaPlaceholder } from "./ClienteFichaPlaceholder";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClienteFichaPlaceholder id={id} />;
}
