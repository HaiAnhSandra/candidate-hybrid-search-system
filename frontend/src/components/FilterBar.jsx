import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";

const LOCATION_OPTIONS = [
  { label: "All", value: null },
  { label: "Hanoi", value: "Hanoi" },
  { label: "Ho Chi Minh City", value: "Ho Chi Minh City" },
  { label: "Da Nang", value: "Da Nang" }
];

const SENIORITY_OPTIONS = [
  { label: "All", value: null },
  { label: "Junior", value: 1 },
  { label: "Mid", value: 2 },
  { label: "Senior", value: 3 },
  { label: "Lead", value: 4 },
  { label: "Expert", value: 5 }
];

const AVAILABILITY_OPTIONS = [
  { label: "All", value: null },
  { label: "Available", value: "available" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" }
];

const SKILL_SUGGESTIONS = [
  "Java",
  "Python",
  "React",
  "Node.js",
  "Flutter",
  "Go",
  "Kubernetes",
  "Angular",
  "Vue.js",
  "React Native",
  "Swift",
  "TypeScript",
  "Docker",
  "AWS",
  "Machine Learning"
];

const DOMAIN_OPTIONS = [
  "FinTech",
  "Banking",
  "E-commerce",
  "Healthcare",
  "Logistics",
  "Insurance",
  "SaaS",
  "Gaming",
  "EdTech"
];

const DEFAULT_FILTERS = {
  location_city: null,
  seniority_level: null,
  availability_status: null,
  required_skills: [],
  business_domains: [],
  salary_min: null,
  salary_max: null,
  experience_min: null,
  experience_max: null,
  date_from: null,
  date_to: null,
  technical_only: false
};

const parseSalaryInput = (value) => {
  if (!value) return null;

  let cleaned = value.toString().trim();

  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (dotCount > 1) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (commaCount > 1) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (dotCount === 1 && commaCount === 0) {
    const parts = cleaned.split(".");
    if (parts[1].length <= 2) {
      return Math.round(parseFloat(cleaned) * 1_000_000);
    }
    cleaned = cleaned.replace(/\./g, "");
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = cleaned.split(",");
    if (parts[1].length <= 2) {
      return Math.round(parseFloat(cleaned.replace(",", ".")) * 1_000_000);
    }
    cleaned = cleaned.replace(/,/g, "");
  }

  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return null;

  if (num >= 1_000_000) {
    return Math.round(num);
  }

  return Math.round(num * 1_000_000);
};

export default function FilterBar({ filters, onChange }) {
  const [skillInput, setSkillInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const moreFiltersCount = useMemo(() => {
    let count = 0;
    count += filters.business_domains.length;
    if (filters.salary_min !== null && filters.salary_min !== "") {
      count += 1;
    }
    if (filters.salary_max !== null && filters.salary_max !== "") {
      count += 1;
    }
    if (filters.experience_min !== null && filters.experience_min !== "") {
      count += 1;
    }
    if (filters.experience_max !== null && filters.experience_max !== "") {
      count += 1;
    }
    if (filters.date_from) {
      count += 1;
    }
    if (filters.date_to) {
      count += 1;
    }
    return count;
  }, [filters]);

  const hasAnyFilters = useMemo(() => {
    return (
      Boolean(filters.location_city) ||
      filters.seniority_level !== null ||
      Boolean(filters.availability_status) ||
      filters.required_skills.length > 0 ||
      filters.business_domains.length > 0 ||
      Boolean(filters.salary_min) ||
      Boolean(filters.salary_max) ||
      Boolean(filters.experience_min) ||
      Boolean(filters.experience_max) ||
      Boolean(filters.date_from) ||
      Boolean(filters.date_to) ||
      filters.technical_only
    );
  }, [filters]);

  const updateFilters = (partial) => {
    onChange({ ...filters, ...partial });
  };

  const handleSkillAdd = (rawSkills) => {
    const current = filters.required_skills || [];
    const normalized = current.map((skill) => skill.toLowerCase());
    const next = [...current];

    rawSkills
      .map((skill) => skill.trim())
      .filter(Boolean)
      .forEach((skill) => {
        if (!normalized.includes(skill.toLowerCase())) {
          next.push(skill);
          normalized.push(skill.toLowerCase());
        }
      });

    updateFilters({ required_skills: next });
  };

  const handleSkillRemove = (skill) => {
    updateFilters({
      required_skills: filters.required_skills.filter((item) => item !== skill)
    });
  };

  const handleSkillInputChange = (event) => {
    const value = event.target.value;
    if (value.includes(",")) {
      const parts = value.split(",");
      handleSkillAdd(parts.slice(0, -1));
      setSkillInput(parts[parts.length - 1]);
      return;
    }
    setSkillInput(value);
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (skillInput.trim()) {
        handleSkillAdd([skillInput]);
        setSkillInput("");
      }
    }
  };

  const handleDomainAdd = (rawDomains) => {
    const current = filters.business_domains || [];
    const normalized = current.map((domain) => domain.toLowerCase());
    const next = [...current];

    rawDomains
      .map((domain) => domain.trim())
      .filter(Boolean)
      .forEach((domain) => {
        if (!normalized.includes(domain.toLowerCase())) {
          next.push(domain);
          normalized.push(domain.toLowerCase());
        }
      });

    updateFilters({ business_domains: next });
  };

  const handleDomainRemove = (domain) => {
    updateFilters({
      business_domains: filters.business_domains.filter((item) => item !== domain)
    });
  };

  const handleDomainInputChange = (event) => {
    const value = event.target.value;
    if (value.includes(",")) {
      const parts = value.split(",");
      handleDomainAdd(parts.slice(0, -1));
      setDomainInput(parts[parts.length - 1]);
      return;
    }
    setDomainInput(value);
  };

  const handleDomainKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (domainInput.trim()) {
        handleDomainAdd([domainInput]);
        setDomainInput("");
      }
    }
  };

  const clearAllFilters = () => {
    onChange({ ...DEFAULT_FILTERS });
    setSkillInput("");
    setDomainInput("");
  };

  return (
    <div className="border-y border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-6 text-sm">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Location
            </span>
            <select
              value={filters.location_city ?? ""}
              onChange={(event) =>
                updateFilters({
                  location_city: event.target.value || null
                })
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent focus:outline-none"
            >
              {LOCATION_OPTIONS.map((option) => (
                <option key={option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Seniority
            </span>
            <select
              value={filters.seniority_level ?? ""}
              onChange={(event) =>
                updateFilters({
                  seniority_level: event.target.value
                    ? Number(event.target.value)
                    : null
                })
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent focus:outline-none"
            >
              {SENIORITY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Availability
            </span>
            <select
              value={filters.availability_status ?? ""}
              onChange={(event) =>
                updateFilters({
                  availability_status: event.target.value || null
                })
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent focus:outline-none"
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pb-1 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={filters.technical_only}
              onChange={(event) =>
                updateFilters({ technical_only: event.target.checked })
              }
              className="h-4 w-4 rounded border border-slate-300 bg-white text-accent focus:border-accent focus:outline-none focus:ring-0"
            />
            Technical Degree Only
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Skills
            </span>
            {filters.required_skills.length > 0 && (
              <button
                type="button"
                onClick={() => updateFilters({ required_skills: [] })}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                aria-label="Clear skills"
              >
                <X size={12} className="text-slate-400" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.required_skills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleSkillRemove(skill)}
                className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
              >
                {skill}
                <X size={12} className="text-white" aria-hidden="true" />
              </button>
            ))}
            <input
              type="text"
              value={skillInput}
              onChange={handleSkillInputChange}
              onKeyDown={handleSkillKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setShowSuggestions(false)}
              placeholder="Type skill and press Enter"
              className="min-w-56 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
            />
          </div>
          {showSuggestions && (
            <div className="flex flex-wrap gap-2">
              {SKILL_SUGGESTIONS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSkillAdd([skill])}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <SlidersHorizontal size={16} className="text-slate-400" />
            {showMore ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
            More Filters ({moreFiltersCount})
          </button>

          <div
            className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${
              showMore
                ? "max-h-96 opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Business Domain
                </span>
                {filters.business_domains.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ business_domains: [] })}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                    aria-label="Clear domains"
                  >
                    <X size={12} className="text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filters.business_domains.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => handleDomainRemove(domain)}
                    className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white"
                  >
                    {domain}
                    <X size={12} className="text-white" aria-hidden="true" />
                  </button>
                ))}
                <input
                  type="text"
                  value={domainInput}
                  onChange={handleDomainInputChange}
                  onKeyDown={handleDomainKeyDown}
                  onFocus={() => setShowDomainSuggestions(true)}
                  onBlur={() => setShowDomainSuggestions(false)}
                  placeholder="Type domain and press Enter"
                  className="min-w-56 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
                />
              </div>
              {showDomainSuggestions && (
                <div className="flex flex-wrap gap-2">
                  {DOMAIN_OPTIONS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleDomainAdd([domain])}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Salary Range
                </span>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="text"
                    value={filters.salary_min ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        salary_min: event.target.value
                          ? parseSalaryInput(event.target.value)
                          : null
                      })
                    }
                    placeholder="e.g. 30 or 30,000,000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
                  />
                  <span>million</span>
                  <input
                    type="text"
                    value={filters.salary_max ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        salary_max: event.target.value
                          ? parseSalaryInput(event.target.value)
                          : null
                      })
                    }
                    placeholder="e.g. 50 or 50,000,000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
                  />
                  <span>million</span>
                </div>
                <p className="text-xs text-slate-500">
                  Enter in millions (30) or full VND (30,000,000)
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Experience Range
                </span>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="number"
                    min="0"
                    value={filters.experience_min ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        experience_min: event.target.value
                          ? Number(event.target.value)
                          : null
                      })
                    }
                    placeholder="Min"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
                  />
                  <span>years</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.experience_max ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        experience_max: event.target.value
                          ? Number(event.target.value)
                          : null
                      })
                    }
                    placeholder="Max"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent focus:outline-none"
                  />
                  <span>years</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Application Date
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                  From
                  <input
                    type="date"
                    value={filters.date_from ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        date_from: event.target.value || null
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                  To
                  <input
                    type="date"
                    value={filters.date_to ?? ""}
                    onChange={(event) =>
                      updateFilters({
                        date_to: event.target.value || null
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {hasAnyFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="w-fit text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}
