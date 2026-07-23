import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { FIELD_TYPE_CONFIG, FIELD_TYPE_GROUPS } from "./field-config";

interface FieldTypePickerProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function FieldTypePicker({ onClose, onSelect }: FieldTypePickerProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Select field type</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {FIELD_TYPE_GROUPS.map((group) => {
        const types = Object.entries(FIELD_TYPE_CONFIG).filter(([, c]) => c.group === group.value);
        if (types.length === 0) return null;
        return (
          <div key={group.value}>
            <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {types.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onSelect(key)}
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
                >
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
