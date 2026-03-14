import { BaseComponent, ScreenComponent } from ".";
import { Condition } from "../conditions";

export interface BaseControlComponent<
  U extends string,
  Props,
> extends BaseComponent<"control", U> {
  props: Props;
}

export interface ConditionalComponent extends BaseControlComponent<
  "conditional",
  {
    if: Condition;
    component: ScreenComponent;
    else?: ScreenComponent;
  }
> {}

export interface ForEachComponent extends BaseControlComponent<
  "for-each",
  (
    | { type: "static"; values: string[] }
    | { type: "dynamic"; dataKey: `$$${string}` | `$${string}` }
  ) & { id: string; component: ScreenComponent }
> {}

export type ControlComponent = ConditionalComponent | ForEachComponent;
