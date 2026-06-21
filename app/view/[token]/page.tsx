import { getClientByToken } from "@/lib/supabase";
import ClientDashboard from "@/components/ClientDashboard";
import { notFound } from "next/navigation";

export default async function ViewPage({ params }: { params: { token: string } }) {
  const client = await getClientByToken(params.token, "view_token");

  if (!client) {
    notFound();
  }

  return <ClientDashboard client={client} readOnly={true} />;
}
