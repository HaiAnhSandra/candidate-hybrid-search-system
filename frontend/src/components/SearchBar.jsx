import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({ inputRef, query, onChange, onSearch, loading }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center"
    >
      <input
        type="text"
        ref={inputRef}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search candidates... e.g. 'senior Java engineer in Hanoi'"
        className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E53E3E] px-6 text-sm font-semibold text-white transition hover:bg-[#C53030] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          "Searching..."
        ) : (
          <>
            <Search size={18} className="text-white" />
            Search
          </>
        )}
      </button>
    </form>
  );
}
