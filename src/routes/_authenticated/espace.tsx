import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRole, useSessionUser } from "@/hooks/use-auth";
import { Chargement } from "@/components/chargement";

export const Route = createFileRoute("/_authenticated/espace")({
  head: () => ({ meta: [
    { title: "MaîtreDom — Accès à mon compte" },
    { name: "description", content: "Retrouvez votre espace famille, maître ou structure." },
    { property: "og:title", content: "MaîtreDom — Accès à mon compte" },
    { property: "og:description", content: "Retrouvez votre espace famille, maître ou structure." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Espace,
});

function Espace() {
  const { user } = useSessionUser();
  const { data: role, isLoading } = useRole(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    if (role === "admin") navigate({ to: "/admin", replace: true });
    else if (role === "maitre") navigate({ to: "/maitre", replace: true });
    else if (role === "famille") navigate({ to: "/famille", replace: true });
  }, [role, isLoading, user, navigate]);

  if (!isLoading && user && !role) {
    return (
      <div className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="text-xl font-bold">Compte sans profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucun rôle n'est associé à ce compte. Contactez l'administration de la structure.
        </p>
      </div>
    );
  }

  return <Chargement />;
}
