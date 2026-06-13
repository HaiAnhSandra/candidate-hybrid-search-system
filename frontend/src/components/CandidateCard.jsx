import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  MapPin
} from "lucide-react";
import SaveJobModal from "./SaveJobModal.jsx";
import ShareDropdown from "./ShareDropdown.jsx";

const SENIORITY_LABELS = {
  0: "Fresher",
  1: "Junior",
  2: "Mid",
  3: "Senior",
  4: "Lead",
  5: "Expert"
};

const AVAILABILITY_DOT = {
  available: "bg-emerald-500",
  open: "bg-amber-400",
  closed: "bg-rose-500"
};

function scorePalette(score) {
  if (score >= 80) {
    return { badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-300" };
  }
  if (score >= 60) {
    return { badge: "bg-yellow-100 text-yellow-800", border: "border-yellow-300" };
  }
  if (score >= 40) {
    return { badge: "bg-orange-100 text-orange-800", border: "border-orange-300" };
  }
  return { badge: "bg-red-100 text-red-800", border: "border-red-300" };
}

function formatSalary(value) {
  if (!value) {
    return null;
  }
  return Math.round(value / 1_000_000);
}

function isPlaceholderText(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "boolean") {
    return true;
  }

  const text = String(value).trim().toLowerCase();
  return text === "" || text === "-" || text === "location" || text === "unknown" || text === "level";
}

function pickDisplayValue(...values) {
  const selectedValue = values.find((value) => !isPlaceholderText(value));
  return selectedValue === undefined ? null : selectedValue;
}

function normalizeSaveCandidate(candidate) {
  const salaryMin = candidate?.salary_expectation_min ?? candidate?.salaryMin ?? null;
  const salaryMax = candidate?.salary_expectation_max ?? candidate?.salaryMax ?? null;

  const locationText =
    candidate?.location_display || candidate?.location_city || candidate?.location || candidate?.city || candidate?.work_location || "";
  const availabilityText =
    candidate?.availability_display || candidate?.availability_status || candidate?.availability || "";
  const yearsText =
    candidate?.years_experience_display ?? candidate?.years_of_experience ?? candidate?.years ?? candidate?.yoe ?? candidate?.experience_years ?? null;
  const seniorityText = candidate?.seniority || (candidate?.seniority_level !== undefined && candidate?.seniority_level !== null ? `Level ${candidate.seniority_level}` : "");
  const titleText =
    candidate?.title_display || candidate?.title || candidate?.role || candidate?.current_title || candidate?.position || candidate?.job_titles_canonical?.[0] || "";

  return {
    ...candidate,
    location_city: locationText,
    location_display: locationText,
    availability_status: availabilityText,
    availability_display: availabilityText,
    years_of_experience: yearsText,
    years_experience_display: yearsText,
    seniority_level: candidate?.seniority_level,
    seniority: seniorityText,
    seniority_display: seniorityText,
    title_display: titleText,
    job_titles_canonical: candidate?.job_titles_canonical || (candidate?.title ? [candidate.title] : []),
    salary_expectation_min:
      salaryMin === null ? null : Number(salaryMin) >= 1_000_000 ? Number(salaryMin) : Number(salaryMin) * 1_000_000,
    salary_expectation_max:
      salaryMax === null ? null : Number(salaryMax) >= 1_000_000 ? Number(salaryMax) : Number(salaryMax) * 1_000_000
  };
}

