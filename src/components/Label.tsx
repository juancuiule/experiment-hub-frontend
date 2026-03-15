"use client";

import { resolveValuesInString } from "@/lib/resolve";
import { Context } from "@/lib/types";
import Markdown from "react-markdown";
import { twMerge } from "tailwind-merge";

interface Props extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: string;
  context?: Context;
}

export function Label({ children, context, ...props }: Props) {
  return (
    <label {...props}>
      <Markdown
        allowedElements={[
          "b",
          "i",
          "em",
          "strong",
          "u",
          "s",
          "del",
          "code",
          "a",
          "p",
        ]}
        components={{
          p: ({ children }) => <>{children}</>,
          code: ({ node, className, children, ...props }) => {
            return (
              <code
                className={twMerge(
                  "bg-black/10 px-1 rounded text-sm",
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {context ? resolveValuesInString(children, context) : children}
      </Markdown>
    </label>
  );
}
