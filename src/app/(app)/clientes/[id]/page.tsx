import { ClienteFicha } from "./ClienteFicha";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClienteFicha id={id} />;
}
