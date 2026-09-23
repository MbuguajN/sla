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

/**
 * Tracks the app's theme, which is class-based on <html> (tailwind darkMode:
 * 'class'), so the editor can be told which palette to use.
 *
 * @uiw/react-md-editor defines all of its colour variables under
 * `[data-color-mode*='light']` or `[data-color-mode*='dark']`. The wrapper used
 * to pass "auto", which matches neither selector, so none of those variables
 * existed and the typed text — rendered as a syntax-highlighted <pre>, not the
 * textarea — had no colour in either theme.
 */
function useColorMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");

    read();

    // The theme toggle mutates the class on <html>; follow it live so the
    // editor re-themes without a remount.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return mode;
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
  const colorMode = useColorMode();

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
    <div data-color-mode={colorMode} className={`${compact ? "rte-compact" : ""} ${className || ""}`}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        visibleDragbar={false}
        hideToolbar={false}
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
