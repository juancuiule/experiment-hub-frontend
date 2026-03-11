"use client";

import { Fragment } from "react";
import { UseFormReturn } from "react-hook-form";
import { GroupComponent } from "@/lib/components/layout";
import { ScreenComponent } from "@/lib/components";
import { Context } from "@/lib/types";
import { RenderProps } from "../primitives";

type Props = {
  component: GroupComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
  isLoading: boolean;
  renderChild: (props: RenderProps) => React.ReactNode;
};

export function Group({ component, form, context, isLoading, renderChild }: Props) {
  return (
    <div className="my-2">
      {component.props.components.map((child, i) => (
        <Fragment key={child.componentFamily === "response" ? child.props.dataKey : i}>
          {renderChild({ component: child as ScreenComponent, form, context, isLoading })}
        </Fragment>
      ))}
    </div>
  );
}
