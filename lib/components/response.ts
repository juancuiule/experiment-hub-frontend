import { BaseComponent } from ".";

type ResponseComponentBaseProps = {
  dataKey: string;
  embedd?: boolean;
  required?: boolean;
  errorMessage?: string;
};

export interface BaseResponseComponent<
  U extends string,
  Props,
> extends BaseComponent<"response", U> {
  props: Props & ResponseComponentBaseProps;
}

export interface SliderComponent extends BaseResponseComponent<
  "slider",
  {
    label: string;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    minLabel?: string;
    maxLabel?: string;
  }
> {}

export interface SingleCheckboxComponent extends BaseResponseComponent<
  "single-checkbox",
  {
    label: string;
    defaultValue: boolean;
    shouldBe?: boolean;
  }
> {}

export interface TextInputComponent extends BaseResponseComponent<
  "text-input",
  {
    label: string;
    placeholder?: string;
  }
> {}

// TODO: add date and time input
export interface DateInputComponent extends BaseResponseComponent<
  "date-input",
  {}
> {}
export interface TimeInputComponent extends BaseResponseComponent<
  "time-input",
  {}
> {}

export type Option = {
  label: string;
  value: string;
};

export interface DropdownComponent extends BaseResponseComponent<
  "dropdown",
  {
    label: string;
    options: Option[];
  }
> {}

export interface RadioComponent extends BaseResponseComponent<
  "radio",
  {
    label: string;
    options: Option[];
  }
> {}

export interface CheckboxComponent extends BaseResponseComponent<
  "checkbox",
  {
    label: string;
    options: Option[];
    min?: number;
    max?: number;
  }
> {}

export interface MultipleCheckComponent extends BaseResponseComponent<
  "multiple-check",
  {
    label: string;
    options: Option[];
    min?: number;
    max?: number;
  }
> {}

export interface RatingComponent extends BaseResponseComponent<
  "rating",
  {
    label: string;
    max: number;
    optionsLabel?: Option[];
  }
> {}

export type ResponseComponent =
  | SliderComponent
  | SingleCheckboxComponent
  | TextInputComponent
  | DateInputComponent
  | TimeInputComponent
  | DropdownComponent
  | RadioComponent
  | CheckboxComponent
  | RatingComponent
  | MultipleCheckComponent;
