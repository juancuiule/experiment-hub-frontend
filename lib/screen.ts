export type Button = {
  type: "button";
  label: string;
};

export type CheckboxGroup = {
  type: "checkbox-group";
  dataKey: string;
  label: string;
  options: { label: string; value: string }[];
};

export type Input = {
  type: "input";
  dataKey: string;
  label: string;
  placeholder?: string;
};

export type Rating = {
  type: "rating";
  dataKey: string;
  label: string;
  scale: number;
};

export type ScreenComponent = Input | CheckboxGroup | Button | Rating;

export type FrameworkScreen = {
  slug: string;
  // name: string;
  // description?: string;
  components: ScreenComponent[];
};
