import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  ChevronDown,
  Save,
  X
} from "lucide-react";

import { confirmSaveCandidateCv, parsePreviewCandidateCv } from "../api/candidates.js";

const SOURCE_OPTIONS = [
  "Direct Application",
  "LinkedIn",
  "TopCV",
  "ITviec",
  "VietnamWorks",
  "Referral",
  "Headhunt",
  "Other"
];

const SENIORITY_LABELS = {
  0: "Fresher",
  1: "Junior",
  2: "Mid",
  3: "Senior",
  4: "Lead",
  5: "Expert"
};

const DEGREE_LEVEL_LABELS = {
  0: "None / Not specified",
  1: "Associate / College diploma",
  2: "Bachelor",
  3: "Master",
  4: "PhD"
};

const AVAILABILITY_OPTIONS = ["available", "open", "closed"];

const ARRAY_FIELDS = [
  "skills_primary",
  "skills_secondary",
  "skills_exposure",
  "business_domains",
  "technical_domains",
];

const INITIAL_UPLOAD_FORM = {
  full_name: "",
  contact_email: "",
  contact_phone: "",
  salary_min: "",
  salary_max: "",
  source: "",
  job_order: ""
};

const INITIAL_CANDIDATE_FORM = {
  first_name: "",
  last_name: "",
  location_city: "",
  years_of_experience: null,
  seniority_level: null,
  salary_expectation_min: null,
  salary_expectation_max: null,
  job_titles_canonical: [],
  skills_primary: [],
  skills_secondary: [],
  skills_exposure: [],
  business_domains: [],
  technical_domains: [],
  certifications: [],
  degree_level: null,
  degree_field_raw: "",
  is_technical_degree: null,
  holistic_summary_text: "",
  career_trajectory_text: "",
  experience_block_text: "",
  availability_status: "available",
  source: "Direct Application"
};

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:border-red-500 focus:outline-none";

const TEXTAREA_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-red-500 focus:outline-none";

function parseSalaryInput(value) {
  if (!value) {
    return null;
  }

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
  if (Number.isNaN(num)) {
    return null;
  }

  if (num >= 1_000_000) {
    return Math.round(num);
  }

  return Math.round(num * 1_000_000);
}

function splitCommaList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCommaList(values) {
  if (Array.isArray(values)) {
    return values.join(", ");
  }

  return typeof values === "string" ? values : "";
}

