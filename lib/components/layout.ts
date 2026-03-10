import { BaseComponent, ScreenComponent } from ".";

export interface BaseLayoutComponent<
  U extends string,
  Props,
> extends BaseComponent<"layout", U> {
  props: Props;
}

export interface ButtonComponent extends BaseLayoutComponent<
  "button",
  {
    text?: string;
    disabled?: boolean;
    alignBottom?: boolean;
  }
> {}

export interface ForEachComponent extends BaseLayoutComponent<
  "for-each",
  {
    loopValue: string | string[];
    component: ScreenComponent;
    indexVariableName?: string;
    valueVariableName?: string;
  }
> {}

export interface GroupComponent extends BaseLayoutComponent<
  "group",
  {
    name: string;
    components: ScreenComponent[];
  }
> {}

export type LayoutComponent = ButtonComponent | ForEachComponent | GroupComponent;
