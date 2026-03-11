"use client";

import { Audio } from "./content/Audio";
import { Image } from "./content/Image";
import { RichText } from "./content/RichText";
import { Video } from "./content/Video";
import { Conditional } from "./control/Conditional";
import { ForEach } from "./control/ForEach";
import { Button } from "./layout/Button";
import { Group } from "./layout/Group";
import { Checkboxes } from "./response/Checkboxes";
import { DateInput } from "./response/DateInput";
import { Dropdown } from "./response/Dropdown";
import { LikertScale } from "./response/LikertScale";
import { NumericInput } from "./response/NumericInput";
import { Radio } from "./response/Radio";
import { SingleCheckbox } from "./response/SingleCheckbox";
import { Slider } from "./response/Slider";
import { TextArea } from "./response/TextArea";
import { TextInput } from "./response/TextInput";
import { TimeInput } from "./response/TimeInput";
import { RenderProps } from "./primitives";

export function RenderComponent({
  component,
  form,
  context,
  isLoading,
}: RenderProps) {
  const renderChild = (props: RenderProps) => <RenderComponent {...props} />;

  switch (component.componentFamily) {
    case "content":
      switch (component.template) {
        case "rich-text":
          return <RichText component={component} context={context} />;
        case "image":
          return <Image component={component} />;
        case "video":
          return <Video component={component} />;
        case "audio":
          return <Audio component={component} />;
      }
      break;

    case "response":
      switch (component.template) {
        case "text-input":
          return (
            <TextInput component={component} form={form} context={context} />
          );
        case "text-area":
          return (
            <TextArea component={component} form={form} context={context} />
          );
        case "date-input":
          return (
            <DateInput component={component} form={form} context={context} />
          );
        case "time-input":
          return (
            <TimeInput component={component} form={form} context={context} />
          );
        case "numeric-input":
          return (
            <NumericInput component={component} form={form} context={context} />
          );
        case "single-checkbox":
          return (
            <SingleCheckbox
              component={component}
              form={form}
              context={context}
            />
          );
        case "checkboxes":
          return (
            <Checkboxes component={component} form={form} context={context} />
          );
        case "radio":
          return <Radio component={component} form={form} context={context} />;
        case "dropdown":
          return (
            <Dropdown component={component} form={form} context={context} />
          );
        case "slider":
          return <Slider component={component} form={form} context={context} />;
        case "likert-scale":
          return (
            <LikertScale component={component} form={form} context={context} />
          );
      }
      break;

    case "layout":
      switch (component.template) {
        case "button":
          return <Button component={component} isLoading={isLoading} />;
        case "group":
          return (
            <Group
              component={component}
              form={form}
              context={context}
              isLoading={isLoading}
              renderChild={renderChild}
            />
          );
      }
      break;

    case "control":
      switch (component.template) {
        case "conditional":
          return (
            <Conditional
              component={component}
              form={form}
              context={context}
              isLoading={isLoading}
              renderChild={renderChild}
            />
          );
        case "for-each":
          return (
            <ForEach
              component={component}
              form={form}
              context={context}
              isLoading={isLoading}
              renderChild={renderChild}
            />
          );
      }
      break;
  }

  return (
    <pre className="text-xs my-2 bg-gray-50 p-2 rounded">
      <code>{JSON.stringify(component, null, 2)}</code>
    </pre>
  );
}