function getPrimaryJobTitle(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

function cleanText(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function parseExperienceItems(text) {
  const normalized = cleanText(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const header = lines[0] || `Experience ${index + 1}`;
      let jobTitle = header;
      let company = "";

      if (header.includes(" at ")) {
        [jobTitle, company] = header.split(" at ").map((part) => part.trim());
      } else if (header.includes(" - ")) {
        [jobTitle, company] = header.split(" - ").map((part) => part.trim());
      } else if (header.includes(" | ")) {
        const parts = header.split(" | ").map((part) => part.trim());
        jobTitle = parts[0] || jobTitle;
        company = parts[1] || company;
      }

      let location = "";
      let startDate = "";
      let endDate = "";
      let technologies = "";
      const responsibilityLines = [];

      for (const line of lines.slice(1)) {
        const lower = line.toLowerCase();

        if (!location && /^(location|based in|remote)/i.test(line)) {
          location = line.replace(/^(location|based in|remote)\s*[:\-]?\s*/i, "").trim();
          continue;
        }

        if (!technologies && /^(technologies|tech stack|stack|tools)/i.test(line)) {
          technologies = line.replace(/^(technologies|tech stack|stack|tools)\s*[:\-]?\s*/i, "").trim();
          continue;
        }

        if (!startDate && !endDate && line.includes("-") && /\b(?:present|current|now|\d{4})\b/i.test(line)) {
          const parts = line.split(/\s*[-–]\s*/);
          if (parts.length >= 2) {
            startDate = parts[0].trim();
            endDate = parts.slice(1).join(" - ").trim();
            continue;
          }
        }

        if (/^(responsibilities|achievements|highlights)/i.test(line)) {
          responsibilityLines.push(line.replace(/^(responsibilities|achievements|highlights)\s*[:\-]?\s*/i, ""));
          continue;
        }

        if (lower !== "-") {
          responsibilityLines.push(line);
        }
      }

      return {
        id: `experience-${index + 1}`,
        job_title: jobTitle,
        company,
        location,
        start_date: startDate,
        end_date: endDate,
        responsibilities: responsibilityLines.join("\n"),
        technologies,
        raw_text: block
      };
    });
}

function buildExperienceBlockText(items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  return items
    .map((item) => {
      const header = [item.job_title, item.company].filter(Boolean).join(" at ") || "Experience";
      const lines = [header];

      if (item.location) {
        lines.push(`Location: ${item.location}`);
      }

      if (item.start_date || item.end_date) {
        lines.push(`Dates: ${item.start_date || "Start"} - ${item.end_date || "Present"}`);
      }

      if (item.technologies) {
        lines.push(`Technologies: ${item.technologies}`);
      }

      if (item.responsibilities) {
        lines.push(`Responsibilities / Achievements:\n${item.responsibilities.trim()}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function buildCandidateDraft(candidateData = {}, fallbackSource = "Direct Application") {
  return {
    ...INITIAL_CANDIDATE_FORM,
    ...candidateData,
    first_name: candidateData.first_name || "",
    last_name: candidateData.last_name || "",
    location_city: candidateData.location_city || "",
    years_of_experience:
      candidateData.years_of_experience === null || candidateData.years_of_experience === undefined
        ? null
        : Number(candidateData.years_of_experience),
    seniority_level:
      candidateData.seniority_level === null || candidateData.seniority_level === undefined
        ? null
        : Number(candidateData.seniority_level),
    salary_expectation_min:
      candidateData.salary_expectation_min === null || candidateData.salary_expectation_min === undefined
        ? null
        : Number(candidateData.salary_expectation_min),
    salary_expectation_max:
      candidateData.salary_expectation_max === null || candidateData.salary_expectation_max === undefined
        ? null
        : Number(candidateData.salary_expectation_max),
    job_titles_canonical: Array.isArray(candidateData.job_titles_canonical)
      ? candidateData.job_titles_canonical
      : [],
    skills_primary: Array.isArray(candidateData.skills_primary) ? candidateData.skills_primary : [],
    skills_secondary: Array.isArray(candidateData.skills_secondary)
      ? candidateData.skills_secondary
      : [],
    skills_exposure: Array.isArray(candidateData.skills_exposure) ? candidateData.skills_exposure : [],
    business_domains: Array.isArray(candidateData.business_domains) ? candidateData.business_domains : [],
    technical_domains: Array.isArray(candidateData.technical_domains)
      ? candidateData.technical_domains
      : [],
    certifications: Array.isArray(candidateData.certifications) ? candidateData.certifications : [],
    degree_level:
      candidateData.degree_level === null || candidateData.degree_level === undefined
        ? null
        : Number(candidateData.degree_level),
    degree_field_raw: candidateData.degree_field_raw || "",
    is_technical_degree:
      candidateData.is_technical_degree === null || candidateData.is_technical_degree === undefined
        ? null
        : Boolean(candidateData.is_technical_degree),
    holistic_summary_text: candidateData.holistic_summary_text || "",
    career_trajectory_text: candidateData.career_trajectory_text || "",
    experience_block_text: candidateData.experience_block_text || "",
    availability_status: candidateData.availability_status || "available",
    source: candidateData.source || fallbackSource
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h4>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function ExperienceCard({ item, index, onChange, onRemove }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Experience Item {index + 1}</p>
          <p className="text-xs text-slate-500"></p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Job Title">
            <input
            value={item.job_title}
            onChange={(event) => onChange("job_title", event.target.value)}
            className={INPUT_CLASS}
            />
        </Field>

        <Field label="Company">
            <input
            value={item.company}
            onChange={(event) => onChange("company", event.target.value)}
            className={INPUT_CLASS}
            />
        </Field>

        <div className="md:col-span-2">
            <Field label="Technologies" hint="Comma-separated">
            <input
                value={item.technologies}
                onChange={(event) => onChange("technologies", event.target.value)}
                className={INPUT_CLASS}
            />
            </Field>
        </div>

        <div className="md:col-span-2">
            <Field label="Responsibilities / Achievements">
            <textarea
                value={item.responsibilities}
                onChange={(event) => onChange("responsibilities", event.target.value)}
                rows={5}
                className={TEXTAREA_CLASS}
            />
            </Field>
        </div>
        </div>
    </div>
  );
}

export default function UploadCVModal({
  isOpen,
  onClose,
  onCandidateSaved,
  jobOrderOptions = [],
  defaultJobOrder = "",
  jobOrderLocked = false
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [parseDurationMs, setParseDurationMs] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [candidateForm, setCandidateForm] = useState(() => buildCandidateDraft());
  const [experienceItems, setExperienceItems] = useState([]);
  const [formData, setFormData] = useState(() => ({ ...INITIAL_UPLOAD_FORM }));
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [openSections, setOpenSections] = useState(() => ({
    personalInformation: true,
    roleEducation: false,
    skillsDomains: false,
    aiSummaries: false,
    experience: false
  }));

  const resetFormState = () => {
    setFile(null);
    setStatus("idle");
    setErrorMessage("");
    setActionErrorMessage("");
    setParseDurationMs(null);
    setPreviewResult(null);
    setCandidateForm(buildCandidateDraft());
    setExperienceItems([]);
    setFormData({ ...INITIAL_UPLOAD_FORM });
    setPdfPreviewUrl("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      job_order: defaultJobOrder || ""
    }));
  }, [isOpen, defaultJobOrder]);

  useEffect(() => {
    if (!isOpen) {
      resetFormState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!file) {
      setPdfPreviewUrl("");
      return undefined;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setPdfPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!isOpen) {
    return null;
  }

  const showPreview = status === "preview" && Boolean(previewResult?.candidate_data);
  const isPdfPreviewAvailable = Boolean(
    file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) && pdfPreviewUrl
  );

  const currentTitle = candidateForm.job_titles_canonical?.[0] || "Role not specified";
  const currentPrimaryJobTitle = getPrimaryJobTitle(candidateForm.job_titles_canonical);
  const parsedFields = previewResult?.parsed_fields || {};
  const rawText = previewResult?.raw_text || "";

  const updateUploadField = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
  };

  const updateCandidateField = (field, value) => {
    setCandidateForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCandidateNumberField = (field, value) => {
    updateCandidateField(field, value === "" ? null : Number(value));
  };

  const updateCandidateBoolField = (field, value) => {
    if (value === "") {
      updateCandidateField(field, null);
      return;
    }
    updateCandidateField(field, value === "true");
  };

  const updateCandidateArrayField = (field, value) => {
    updateCandidateField(field, splitCommaList(value));
  };

  const updateCandidateArrayTextField = (field, value) => {
    updateCandidateField(field, value);
  };

  const normalizeCandidateArrayField = (field) => {
    setCandidateForm((prev) => ({
      ...prev,
      [field]: splitCommaList(prev[field])
    }));
  };

  const updateMainJobTitle = (value) => {
    setCandidateForm((prev) => {
      const nextTitles = splitCommaList(prev.job_titles_canonical);
      if (nextTitles.length) {
        nextTitles[0] = value;
      } else if (value.trim()) {
        nextTitles.push(value.trim());
      } else {
        nextTitles.push("");
      }
      return { ...prev, job_titles_canonical: nextTitles };
    });
  };

  const updateExperienceItem = (index, field, value) => {
    setExperienceItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const addExperienceItem = () => {
    setExperienceItems((prev) => [
      ...prev,
      {
        id: `experience-${Date.now()}`,
        job_title: "",
        company: "",
        location: "",
        start_date: "",
        end_date: "",
        responsibilities: "",
        technologies: "",
        raw_text: ""
      }
    ]);
  };

  const removeExperienceItem = (index) => {
    setExperienceItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const closeModal = () => {
    resetFormState();
    onClose();
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }
    setFile(selected);
    setErrorMessage("");
    setActionErrorMessage("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) {
      return;
    }
    setFile(droppedFile);
    setErrorMessage("");
    setActionErrorMessage("");
  };

  const handleParsePreview = async () => {
    if (!file) {
      return;
    }

    setStatus("parsing");
    setErrorMessage("");
    setActionErrorMessage("");
    setPreviewResult(null);
    setExperienceItems([]);

    const startTime = performance.now();
    const previewFormData = {
      ...formData,
      salary_min: parseSalaryInput(formData.salary_min)?.toString() || "",
      salary_max: parseSalaryInput(formData.salary_max)?.toString() || ""
    };

    try {
      const data = await parsePreviewCandidateCv(file, previewFormData);
      setPreviewResult(data);
      setCandidateForm(
        buildCandidateDraft(data?.candidate_data || {}, previewFormData.source || "Direct Application")
      );
      setExperienceItems(parseExperienceItems(data?.candidate_data?.experience_block_text || ""));
      setParseDurationMs(Math.round(performance.now() - startTime));
      setStatus("preview");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error.message || "Parsing failed");
    }
  };

  const handleSaveCandidate = async () => {
    setStatus("saving");
    setErrorMessage("");
    setActionErrorMessage("");

    const experienceBlockText = buildExperienceBlockText(experienceItems);
    const payload = {
      ...candidateForm,
      job_titles_canonical: splitCommaList(candidateForm.job_titles_canonical),
      skills_primary: splitCommaList(candidateForm.skills_primary),
      skills_secondary: splitCommaList(candidateForm.skills_secondary),
      skills_exposure: splitCommaList(candidateForm.skills_exposure),
      business_domains: splitCommaList(candidateForm.business_domains),
      technical_domains: splitCommaList(candidateForm.technical_domains),
      certifications: (candidateForm.certifications || []).filter(Boolean),
      salary_expectation_min:
        candidateForm.salary_expectation_min === null || candidateForm.salary_expectation_min === ""
          ? null
          : Number(candidateForm.salary_expectation_min),
      salary_expectation_max:
        candidateForm.salary_expectation_max === null || candidateForm.salary_expectation_max === ""
          ? null
          : Number(candidateForm.salary_expectation_max),
      experience_block_text: experienceBlockText || candidateForm.experience_block_text || ""
    };

    try {
      const response = await confirmSaveCandidateCv(payload);
      const savedCandidate = {
        ...payload,
        ...(response?.candidate_data || {}),
        candidate_id: response?.candidate_id || response?.candidate_data?.candidate_id || payload.candidate_id
      };

      if (typeof onCandidateSaved === "function") {
        try {
          onCandidateSaved(savedCandidate);
        } catch (callbackError) {
          console.error("onCandidateSaved failed:", callbackError);
        }
      }

      closeModal();
    } catch (error) {
      console.error("Save candidate failed:", error);
      setStatus("preview");
      setActionErrorMessage(error.message || "Saving failed");
    }
  };

  const handleBackToUpload = () => {
    setStatus("idle");
    setErrorMessage("");
    setActionErrorMessage("");
  };

  const handleUploadAnother = () => {
    setFile(null);
    setPreviewResult(null);
    setCandidateForm(buildCandidateDraft());
    setExperienceItems([]);
    setStatus("idle");
    setErrorMessage("");
    setActionErrorMessage("");
    setParseDurationMs(null);
    fileInputRef.current?.focus();
  };

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const statusMessage =
    status === "parsing"
      ? "Parsing CV..."
      : status === "saving"
      ? "Saving and opening candidate profile..."
      : status === "preview"
      ? "Review parsed fields before saving."
      : "Add a new candidate by uploading a resume.";

  return (
    <>
      {status === "saving" ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4">
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-2xl">
            <Loader2 size={32} className="animate-spin text-red-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900">Saving and opening candidate profile...</p>
              <p className="mt-1 text-sm text-slate-500">Please wait while we finish indexing the candidate.</p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 sm:px-6">
        <div
          className={`flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl ${
            showPreview ? "max-w-7xl max-h-[calc(100vh-64px)] overflow-y-auto" : "max-w-3xl"
          }`}
        >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {showPreview ? "Review Parsed Candidate" : "Upload Candidate CV"}
            </h2>
            <p className="text-sm text-slate-500">{statusMessage}</p>
          </div>
          {showPreview ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBackToUpload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Back to Upload
              </button>
              <button
                type="button"
                onClick={handleSaveCandidate}
                disabled={status === "saving"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53E3E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C53030] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {status === "saving" ? "Saving..." : "Save Candidate"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              <X size={20} />
            </button>
          )}
        </div>

          {showPreview ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
                <SectionHeader
                  title="Original CV"
                />
                <div
                    className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
                    style={{ height: "78vh", minHeight: "720px" }}
                >
                    {isPdfPreviewAvailable ? (
                        <iframe
                            title="Original CV PDF"
                            src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=100`}
                            className="h-full w-full border-0"
                        />
                    ) : (
                        <div className="h-full overflow-y-auto p-4">
                            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                {rawText || "No text could be extracted from this CV."}
                            </pre>
                        </div>
                    )}
                </div>
              </section>

              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
                <SectionHeader
                  title="Parsed Fields"
                />

                <div className="mt-4 pr-1">
                  <div className="space-y-6">
                    <CollapsibleSection
                      title="Personal Information"
                      isOpen={openSections.personalInformation}
                      onToggle={() => toggleSection("personalInformation")}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="First Name">
                          <input value={candidateForm.first_name} onChange={(event) => updateCandidateField("first_name", event.target.value)} className={INPUT_CLASS} />
                        </Field>
                        <Field label="Last Name">
                          <input value={candidateForm.last_name} onChange={(event) => updateCandidateField("last_name", event.target.value)} className={INPUT_CLASS} />
                        </Field>
                        <Field label="Location">
                          <input value={candidateForm.location_city} onChange={(event) => updateCandidateField("location_city", event.target.value)} className={INPUT_CLASS} />
                        </Field>
                        <Field label="Years of Experience">
                          <input type="number" value={candidateForm.years_of_experience ?? ""} onChange={(event) => updateCandidateNumberField("years_of_experience", event.target.value)} className={INPUT_CLASS} />
                        </Field>
                        <Field label="Seniority Level">
                          <select value={candidateForm.seniority_level ?? ""} onChange={(event) => updateCandidateNumberField("seniority_level", event.target.value)} className={INPUT_CLASS}>
                            <option value="">Select seniority</option>
                            {Object.entries(SENIORITY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Role & Education"
                      isOpen={openSections.roleEducation}
                      onToggle={() => toggleSection("roleEducation")}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Professional Headline">
                          <input value={currentPrimaryJobTitle} onChange={(event) => updateMainJobTitle(event.target.value)} className={INPUT_CLASS} />
                        </Field>
                        <Field label="Degree Level">
                          <select value={candidateForm.degree_level ?? ""} onChange={(event) => updateCandidateNumberField("degree_level", event.target.value)} className={INPUT_CLASS}>
                            <option value="">Select degree level</option>
                            {Object.entries(DEGREE_LEVEL_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Technical Degree">
                          <select value={candidateForm.is_technical_degree === null ? "" : String(candidateForm.is_technical_degree)} onChange={(event) => updateCandidateBoolField("is_technical_degree", event.target.value)} className={INPUT_CLASS}>
                            <option value="">Select</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </Field>
                        <Field label="Degree Field">
                          <input value={candidateForm.degree_field_raw} onChange={(event) => updateCandidateField("degree_field_raw", event.target.value)} className={INPUT_CLASS} />
                        </Field>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Skills & Domains"
                      isOpen={openSections.skillsDomains}
                      onToggle={() => toggleSection("skillsDomains")}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Job Titles Canonical" hint="Comma-separated">
                          <input
                            value={joinCommaList(candidateForm.job_titles_canonical)}
                            onChange={(event) => updateCandidateArrayTextField("job_titles_canonical", event.target.value)}
                            onBlur={() => normalizeCandidateArrayField("job_titles_canonical")}
                            className={INPUT_CLASS}
                          />
                        </Field>
                        {ARRAY_FIELDS.map((field) => {
                          const label = field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
                          return (
                            <Field key={field} label={label} hint="Comma-separated">
                              <input
                                value={joinCommaList(candidateForm[field])}
                                onChange={(event) => updateCandidateArrayTextField(field, event.target.value)}
                                onBlur={() => normalizeCandidateArrayField(field)}
                                className={INPUT_CLASS}
                              />
                            </Field>
                          );
                        })}
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="AI Summaries"
                      isOpen={openSections.aiSummaries}
                      onToggle={() => toggleSection("aiSummaries")}
                    >
                      <div className="grid gap-4">
                        <Field label="Holistic Summary">
                          <textarea value={candidateForm.holistic_summary_text} onChange={(event) => updateCandidateField("holistic_summary_text", event.target.value)} rows={4} className={TEXTAREA_CLASS} />
                        </Field>
                        <Field label="Career Trajectory">
                          <textarea value={candidateForm.career_trajectory_text} onChange={(event) => updateCandidateField("career_trajectory_text", event.target.value)} rows={4} className={TEXTAREA_CLASS} />
                        </Field>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="Experience"
                      isOpen={openSections.experience}
                      onToggle={() => toggleSection("experience")}
                    >
                      <div className="space-y-4">
                        {experienceItems.length ? (
                          experienceItems.map((item, index) => (
                            <ExperienceCard
                              key={item.id || `experience-${index}`}
                              item={item}
                              index={index}
                              onChange={(field, value) => updateExperienceItem(index, field, value)}
                              onRemove={() => removeExperienceItem(index)}
                            />
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            No experience cards were parsed. You can add one manually.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={addExperienceItem}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Add Experience Item
                        </button>
                      </div>
                    </CollapsibleSection>

                    {actionErrorMessage ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {actionErrorMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Candidate info
                </h3>
                <div className="grid gap-3">
                  <input name="full_name" type="text" value={formData.full_name} onChange={updateUploadField} placeholder="Full Name" className={INPUT_CLASS} />
                  <input name="contact_email" type="email" value={formData.contact_email} onChange={updateUploadField} placeholder="Contact Email" className={INPUT_CLASS} />
                  <input name="contact_phone" type="text" value={formData.contact_phone} onChange={updateUploadField} placeholder="Contact Phone" className={INPUT_CLASS} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="salary_min"
                      type="text"
                      value={formData.salary_min}
                      onChange={updateUploadField}
                      placeholder="Salary Min"
                      className={INPUT_CLASS}
                    />

                    <input
                      name="salary_max"
                      type="text"
                      value={formData.salary_max}
                      onChange={updateUploadField}
                      placeholder="Salary Max"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    Enter in millions, e.g. 30, or full VND, e.g. 30,000,000.
                  </p>
                  <select name="source" value={formData.source} onChange={updateUploadField} className={INPUT_CLASS}>
                    <option value="">Source/Vendor</option>
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <select name="job_order" value={formData.job_order} onChange={updateUploadField} disabled={jobOrderLocked} className={INPUT_CLASS}>
                    <option value="">Job Order</option>
                    {jobOrderOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex h-full flex-col space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">CV upload</h3>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleBrowse}
                  onDrop={handleDrop}
                  onDragOver={(event) => event.preventDefault()}
                  className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center text-sm text-slate-500 transition hover:border-red-500"
                >
                  <FileUp size={32} className="text-slate-300" />
                  <p className="font-semibold text-slate-900">Drop CV here or click to browse</p>
                  <p className="text-xs text-slate-400">Supports PDF. DOCX is out of demo scope.</p>
                  {file ? (
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <FileText size={20} className="text-slate-400" />
                      Selected: {file.name}
                    </p>
                  ) : null}
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleFileChange} className="hidden" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  {status === "parsing" ? (
                    <div className="flex items-center gap-3 text-slate-600">
                      <Loader2 size={18} className="animate-spin text-red-500" />
                      Parsing CV...
                    </div>
                  ) : status === "error" ? (
                    <div className="flex items-center gap-2 text-rose-600">
                      <AlertCircle size={20} className="text-rose-500" />
                      {errorMessage || "Failed to parse CV."}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Ready to parse preview
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleParsePreview} disabled={!file || status === "parsing"} className="rounded-xl bg-[#E53E3E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C53030] disabled:cursor-not-allowed disabled:opacity-60">
                {status === "parsing" ? "Parsing CV..." : "Upload & Preview CV"}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}