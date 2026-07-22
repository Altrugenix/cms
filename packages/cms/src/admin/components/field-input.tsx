import type { FieldDefinition } from "@/lib/api";

import {
  BooleanInput,
  SelectInput,
  RadioInput,
  MultiSelectInput,
  ColorInput,
  TextareaInput,
  RichTextInput,
  MarkdownInput,
  CodeInput,
  JsonInput,
  DefaultTextInput,
  MediaUploadInput,
  RelationPicker,
  ComponentInput,
  DynamicZoneInput,
  ArrayInput,
  ObjectInput,
  RepeaterInput,
  TabsInput,
} from "./field-types";

type FieldInputProps = {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

function NestedFields({
  fields,
  onChange,
  values,
}: {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldInput
          key={f.name}
          field={f}
          value={values[f.name] ?? ""}
          onChange={(val) => onChange({ ...values, [f.name]: val })}
        />
      ))}
    </div>
  );
}

export function FieldInput({ error, field, onChange, value }: FieldInputProps) {
  const strVal = typeof value === "string" ? value : value != null ? String(value) : "";

  const renderNested: React.ComponentProps<typeof ComponentInput>["renderNested"] = (props) => (
    <NestedFields {...props} />
  );

  if (field.type === "media" || field.type === "upload") {
    return <MediaUploadInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "relation" && field.to) {
    return <RelationPicker field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "boolean" || field.type === "checkbox") {
    return <BooleanInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "select") {
    return <SelectInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "radio") {
    return <RadioInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "multiSelect") {
    return <MultiSelectInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "color") {
    return <ColorInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "component") {
    return (
      <ComponentInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "dynamicZone") {
    return (
      <DynamicZoneInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "array") {
    return (
      <ArrayInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "object" || field.type === "group") {
    return (
      <ObjectInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "repeater") {
    return (
      <RepeaterInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "tabs") {
    return (
      <TabsInput
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        renderNested={renderNested}
      />
    );
  }

  if (field.type === "code") {
    return <CodeInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "json") {
    return <JsonInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "richText") {
    return <RichTextInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "markdown") {
    return <MarkdownInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "textarea") {
    return <TextareaInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  return <DefaultTextInput field={field} strVal={strVal} onChange={onChange} error={error} />;
}
