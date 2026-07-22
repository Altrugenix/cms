import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface BreadcrumbNavProps {
  folderPath: BreadcrumbItem[];
  onNavigateRoot: () => void;
  onNavigateBreadcrumb: (index: number) => void;
}

export function BreadcrumbNav({
  folderPath,
  onNavigateBreadcrumb,
  onNavigateRoot,
}: BreadcrumbNavProps) {
  if (folderPath.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <button
        onClick={onNavigateRoot}
        className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Root
      </button>
      <ChevronRight className="h-3.5 w-3.5" />
      {folderPath.map((crumb, i) => (
        <span key={crumb.id ?? "root"} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {i === folderPath.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.name}</span>
          ) : (
            <button
              onClick={() => onNavigateBreadcrumb(i)}
              className="rounded px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              {crumb.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
