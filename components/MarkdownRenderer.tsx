"use client";

import Markdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-pre:bg-gray-100 dark:prose-pre:bg-white/10 prose-code:before:content-none prose-code:after:content-none prose-code:bg-gray-100 dark:prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-a:text-[#c91f41] prose-strong:text-gray-900 dark:prose-strong:text-white ${className || ""}`}>
      <Markdown>{content}</Markdown>
    </div>
  );
}
