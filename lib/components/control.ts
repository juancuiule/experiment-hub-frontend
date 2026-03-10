import { BaseComponent, ScreenComponent } from ".";
import { ConditionConfig } from "../conditions";

export interface BaseControlCompoment<
  U extends string,
  Props,
> extends BaseComponent<"control", U> {
  props: Props;
}

export interface ConditionalCompoment extends BaseControlCompoment<
  "conditional",
  ConditionConfig & {
    component: ScreenComponent;
  }
> {}

export type ControlComponent = ConditionalCompoment;
