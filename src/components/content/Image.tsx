"use client";

import { ImageComponent } from "@/lib/components/content";

type Props = {
  component: ImageComponent;
};

export function Image({ component }: Props) {
  return (
    <div className="my-3">
      <img src={component.props.url} alt={component.props.alt} className="w-full" />
    </div>
  );
}
