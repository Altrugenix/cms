import { LogOut, Menu } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type HeaderProps = {
  onOpenPalette?: () => void;
  onToggleSidebar?: () => void;
};

export function Header({ onOpenPalette, onToggleSidebar }: HeaderProps) {
  const { logout, user } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b px-3 md:px-6">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Toggle sidebar"
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-sm font-semibold md:text-lg">Arche CMS</h2>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <button
          aria-label="Search (⌘K)"
          onClick={onOpenPalette}
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <svg
            className="h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="rounded border px-1 font-mono text-[10px]">⌘K</kbd>
        </button>
        <ModeToggle />
        {user && (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">{user.email}</span>
            <Button aria-label="Log out" variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
