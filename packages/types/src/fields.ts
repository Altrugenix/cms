export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "password"
  | "url"
  | "json"
  | "richText"
  | "markdown"
  | "code"
  | "color"
  | "media"
  | "upload"
  | "select"
  | "multiSelect"
  | "radio"
  | "checkbox"
  | "relation"
  | "component"
  | "dynamicZone"
  | "array"
  | "object"
  | "tabs"
  | "group"
  | "repeater"
  | "slug";

export interface FieldValidation {
  required?: boolean | undefined;
  unique?: boolean | undefined;
  min?: number | undefined;
  max?: number | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  pattern?: string | undefined;
  message?: string | undefined;
  custom?: ((value: unknown) => boolean | string) | undefined;
}

export interface FieldBase {
  name: string;
  type: FieldType;
  label?: string | undefined;
  localized?: boolean | undefined;
  defaultValue?: unknown | undefined;
  validation?: FieldValidation | undefined;
  admin?:
    | {
        description?: string | undefined;
        placeholder?: string | undefined;
        hidden?: boolean | undefined;
        readOnly?: boolean | undefined;
        order?: number | undefined;
        width?: string | undefined;
      }
    | undefined;
}

export interface TextField extends FieldBase {
  type: "text";
}

export interface TextareaField extends FieldBase {
  type: "textarea";
}

export interface NumberField extends FieldBase {
  type: "number";
}

export interface BooleanField extends FieldBase {
  type: "boolean";
}

export interface DateField extends FieldBase {
  type: "date";
}

export interface DateTimeField extends FieldBase {
  type: "datetime";
}

export interface EmailField extends FieldBase {
  type: "email";
}

export interface PasswordField extends FieldBase {
  type: "password";
}

export interface UrlField extends FieldBase {
  type: "url";
}

export interface JsonField extends FieldBase {
  type: "json";
}

export interface RichTextField extends FieldBase {
  type: "richText";
}

export interface MarkdownField extends FieldBase {
  type: "markdown";
}

export interface CodeField extends FieldBase {
  type: "code";
  language?: string | undefined;
}

export interface ColorField extends FieldBase {
  type: "color";
  format?: "hex" | "rgb" | "rgba" | "hsl" | undefined;
}

export interface MediaField extends FieldBase {
  type: "media";
  multiple?: boolean | undefined;
  allowedTypes?: Array<"image" | "video" | "audio" | "document"> | undefined;
}

export interface UploadField extends FieldBase {
  type: "upload";
  multiple?: boolean | undefined;
  allowedTypes?: Array<"image" | "video" | "audio" | "document"> | undefined;
}

export interface SelectField extends FieldBase {
  type: "select";
  options: Array<{ label: string; value: string }>;
}

export interface MultiSelectField extends FieldBase {
  type: "multiSelect";
  options: Array<{ label: string; value: string }>;
}

export interface RadioField extends FieldBase {
  type: "radio";
  options: Array<{ label: string; value: string }>;
}

export interface CheckboxField extends FieldBase {
  type: "checkbox";
}

export interface RelationField extends FieldBase {
  type: "relation";
  to: string;
  kind?: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany" | undefined;
}

export interface ComponentField extends FieldBase {
  type: "component";
  component: string;
  repeatable?: boolean | undefined;
}

export interface DynamicZoneField extends FieldBase {
  type: "dynamicZone";
  components: string[];
}

export interface ArrayField extends FieldBase {
  type: "array";
  fields: FieldDefinition[];
}

export interface ObjectField extends FieldBase {
  type: "object";
  fields: FieldDefinition[];
}

export interface TabsField extends FieldBase {
  type: "tabs";
  tabs: Array<{ label: string; fields: FieldDefinition[] }>;
}

export interface GroupField extends FieldBase {
  type: "group";
  fields: FieldDefinition[];
}

export interface RepeaterField extends FieldBase {
  type: "repeater";
  fields: FieldDefinition[];
}

export interface SlugField extends FieldBase {
  type: "slug";
  source?: string | undefined;
  unique?: boolean | undefined;
}

export type FieldDefinition =
  | TextField
  | TextareaField
  | NumberField
  | BooleanField
  | DateField
  | DateTimeField
  | EmailField
  | PasswordField
  | UrlField
  | JsonField
  | RichTextField
  | MarkdownField
  | CodeField
  | ColorField
  | MediaField
  | UploadField
  | SelectField
  | MultiSelectField
  | RadioField
  | CheckboxField
  | RelationField
  | ComponentField
  | DynamicZoneField
  | ArrayField
  | ObjectField
  | TabsField
  | GroupField
  | RepeaterField
  | SlugField;
