import {
  Type,
  TextQuote,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  Mail,
  Lock,
  Link2,
  Braces,
  FileSpreadsheet,
  Code,
  Palette,
  Image,
  Upload,
  ListChecks,
  List,
  Radio,
  CheckSquare,
  GitBranch,
  Layers,
  LayoutDashboard,
  Box,
  Columns,
  FolderOpen,
  Repeat,
  Link as LinkIcon,
  FileText,
} from "lucide-react";

import type { FieldDefinition } from "@/lib/api";

export const FIELD_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Type; group: string }
> = {
  array: { group: "structure", icon: Box, label: "Array" },
  boolean: { group: "basic", icon: ToggleLeft, label: "Boolean" },
  checkbox: { group: "choice", icon: CheckSquare, label: "Checkbox" },
  code: { group: "advanced", icon: Code, label: "Code" },
  color: { group: "advanced", icon: Palette, label: "Color" },
  component: { group: "structure", icon: Layers, label: "Component" },
  date: { group: "date", icon: Calendar, label: "Date" },
  datetime: { group: "date", icon: Clock, label: "Date Time" },
  dynamicZone: { group: "structure", icon: LayoutDashboard, label: "Dynamic Zone" },
  email: { group: "text", icon: Mail, label: "Email" },
  group: { group: "structure", icon: FolderOpen, label: "Group" },
  json: { group: "advanced", icon: Braces, label: "JSON" },
  markdown: { group: "text", icon: FileSpreadsheet, label: "Markdown" },
  media: { group: "media", icon: Image, label: "Media" },
  multiSelect: { group: "choice", icon: List, label: "Multi Select" },
  number: { group: "basic", icon: Hash, label: "Number" },
  object: { group: "structure", icon: Columns, label: "Object" },
  password: { group: "text", icon: Lock, label: "Password" },
  radio: { group: "choice", icon: Radio, label: "Radio" },
  relation: { group: "advanced", icon: GitBranch, label: "Relation" },
  repeater: { group: "structure", icon: Repeat, label: "Repeater" },
  richText: { group: "text", icon: FileSpreadsheet, label: "Rich Text" },
  select: { group: "choice", icon: ListChecks, label: "Select" },
  slug: { group: "text", icon: LinkIcon, label: "Slug" },
  tabs: { group: "structure", icon: FolderOpen, label: "Tabs" },
  text: { group: "basic", icon: Type, label: "Text" },
  textarea: { group: "basic", icon: TextQuote, label: "Textarea" },
  upload: { group: "media", icon: Upload, label: "Upload" },
  url: { group: "text", icon: Link2, label: "URL" },
};

export const FIELD_TYPE_GROUPS = [
  { label: "Basic", value: "basic" },
  { label: "Text", value: "text" },
  { label: "Date", value: "date" },
  { label: "Choice", value: "choice" },
  { label: "Media", value: "media" },
  { label: "Advanced", value: "advanced" },
  { label: "Structure", value: "structure" },
];

export function defaultField(type: string): FieldDefinition {
  const base: FieldDefinition = { name: "", type };
  switch (type) {
    case "select":
    case "multiSelect":
    case "radio":
      return { ...base, options: [] };
    case "relation":
      return { ...base, to: "" };
    case "component":
      return { ...base, component: "" };
    case "dynamicZone":
      return { ...base, components: [] };
    case "array":
    case "object":
    case "group":
    case "repeater":
      return { ...base, fields: [] };
    case "tabs":
      return { ...base, tabs: [] };
    default:
      return base;
  }
}

export function getFieldConfig(type: string) {
  return FIELD_TYPE_CONFIG[type] ?? { group: "basic", icon: FileText, label: "Text" };
}
