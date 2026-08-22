import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(
  role:
    | {
        code?: string | null;
        libelle?: string | null;
      }
    | null
    | undefined
) {
  const raw =
    `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

export default async function BureauLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context =
    await getUserContext(user);

  if (
    !context?.success ||
    !context?.membreId ||
    !isBureauRole(context.role)
  ) {
    redirect("/");
  }

  return children;
}