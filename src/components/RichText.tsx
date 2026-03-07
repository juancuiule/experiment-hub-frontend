import Markdown from "react-markdown";

type Props = {
  content: string;
};

export default function RichText({ content }: Props) {
  return (
    <div className="prose dark:prose-invert">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold">{children}</h2>
          ),
          p: ({ children }) => <p className="text-base">{children}</p>,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-500 hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