export default function CandidateCard({ candidate, onSave }) {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState("");
  const [isSaveJobOpen, setIsSaveJobOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [jobOrders, setJobOrders] = useState([
    {
      id: "vng-frontend",
      title: "Senior Frontend Engineer",
      company: "VNG",
      date: "20 Mar 2026",
      count: 3
    },
    {
      id: "tiki-java",
      title: "Senior Java Developer",
      company: "Tiki",
      date: "25 Apr 2026",
      count: 7
    },
    {
      id: "momo-devops",
      title: "DevOps Lead",
      company: "MoMo",
      date: "1 May 2026",
      count: 2
    }
  ]);
  const isSaved = Boolean(candidate?.isSaved);
  const scoreValue = Math.round(Number(candidate.relevance_score ?? 0));
  const palette = scorePalette(scoreValue);
  const primarySkills = candidate.skills_primary || [];
  const displayedSkills = primarySkills.slice(0, 4);
  const extraSkills = primarySkills.length - displayedSkills.length;
  const businessDomains = (candidate.business_domains || []).slice(0, 2);
  const title = candidate.job_titles_canonical?.[0] || "Title not specified";
  const salaryMin = formatSalary(candidate.salary_expectation_min);
  const salaryMax = formatSalary(candidate.salary_expectation_max);
  const locationText = pickDisplayValue(
    candidate.location_display,
    candidate.location_city,
    candidate.location,
    candidate.city
  );
  const availabilityText = pickDisplayValue(
    candidate.availability_display,
    candidate.availability_status,
    candidate.availability,
    candidate.status
  );
  const yearsExperience = pickDisplayValue(
    candidate.years_experience_display,
    candidate.years_of_experience,
    candidate.years
  );
  const seniorityText = pickDisplayValue(
    candidate.seniority_display,
    candidate.seniority,
    candidate.seniority_level !== undefined && candidate.seniority_level !== null
      ? SENIORITY_LABELS[candidate.seniority_level]
      : null
  );
  const salaryText =
    pickDisplayValue(candidate.salary_display) ||
    (salaryMin && salaryMax
      ? `${salaryMin} - ${salaryMax} trieu VND`
      : "Salary not specified");
  const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => setToastMessage(""), 2000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const showToast = (message) => {
    setToastMessage(message);
  };

  const handleSave = (currentCandidate) => {
    const normalizedCandidate = normalizeSaveCandidate(currentCandidate);
    if (typeof onSave === "function") {
      onSave(normalizedCandidate);
    }
    setActiveCandidate(normalizedCandidate);
    setIsSaveJobOpen(true);
  };

  const saveCandidateToJobOrder = (currentCandidate, jobOrder) => {
    if (!currentCandidate || !jobOrder) {
      return;
    }

    setJobOrders((prev) =>
      prev.map((item) =>
        item.id === jobOrder.id
          ? { ...item, count: (item.count || 0) + 1 }
          : item
      )
    );
    setToastMessage(`Saved to ${jobOrder.title}`);
    setIsSaveJobOpen(false);
    setActiveCandidate(null);
  };

  const createJobOrderAndSave = (currentCandidate, jobOrderName) => {
    if (!currentCandidate || !jobOrderName) {
      return;
    }

    const newJobOrder = {
      id: `job-${Date.now()}`,
      title: jobOrderName,
      company: "Custom",
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }),
      count: 1
    };

    setJobOrders((prev) => [newJobOrder, ...prev]);
    setToastMessage(`Created and saved to ${jobOrderName}`);
    setIsSaveJobOpen(false);
    setActiveCandidate(null);
  };

  return (
    <>
      <div
        className={`grid min-h-[100px] items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${palette.border} border-l-4`}
        style={{ 
          gridTemplateColumns: "72px 300px minmax(460px, 1fr) 170px 240px",
          columnGap: "24px"
        }}
      >
      {/* Removed Loved/Save button as per design change */}
      <div className="flex justify-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${palette.badge}`}
        >
          {scoreValue}
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-1 pr-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{fullName || "Candidate"}</h3>
          <span className="inline-flex max-w-[90px] items-center truncate rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]">
            {seniorityText || "Not specified"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{title}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <MapPin size={12} className="text-gray-400" />
          {locationText || "Not specified"} · {availabilityText || "Not specified"}
        </p>
      </div>

      <div className="skills-section min-w-0 flex">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {displayedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[#EDF2F7] px-3 py-1 text-xs font-semibold text-[#4A5568]"
              >
                {skill}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="rounded-full bg-[#E2E8F0] px-3 py-1 text-xs font-semibold text-[#4A5568]">
                +{extraSkills} more
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {businessDomains.length ? (
              businessDomains.map((domain) => (
                <span
                  key={domain}
                  className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                >
                  {domain}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Not specified</span>
            )}
          </div>
        </div>
      </div>

      <div className="salary-section flex w-[130px] shrink-0 items-center self-center">
        <div className="w-full">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Banknote size={12} className="text-gray-400" />
            {salaryText}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} className="text-gray-400" />
            {yearsExperience === null ? "Not specified" : `${yearsExperience} years exp`}
          </p>
        </div>
      </div>

      <div className="actions-section w-[240px] shrink-0 self-center">
        <div className="action-buttons grid w-[240px] grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSave(candidate)}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500 px-2 text-xs font-semibold leading-none text-red-600 transition hover:bg-red-50"
          >
            {isSaved ? (
              <BookmarkCheck size={13} className="text-red-500" />
            ) : (
              <Bookmark size={13} className="text-red-500" />
            )}
            <span>Save for Job</span>
          </button>

          <ShareDropdown
            candidate={candidate}
            onToast={showToast}
            buttonLabel="Share"
            menuClassName="min-w-0 w-full"
            buttonClassName="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500 px-2 text-xs font-semibold leading-none text-red-600 transition hover:bg-red-50"
          />

          <button
            type="button"
            onClick={() =>
              navigate(`/candidate/${candidate.candidate_id}`, {
                state: { candidate, from: "search" }
              })
            }
            className="col-span-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E53E3E] px-2 text-xs font-semibold leading-none text-white transition hover:bg-[#C53030]"
          >
            <ExternalLink size={13} className="text-white" />
            <span>View Profile</span>
          </button>
        </div>
      </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {isSaveJobOpen && (
        <SaveJobModal
          candidate={activeCandidate}
          jobOrders={jobOrders}
          onClose={() => {
            setIsSaveJobOpen(false);
            setActiveCandidate(null);
          }}
          onSaveToJobOrder={(jobOrder) => saveCandidateToJobOrder(activeCandidate, jobOrder)}
          onCreateJobOrder={(jobOrderName) =>
            createJobOrderAndSave(activeCandidate, jobOrderName)
          }
        />
      )}
    </>
  );
}
