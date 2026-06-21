import { getClientByToken } from "@/lib/supabase";
import ClientDashboard from "@/components/ClientDashboard";
import { notFound } from "next/navigation";

export default async function EditPage({ params }: { params: { token: string } }) {
  const client = await getClientByToken(params.token, "edit_token");

  if (!client) {
    notFound();
  }

  return <ClientDashboard client={client} readOnly={false} />;
}
