import { ContentComponent } from "./content";
import { ControlComponent } from "./control";
import { LayoutComponent } from "./layout";
import { ResponseComponent } from "./response";

type ComponentFamily = "layout" | "content" | "response" | "control";

export interface BaseComponent<T extends ComponentFamily, U extends string> {
  id?: string;
  componentFamily: T;
  template: U;
}

export type ScreenComponent =
  | ControlComponent
  | ContentComponent
  | ResponseComponent
  | LayoutComponent;
