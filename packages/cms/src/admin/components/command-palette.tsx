import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCollections, useGlobals } from "@/lib/hooks";
import { useTheme } from "@/components/theme-provider";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Image,
  Users,
  Shield,
  Settings,
  Plus,
  Sun,
  Moon,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: LucideIcon;
  onSelect: () => void;
};

const pageItems: CommandItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Go to dashboard",
    category: "Pages",
    icon: LayoutDashboard,
    onSelect: () => {},
  },
  {
    id: "nav-collections",
    label: "Collections",
    description: "View all collections",
    category: "Pages",
    icon: FileText,
    onSelect: () => {},
  },
  {
    id: "nav-globals",
    label: "Globals",
    description: "View all globals",
    category: "Pages",
    icon: Globe,
    onSelect: () => {},
  },
  {
    id: "nav-media",
    label: "Media",
    description: "Open media library",
    category: "Pages",
    icon: Image,
    onSelect: () => {},
  },
  {
    id: "nav-users",
    label: "Users",
    description: "Manage users",
    category: "Pages",
    icon: Users,
    onSelect: () => {},
  },
  {
    id: "nav-roles",
    label: "Roles",
    description: "Manage roles",
    category: "Pages",
    icon: Shield,
    onSelect: () => {},
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Application settings",
    category: "Pages",
    icon: Settings,
    onSelect: () => {},
  },
];

const ACTION_DARK = "action-dark";
const ACTION_LOGOUT = "action-logout";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const { data: collections = [] } = useCollections();
  const { data: globals = [] } = useGlobals();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const navigateTo = useCallback(
    (to: string) => {
      onClose();
      navigate({ to });
    },
    [navigate, onClose],
  );

  const items: CommandItem[] = [
    ...pageItems.map((item) => ({
      ...item,
      onSelect: () => navigateTo(item.id.replace("nav-", "/")),
    })),
    ...collections.map((c) => ({
      id: `content-${c.slug}`,
      label: c.label,
      description: `View ${c.label} entries`,
      category: "Content" as const,
      icon: FileText as LucideIcon,
      onSelect: () => navigateTo(`/collections/${c.slug}`),
    })),
    ...collections.map((c) => ({
      id: `create-${c.slug}`,
      label: `New ${c.label}`,
      description: `Create a new ${c.label} entry`,
      category: "Actions" as const,
      icon: Plus as LucideIcon,
      onSelect: () => navigateTo(`/collections/${c.slug}/new`),
    })),
    ...globals.map((g) => ({
      id: `global-${g.slug}`,
      label: g.label,
      description: `Edit ${g.label}`,
      category: "Globals" as const,
      icon: Globe as LucideIcon,
      onSelect: () => navigateTo(`/globals/${g.slug}`),
    })),
    {
      id: ACTION_DARK,
      label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      description: "Toggle color theme",
      category: "Actions",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      onSelect: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        onClose();
      },
    },
    {
      id: ACTION_LOGOUT,
      label: "Log out",
      description: user?.email ? `Sign out as ${user.email}` : "Sign out",
      category: "Actions",
      icon: LogOut,
      onSelect: () => {
        onClose();
        logout();
      },
    },
  ];

  const query = search.toLowerCase().trim();
  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query),
      )
    : items;

  const grouped = filtered.reduce(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {} as Record<string, CommandItem[]>,
  );

  const flatItems = filtered;

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatItems.length - 1)));
  }, [flatItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      flatItems[selectedIndex].onSelect();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* dialog */}
      <div className="relative w-full max-w-lg rounded-lg border bg-background shadow-2xl">
        <div className="flex items-center border-b px-4">
          <svg
            className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
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
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, content, and actions..."
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden rounded border px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {flatItems.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results found
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              {categoryItems.map((item) => {
                const idx = flatItems.indexOf(item);
                const selected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      selected ? "bg-accent text-accent-foreground" : "text-foreground"
                    }`}
                    onClick={() => item.onSelect()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate">{item.label}</p>
                      {item.description && (
                        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  return { open, toggle, openPalette, closePalette };
}
