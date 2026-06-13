import React from "react";
import { Download } from "lucide-react";

export default function ExportButton({ disabled, onClick, label, children }) {
  const content = children || label || "Export Shortlist";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download size={16} className="text-slate-500" />
      {content}
    </button>
  );
}
