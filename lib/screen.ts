export type Button = {
  type: "button";
  label: string;
};

export type CheckboxGroup = {
  type: "checkbox-group";
  dataKey: string;
  label: string;
  options: { label: string; value: string }[];
  required?: boolean;
};

export type Input = {
  type: "input";
  dataKey: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputType?: "text" | "number" | "email" | "date";
};

export type Rating = {
  type: "rating";
  dataKey: string;
  label: string;
  scale: number;
  required?: boolean;
};

export type RichText = {
  type: "rich-text";
  content: string;
};

export type ScreenComponent = Input | CheckboxGroup | Button | Rating | RichText;

export type FrameworkScreen = {
  slug: string;
  // name: string;
  // description?: string;
  components: ScreenComponent[];
};
