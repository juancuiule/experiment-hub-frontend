"use client";

import { ScreenComponent } from "@/lib/components";
import { ForEachComponent } from "@/lib/components/control";
import { getValue } from "@/lib/conditions";
import { Context } from "@/lib/types";
import { Fragment, useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { RenderProps, resolveString } from "../primitives";
import { deepMerge } from "@/lib/flow";

type Props = {
  component: ForEachComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
  isLoading: boolean;
  renderChild: (props: RenderProps) => React.ReactNode;
};

export function ForEach({
  component,
  form,
  context,
  isLoading,
  renderChild,
}: Props) {
  const { component: template } = component.props;
  const formValues = useWatch({ control: form.control });

  const items: string[] = useMemo(() => {
    return component.props.type === "static"
      ? component.props.values
      : getValue(context, component.props.dataKey) || [];
  }, [context, formValues]);

  return (
    <>
      {items.map((itemValue, index) => {
        const itemContext: Context = deepMerge(context, {
          screenData: { foreach: { value: itemValue, index } },
        });

        return (
          <Fragment key={index}>
            {renderChild({
              component: template,
              form,
              context: itemContext,
              isLoading,
            })}
          </Fragment>
        );
      })}
    </>
  );
}
