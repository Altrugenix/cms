export const PKG_NAME = "@arche-cms/types";

export type BackendMode = "rest" | "firebase";

export type {
  FieldType,
  FieldBase,
  FieldValidation,
  FieldDefinition,
  TextField,
  TextareaField,
  NumberField,
  BooleanField,
  DateField,
  DateTimeField,
  EmailField,
  PasswordField,
  UrlField,
  JsonField,
  RichTextField,
  MarkdownField,
  CodeField,
  ColorField,
  MediaField,
  UploadField,
  SelectField,
  MultiSelectField,
  RadioField,
  CheckboxField,
  RelationField,
  ComponentField,
  DynamicZoneField,
  ArrayField,
  ObjectField,
  TabsField,
  GroupField,
  RepeaterField,
  SlugField,
} from "./fields.js";

export type {
  CollectionDefinition,
  GlobalDefinition,
  ComponentDefinition,
  Labels,
} from "./schema.js";

export type { PluginDefinition, PluginHooks, PluginRegistration } from "./plugin.js";

export type { EventMap, CMSContext, Logger, LifecycleHooks, Config, ConfigLoader } from "./core.js";
