import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";

const SENIORITY_LABELS = {
  0: "Fresher",
  1: "Junior",
  2: "Mid",
  3: "Senior",
  4: "Lead",
  5: "Expert"
};

function toMillions(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue >= 1_000_000 ? Math.round(numericValue / 1_000_000) : Math.round(numericValue);
}

function isPlaceholderText(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "boolean") {
    return true;
  }

  const text = String(value).trim().toLowerCase();
  return (
    text === "" ||
    text === "-" ||
    text === "location" ||
    text === "unknown" ||
    text === "level" ||
    text === "salary not specified" ||
    text === "not specified" ||
    text === "none"
  );
}

function pickDisplayValue(...values) {
  const candidateValue = values.find((value) => !isPlaceholderText(value));
  return candidateValue === undefined ? null : candidateValue;
}

function toSalaryMillions(value) {
  if (isPlaceholderText(value)) {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue >= 1_000_000 ? toMillions(numericValue) : Math.round(numericValue);
}

export default function SaveJobModal({
  candidate,
  jobOrders = [],
  onClose,
  onSaveToJobOrder,
  onCreateJobOrder
}) {
  const initialJobOrderId = jobOrders[0]?.id || "";
  const [selectedJobOrderId, setSelectedJobOrderId] = useState(initialJobOrderId);
  const [newJobOrderName, setNewJobOrderName] = useState("");

  useEffect(() => {
    setSelectedJobOrderId(jobOrders[0]?.id || "");
    setNewJobOrderName("");
  }, [candidate, jobOrders]);

  const selectedJobOrder = useMemo(
    () => jobOrders.find((jobOrder) => jobOrder.id === selectedJobOrderId) || null,
    [jobOrders, selectedJobOrderId]
  );

  const handleSaveExisting = () => {
    if (!selectedJobOrder || typeof onSaveToJobOrder !== "function") {
      return;
    }
    onSaveToJobOrder(selectedJobOrder);
  };

  const handleCreateNew = () => {
    const trimmed = newJobOrderName.trim();
    if (!trimmed || typeof onCreateJobOrder !== "function") {
      return;
    }
    onCreateJobOrder(trimmed);
  };

  const candidateName =
    `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
    candidate?.name ||
    "Candidate";
  const candidateLocation = pickDisplayValue(
    candidate?.location_display,
    candidate?.location_city,
    candidate?.location
  ) || "Not specified";
  const candidateAvailability =
    pickDisplayValue(candidate?.availability_display, candidate?.availability_status, candidate?.availability) ||
    "Not specified";
  const candidateExperienceValue = pickDisplayValue(
    candidate?.years_experience_display,
    candidate?.years_of_experience,
    candidate?.years
  );
  const candidateExperience =
    candidateExperienceValue === null ? "Not specified" : candidateExperienceValue;
  const candidateSeniority =
    pickDisplayValue(
      candidate?.seniority_display,
      candidate?.seniority,
      SENIORITY_LABELS[candidate?.seniority_level],
      candidate?.seniority_level !== undefined && candidate?.seniority_level !== null
        ? `Level ${candidate.seniority_level}`
        : null
    ) || "Not specified";
  const candidateTitle =
    pickDisplayValue(candidate?.title_display, candidate?.job_titles_canonical?.[0], candidate?.title) ||
    "Role not specified";
  const salaryMin = candidate?.salary_expectation_min ?? candidate?.salaryMin ?? null;
  const salaryMax = candidate?.salary_expectation_max ?? candidate?.salaryMax ?? null;
  const candidateSalary =
    pickDisplayValue(candidate?.salary_display) ||
    (() => {
      const min = toSalaryMillions(salaryMin);
      const max = toSalaryMillions(salaryMax);
      if (min !== null && max !== null) {
        return `${min} - ${max} million VND`;
      }
      if (min !== null) {
        return `${min} million VND`;
      }
      if (max !== null) {
        return `${max} million VND`;
      }
      return "Salary not specified";
    })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              Save Candidate
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Save {candidateName} to a Job Order
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-red-500 hover:text-slate-900"
            aria-label="Close save dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Choose an existing job order</p>
              <p className="mt-1 text-sm text-slate-500">
                Select the job order where this candidate should be saved.
              </p>
            </div>

            <div className="space-y-2">
              {jobOrders.length ? (
                jobOrders.map((jobOrder) => {
                  const isSelected = jobOrder.id === selectedJobOrderId;
                  return (
                    <button
                      key={jobOrder.id}
                      type="button"
                      onClick={() => setSelectedJobOrderId(jobOrder.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-red-500 bg-red-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {jobOrder.title}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {jobOrder.company} {jobOrder.date ? `· ${jobOrder.date}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No job orders yet. Create a new one to save this candidate.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Create a new job order</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a new job order and save this candidate to it immediately.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={newJobOrderName}
                  onChange={(event) => setNewJobOrderName(event.target.value)}
                  placeholder="New job order name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={!newJobOrderName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C53030] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={14} className="text-white" />
                  Create & Save
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                Candidate
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{candidateName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {candidateTitle}
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Location:</span>{" "}
                {candidateLocation}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Experience:</span>{" "}
                {candidateExperience}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Seniority:</span>{" "}
                {candidateSeniority}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Availability:</span>{" "}
                {candidateAvailability}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Salary:</span>{" "}
                {candidateSalary}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Selected job order:</span>{" "}
                {selectedJobOrder ? selectedJobOrder.title : "None"}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveExisting}
                disabled={!selectedJobOrder}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Briefcase size={14} className="text-red-500" />
                Save to Selected Job Order
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
