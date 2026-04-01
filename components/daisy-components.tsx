"use client";

import { useState } from "react";

// DaisyUI Component Wrappers matching Alabaster Crimson design

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card bg-white dark:bg-[#111111] shadow-sm rounded-2xl border border-transparent dark:border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`card-title text-lg font-bold text-gray-900 dark:text-white ${className}`}>{children}</h2>;
}

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-2xl shadow-sm ${className}`}>
      <table className="table table-zebra w-full bg-white dark:bg-[#111111]">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`font-semibold text-gray-900 dark:text-white px-4 py-3 text-sm text-left ${className}`}>{children}</th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-blue-50 dark:hover:bg-white/5 transition-colors ${className}`}>{children}</tr>;
}

export function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-gray-700 dark:text-zinc-300 ${className}`}>{children}</td>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "error" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  const variantClasses: Record<string, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    error: "btn-error",
    success: "btn-success",
  };

  return (
    <button
      className={`btn ${variantClasses[variant]} btn-${size} rounded-xl ${disabled ? "btn-disabled" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, variant = "primary", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) {
  const variantClasses: Record<string, string> = {
    primary: "badge-primary",
    secondary: "badge-secondary",
    success: "badge-success",
    error: "badge-error",
    warning: "badge-warning",
    info: "badge-info",
  };

  return (
    <div className={`badge ${variantClasses[variant]} rounded-lg ${className}`}>{children}</div>
  );
}

export function Alert({ children, variant = "info", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) {
  const variantClasses: Record<string, string> = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error",
  };

  return (
    <div role="alert" className={`alert ${variantClasses[variant]} rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={`modal ${open ? "modal-open" : ""}`} onClick={onClose}>
      <div className="modal-box w-full max-w-md rounded-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
        <div className="py-4">{children}</div>
        <div className="modal-action">
          <button className="btn btn-ghost rounded-lg" onClick={onClose}>
            Close
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}

export function Avatar({ name, size = "md", className = "" }: { name: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-md",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div className={`avatar placeholder ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-primary text-primary-content font-bold flex items-center justify-center`}>
        <span>{name[0]?.toUpperCase() || "?"}</span>
      </div>
    </div>
  );
}

export function Divider({ text, className = "" }: { text?: string; className?: string }) {
  return <div className={`divider ${className}`}>{text}</div>;
}

export function Stat({ label, value, icon = null }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="stat place-items-center">
      {icon && <div className="stat-figure text-primary">{icon}</div>}
      <div className="stat-value text-primary">{value}</div>
      <div className="stat-title">{label}</div>
    </div>
  );
}

export function Stats({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`stats shadow-sm rounded-2xl bg-white dark:bg-[#111111] border border-transparent dark:border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export function FormGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text font-semibold text-gray-900 dark:text-white">{label}</span>
      </label>
      {children}
      {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
    </div>
  );
}

export function Input({
  type = "text",
  placeholder = "",
  error = false,
  size = "md",
  className = "",
  ...props
}: {
  type?: string;
  placeholder?: string;
  error?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  [key: string]: any;
}) {
  const sizeClasses = {
    xs: "input-xs",
    sm: "input-sm",
    md: "input-md",
    lg: "input-lg",
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`input input-bordered rounded-xl w-full ${sizeClasses[size]} ${error ? "input-error" : ""} ${className}`}
      {...props}
    />
  );
}

export function Select({
  label,
  options = [],
  error = false,
  className = "",
  ...props
}: {
  label?: string;
  options: Array<{ value: string | number; label: string }>;
  error?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <select
      className={`select select-bordered rounded-xl w-full ${error ? "select-error" : ""} ${className}`}
      {...props}
    >
      {label && <option disabled selected>{label}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Textarea({
  placeholder = "",
  error = false,
  rows = 4,
  className = "",
  ...props
}: {
  placeholder?: string;
  error?: boolean;
  rows?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
      className={`textarea textarea-bordered rounded-xl w-full ${error ? "textarea-error" : ""} ${className}`}
      {...props}
    />
  );
}

export function Collapse({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="collapse collapse-arrow border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] rounded-xl shadow-sm mb-2">
      <input type="checkbox" />
      <div className="collapse-title font-semibold text-gray-900 dark:text-white">{title}</div>
      <div className="collapse-content text-gray-600 dark:text-zinc-400">{children}</div>
    </div>
  );
}

export function Tabs({ tabs }: { tabs: Array<{ label: string; content: React.ReactNode }> }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="tabs tabs-bordered rounded-xl">
      {tabs.map((tab, idx) => (
        <a
          key={idx}
          className={`tab rounded-t-xl ${activeTab === idx ? "tab-active" : ""}`}
          onClick={() => setActiveTab(idx)}
        >
          {tab.label}
        </a>
      ))}
      <div className="pt-4">{tabs[activeTab]?.content}</div>
    </div>
  );
}

export function Progress({ value = 0, max = 100, className = "" }: { value?: number; max?: number; className?: string }) {
  return (
    <progress className={`progress progress-primary w-full rounded-full ${className}`} value={value} max={max} />
  );
}

