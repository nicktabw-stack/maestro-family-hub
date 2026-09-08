import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useRole, useSessionUser } from "@/hooks/use-auth";
import { Chargement } from "@/components/chargement";

export function useGardeAdmin() {
  const { user } = useSessionUser();
  const { data: role, isLoading } = useRole(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    if (role && role !== "admin") navigate({ to: "/espace", replace: true });
  }, [role, isLoading, user, navigate]);

  return { pret: !!user && role === "admin", role, isLoading };
}

export function EcranAttenteAdmin() {
  return <Chargement texte="Vérification des accès…" />;
}
