import { BaseComponent, ScreenComponent } from ".";
import { ConditionConfig } from "../conditions";

export interface BaseControlComponent<
  U extends string,
  Props,
> extends BaseComponent<"control", U> {
  props: Props;
}

export interface ConditionalComponent extends BaseControlComponent<
  "conditional",
  {
    if: ConditionConfig;
    component: ScreenComponent;
    else?: ScreenComponent;
  }
> {}

export interface ForEachComponent extends BaseControlComponent<
  "for-each",
  (
    | { type: "static"; values: string[] }
    | { type: "dynamic"; dataKey: `$$${string}` | `$${string}` }
  ) & { component: ScreenComponent }
> {}

export type ControlComponent = ConditionalComponent | ForEachComponent;
