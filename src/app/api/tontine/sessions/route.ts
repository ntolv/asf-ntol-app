import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("v_tontine_page_sessions")
      .select("*")
      .order("ordre_session", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Impossible de charger les sessions tontine.",
      },
      { status: 500 }
    );
  }
}