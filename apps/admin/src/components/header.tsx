import { useAuth } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Altrugenix CMS</h2>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
