"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AuthContextGate() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated && auth.member?.id) {
      router.replace("/");
    }
  }, [auth.loading, auth.isAuthenticated, auth.member?.id, router]);

  return null;
}