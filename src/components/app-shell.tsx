import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/hooks/use-auth";

type NavItem = { to: string; label: string };

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Synthèse" },
    { to: "/admin/maitres", label: "Maîtres" },
    { to: "/admin/familles", label: "Familles" },
    { to: "/admin/affectations", label: "Affectations" },
  ],
  maitre: [{ to: "/maitre", label: "Mon espace" }],
  famille: [{ to: "/famille", label: "Mon espace" }],
};

export function AppShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: Role;
  title: string;
  subtitle?: string | undefined;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV[role];

  async function seDeconnecter() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "connexion" }, replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={seDeconnecter}
            aria-label="Se déconnecter"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-4">{children}</main>

      {items.length > 1 ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card">
          <div className="mx-auto grid max-w-4xl grid-cols-4">
            {items.map((item) => {
              const actif = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-3 text-[11px] font-semibold transition-colors",
                    actif ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-1 w-6 rounded-full",
                      actif ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
