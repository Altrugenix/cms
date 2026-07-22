import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  limit: number;
  offset: number;
  total: number;
  onChange: (limit: number, offset: number) => void;
};

function getPageNumbers(total: number, limit: number, currentOffset: number): (number | "...")[] {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(currentOffset / limit) + 1;

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (currentPage > 3) {
    pages.push("...");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({ limit, offset, onChange, total }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const pages = getPageNumbers(total, limit, offset);

  if (total <= limit) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <Button
          aria-label="Previous page"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage <= 1}
          onClick={() => onChange(limit, (currentPage - 2) * limit)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={page}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onChange(limit, (page - 1) * limit)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          aria-label="Next page"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage >= totalPages}
          onClick={() => onChange(limit, currentPage * limit)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </nav>
    </div>
  );
}
