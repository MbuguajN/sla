"use client";

import { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  compact?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 200,
  compact = false,
  className,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 4}
        className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#c91f41]/20 dark:border-white/10 dark:bg-white/5 dark:text-white ${className || ""}`}
      />
    );
  }

  return (
    <div data-color-mode="auto" className={`${compact ? "rte-compact" : ""} ${className || ""}`}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        visibleDragbar={false}
        hideToolbar={false}
      />
    </div>
  );
}
