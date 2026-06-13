import React, { useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart2,
  Bell,
  Banknote,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Construction,
  ExternalLink,
  FolderOpen,
  GripVertical,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Upload,
  UserPlus,
  Users,
  UsersRound,
  Trash2,
  X
} from "lucide-react";
import { searchCandidates } from "../api/search.js";
import ExportButton from "../components/ExportButton.jsx";
import FilterBar from "../components/FilterBar.jsx";
import SaveJobModal from "../components/SaveJobModal.jsx";
import ShareDropdown from "../components/ShareDropdown.jsx";
import SearchBar from "../components/SearchBar.jsx";
import UploadCVModal from "../components/UploadCVModal.jsx";

const statusColors = {
  Shortlisted: "bg-emerald-100 text-emerald-700",
  "In Review": "bg-amber-100 text-amber-700",
  Rejected: "bg-rose-100 text-rose-700"
};

const seniorityLabels = {
  0: "Fresher",
  1: "Junior",
  2: "Mid",
  3: "Senior",
  4: "Lead",
  5: "Expert"
};

const availabilityBorderStyles = {
  available: "border-l-green-500",
  open: "border-l-yellow-500",
  closed: "border-l-red-500"
};

const availabilityDotColors = {
  available: "bg-green-500",
  open: "bg-yellow-500",
  closed: "bg-red-500"
};

const JOB_ORDERS_STORAGE_KEY = "recruitiq_job_orders";

function loadJobOrdersFromStorage(defaultJobOrders) {
  if (typeof window === "undefined") {
    return defaultJobOrders;
  }

  try {
    const rawValue = window.localStorage.getItem(JOB_ORDERS_STORAGE_KEY);
    if (!rawValue) {
      return defaultJobOrders;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue) || !parsedValue.length) {
      return defaultJobOrders;
    }

    return parsedValue.map((jobOrder) => ({
      ...jobOrder,
      candidates: Array.isArray(jobOrder.candidates) ? jobOrder.candidates : []
    }));
  } catch {
    return defaultJobOrders;
  }
}

function saveJobOrdersToStorage(jobOrders) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(JOB_ORDERS_STORAGE_KEY, JSON.stringify(jobOrders));
}

export default function SearchPage({ authUser, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [totalFound, setTotalFound] = useState(0);
  const [searchTimeMs, setSearchTimeMs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchError, setSearchError] = useState(null);
  const [shortlistIds, setShortlistIds] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSaveJobOpen, setIsSaveJobOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [activeNav, setActiveNav] = useState("search");
  const [activeJobId, setActiveJobId] = useState("vng-frontend");
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState("search");
  const [jobOrderTab, setJobOrderTab] = useState("internal");
  const [toastMessage, setToastMessage] = useState("");
  const searchInputRef = useRef(null);
  const kanbanRef = useRef(null);
  const isRestoringRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [uploadJobOrder, setUploadJobOrder] = useState("");
  const [isUploadJobLocked, setIsUploadJobLocked] = useState(false);
  const [filters, setFilters] = useState({
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
  });

  const navItems = [
    { id: "search", label: "Search", icon: LayoutDashboard },
    { id: "job-orders", label: "Job Orders", icon: Briefcase },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "recruitment-team", label: "Recruitment Team", icon: UsersRound },
    { id: "sources", label: "Sources & Vendors", icon: Building2 },
    { id: "clients", label: "Clients", icon: Handshake },
    { id: "analytics", label: "Analytics", icon: BarChart2 }
  ];
  const disabledNavIds = new Set([
    "candidates",
    "recruitment-team",
    "sources",
    "clients",
    "analytics"
  ]);

  const jobOrderCandidates = {
    "vng-frontend": {
      title: "Senior Frontend Engineer - VNG",
      subtitle: "3 candidates retrieved",
      candidates: [
        { name: "Mai Lan Nguyen", seniority: "Senior", status: "In Review", score: 86 },
        { name: "Minh Quang Pham", seniority: "Lead", status: "Shortlisted", score: 92 },
        { name: "Dieu Ngoc Tran", seniority: "Senior", status: "Rejected", score: 61 }
      ]
    },
    "tiki-java": {
      title: "Senior Java Developer - Tiki",
      subtitle: "7 candidates retrieved",
      candidates: [
        { name: "Anh Khoa Hoang", seniority: "Senior", status: "Shortlisted", score: 95 },
        { name: "Minh Chau Le", seniority: "Lead", status: "In Review", score: 89 },
        { name: "Nguyen Nam Anh", seniority: "Senior", status: "In Review", score: 84 },
        { name: "Bao Ly Nguyen", seniority: "Mid", status: "Rejected", score: 67 },
        { name: "Tuan Kiet Pham", seniority: "Senior", status: "Shortlisted", score: 91 },
        { name: "Ngoc Thao Le", seniority: "Lead", status: "In Review", score: 87 },
        { name: "Minh Hieu Phan", seniority: "Senior", status: "Rejected", score: 62 }
      ]
    },
    "momo-devops": {
      title: "DevOps Lead - MoMo",
      subtitle: "2 candidates retrieved",
      candidates: [
        { name: "Minh Khanh Do", seniority: "Lead", status: "In Review", score: 90 },
        { name: "Lam Thanh Vu", seniority: "Senior", status: "Shortlisted", score: 88 }
      ]
    }
  };

  const shortlisted = useMemo(
    () => results.filter((candidate) => shortlistIds.includes(candidate.candidate_id)),
    [results, shortlistIds]
  );

  const showToast = (message) => {
    setToastMessage(message);
  };

  const handleViewProfile = (candidate) => {
    if (!candidate?.candidate_id) {
      console.error("View Profile failed: missing candidate_id", candidate);
      return;
    }

    navigate(`/candidate/${candidate.candidate_id}`, {
      state: {
        candidate,
        from: "search",
        searchQuery: query,
        searchResults: results,
        filters
      }
    });
  };

  const handleCandidateSaved = (savedCandidate) => {
    if (!savedCandidate) {
      return;
    }

    try {
      const fullName = [savedCandidate.first_name, savedCandidate.last_name]
        .filter(Boolean)
        .join(" ");

      const normalizedCandidate = buildInternalProfileCandidate({
        ...savedCandidate,
        candidate_id: savedCandidate.candidate_id || savedCandidate.id,
        id: savedCandidate.candidate_id || savedCandidate.id,
        name: savedCandidate.name || savedCandidate.full_name || fullName,
        full_name: savedCandidate.full_name || savedCandidate.name || fullName,
        title:
          savedCandidate.title ||
          savedCandidate.job_titles_canonical?.[0] ||
          savedCandidate.position ||
          "Role not specified",
        location_city:
          savedCandidate.location_city ||
          savedCandidate.location ||
          "Not specified",
        availability_status:
          savedCandidate.availability_status ||
          savedCandidate.availability ||
          "available",
      });

      showToast("Candidate saved and indexed successfully.");

      // Clear search area so the saved candidate does not appear as a result card.
      setResults([]);
      setTotalFound(0);
      setHasSearched(false);

      // Open candidate profile using the existing View Profile logic.
      handleViewProfile(normalizedCandidate);
    } catch (error) {
      console.error("handleCandidateSaved failed:", error);
      showToast("Candidate saved, but failed to open profile.");
    }
  };

  const hasActiveFilters = (currentFilters) =>
    currentFilters.location_city ||
    currentFilters.seniority_level !== null ||
    currentFilters.availability_status ||
    currentFilters.required_skills.length > 0 ||
    currentFilters.business_domains.length > 0 ||
    currentFilters.salary_min ||
    currentFilters.salary_max ||
    currentFilters.experience_min ||
    currentFilters.experience_max ||
    currentFilters.date_from ||
    currentFilters.date_to ||
    currentFilters.technical_only;

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed && !hasActiveFilters(filters)) {
      return;
    }

    setResults([]);
    setTotalFound(0);
    setSearchTimeMs(null);
    setErrorMessage("");
    setSearchError(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchCandidates(trimmed, filters);
      setSearchTimeMs(response.search_time_ms || 0);
      if (response.error) {
        setSearchError(response.error);
        setResults([]);
        setTotalFound(0);
      } else {
        setSearchError(null);
        setResults(response.candidates || []);
        setTotalFound(response.total_found || 0);
      }
    } catch (error) {
      setErrorMessage(error.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setTotalFound(0);
    setSearchTimeMs(null);
    setErrorMessage("");
    setSearchError(null);
    setHasSearched(false);
    setFilters({
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
    });

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  useEffect(() => {
    const restoredQuery = location.state?.searchQuery;
    const restoredFilters = location.state?.filters;
    const restoredActiveView = location.state?.activeView;
    const restoredJobOrderId = location.state?.jobOrderId;

    if (restoredActiveView === "joborder") {
      setViewMode("job-order");
      setActiveNav("job-orders");
      if (restoredJobOrderId) {
        setActiveJobId(restoredJobOrderId);
      }
    } else if (restoredActiveView === "recruitment-team") {
      setViewMode("recruitment-team");
      setActiveNav("recruitment-team");
    }

    if (restoredQuery || restoredFilters) {
      isRestoringRef.current = true;
      if (restoredQuery !== undefined) {
        setQuery(restoredQuery);
      }
      if (restoredFilters) {
        setFilters(restoredFilters);
      }
      setResults([]);
      setTotalFound(0);
      setHasSearched(Boolean(restoredQuery));
    }
  }, []);

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    if (hasSearched && (query.trim() || hasActiveFilters(filters))) {
      handleSearch();
    }
  }, [filters, hasSearched]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = setTimeout(() => setToastMessage(""), 2500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleSave = (candidate) => {
    setActiveCandidate(candidate);
    setIsSaveJobOpen(true);
    setShortlistIds((prev) =>
      prev.includes(candidate.candidate_id)
        ? prev
        : [...prev, candidate.candidate_id]
    );
  };

  const closeSaveJobModal = () => {
    setIsSaveJobOpen(false);
    setActiveCandidate(null);
  };

  const persistCandidateToJobOrder = (jobOrderId, candidate) => {
    const normalizedCandidate = buildInternalProfileCandidate(candidate);
    setJobOrders((prev) =>
      prev.map((job) => {
        if (job.id !== jobOrderId) {
          return job;
        }

        const currentCandidates = job.candidates || [];
        const nextCandidates = [
          normalizedCandidate,
          ...currentCandidates.filter(
            (item) => item.candidate_id !== normalizedCandidate.candidate_id
          )
        ];

        return {
          ...job,
          candidates: nextCandidates
        };
      })
    );
  };

  const handleSaveToJobOrder = (jobOrder) => {
    if (!activeCandidate || !jobOrder) {
      return;
    }

    const activeCandidateId = activeCandidate.candidate_id;
    const existingCandidates = Array.isArray(jobOrder.candidates) ? jobOrder.candidates : [];
    const hasDuplicate = existingCandidates.some(
      (candidate) => candidate.candidate_id === activeCandidateId
    );

    if (hasDuplicate) {
      setToastMessage("This candidate has already been saved to this job order.");
      return;
    }

    persistCandidateToJobOrder(jobOrder.id, activeCandidate);
    setToastMessage(`Saved to ${jobOrder.title}`);
    closeSaveJobModal();
  };

  const handleCreateJobOrder = (jobOrderName) => {
    if (!activeCandidate || !jobOrderName) {
      return;
    }

    const newJobOrder = {
      id: `job-${Date.now()}`,
      title: jobOrderName,
      company: "Internal",
      date: "Today",
      candidates: [buildInternalProfileCandidate(activeCandidate)]
    };

    setJobOrders((prev) => [newJobOrder, ...prev]);
    setToastMessage(`Created ${jobOrderName}`);
    closeSaveJobModal();
  };

  const handleRemoveFromJob = (candidateId) => {
    if (window.confirm("Remove this candidate from the job order?")) {
      setJobOrders((prev) =>
        prev.map((job) => {
          if (job.id !== activeJobId) {
            return job;
          }

          const currentCandidates = job.candidates || [];
          const nextCandidates = currentCandidates.filter(
            (candidate) => candidate.candidate_id !== candidateId
          );

          if (nextCandidates.length === currentCandidates.length) {
            return job;
          }

          return {
            ...job,
            candidates: nextCandidates
          };
        })
      );
    }
  };

  // Loved feature removed: recruitment-team replaces Loved Candidates

  const handleExport = async () => {
    if (!results.length) return;

    try {
      const candidateIds = results.map((c) => c.candidate_id);
      const resp = await fetch("/api/v1/export/shortlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ candidate_ids: candidateIds })
      });
      if (!resp.ok) {
        setToastMessage("Export failed");
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidates_export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      setToastMessage("Export started");
    } catch (err) {
      setToastMessage("Export failed");
    }
  };

  const statusBorderStyles = (status) => { 
    if (status === "Shortlisted") {
      return "border-emerald-500";
    }
    if (status === "In Review") {
      return "border-amber-400";
    }
    return "border-rose-500";
  };
  const scoreBadgeStyles = (score) => {
    if (score >= 80) {
      return {
        badge: "bg-emerald-100 text-emerald-800",
        border: "border-emerald-300"
      };
    }
    if (score >= 60) {
      return {
        badge: "bg-yellow-100 text-yellow-800",
        border: "border-yellow-300"
      };
    }
    if (score >= 40) {
      return {
        badge: "bg-orange-100 text-orange-800",
        border: "border-orange-300"
      };
    }
    return {
      badge: "bg-red-100 text-red-800",
      border: "border-red-300"
    };
  };
  const formatSalaryMillions = (value) => {
    if (!value) {
      return null;
    }
    return Math.round(value / 1_000_000);
  };
  const normalizeSalaryValue = (val) => {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    // If value looks like "millions" (e.g. 45) convert to VND, otherwise assume already VND
    return n > 0 && n < 1_000_000 ? n * 1_000_000 : n;
  };
  const getUserInitials = (name) => {
    if (!name) {
      return "U";
    }
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase())
      .join("")
      .slice(0, 2);
  };
  const buildInternalProfileCandidate = (candidate) => {
    const locationText =
      candidate.location_city || candidate.location || candidate.city || candidate.work_location || "Not specified";
    const availabilityText =
      candidate.availability_status || candidate.availability || candidate.status || "Not specified";
    const titleText =
      candidate.title ||
      candidate.title_display ||
      candidate.job_titles_canonical?.[0] ||
      candidate.role ||
      candidate.current_title ||
      candidate.position ||
      "Role not specified";
    const skillsPrimary = candidate.skills_primary || candidate.skills || [];
    const businessDomains = candidate.business_domains || candidate.domains || [];
    const salaryMin = candidate.salary_expectation_min ?? normalizeSalaryValue(candidate.salaryMin);
    const salaryMax = candidate.salary_expectation_max ?? normalizeSalaryValue(candidate.salaryMax);
    const yearsExperience =
      candidate.years_of_experience ?? candidate.years_experience_display ?? candidate.years ?? candidate.yoe ?? null;
    const seniorityText =
      candidate.seniority ||
      candidate.seniority_display ||
      (candidate.seniority_level !== undefined && candidate.seniority_level !== null
        ? seniorityLabels[candidate.seniority_level] || `Level ${candidate.seniority_level}`
        : "Not specified");
    const relevanceScore = candidate.relevance_score ?? candidate.score ?? null;

    return {
      ...candidate,
      candidate_id: candidate.candidate_id || candidate.id,
      first_name: candidate.first_name || candidate.firstName || "",
      last_name: candidate.last_name || candidate.lastName || "",
      name: candidate.name || `${candidate.first_name || candidate.firstName || ""} ${candidate.last_name || candidate.lastName || ""}`.trim(),
      location: locationText,
      location_city: locationText,
      location_display: candidate.location_display || locationText,
      availability: availabilityText,
      availability_status: availabilityText,
      availability_display: candidate.availability_display || availabilityText,
      title: titleText,
      title_display: candidate.title_display || titleText,
      job_titles_canonical: candidate.job_titles_canonical?.length ? candidate.job_titles_canonical : [titleText],
      skills: skillsPrimary,
      skills_primary: skillsPrimary,
      skills_secondary: candidate.skills_secondary || [],
      skills_exposure: candidate.skills_exposure || [],
      domains: businessDomains,
      business_domains: businessDomains,
      technical_domains: candidate.technical_domains || [],
      certifications: candidate.certifications || [],
      salaryMin: candidate.salaryMin ?? formatSalaryMillions(salaryMin),
      salaryMax: candidate.salaryMax ?? formatSalaryMillions(salaryMax),
      salary_expectation_min: salaryMin,
      salary_expectation_max: salaryMax,
      salary_display:
        candidate.salary_display ||
        (() => {
          const min = formatSalaryMillions(salaryMin);
          const max = formatSalaryMillions(salaryMax);
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
        })(),
      years: candidate.years ?? yearsExperience,
      years_of_experience: yearsExperience,
      years_experience_display: candidate.years_experience_display || yearsExperience,
      seniority_level: candidate.seniority_level,
      seniority: seniorityText,
      seniority_display: candidate.seniority_display || seniorityText,
      relevance_score: relevanceScore,
      score: candidate.score ?? relevanceScore,
      status: candidate.status || "Shortlisted",
      holistic_summary_text: candidate.holistic_summary_text,
      career_trajectory_text: candidate.career_trajectory_text,
      experience_block_text: candidate.experience_block_text,
      degree_level: candidate.degree_level,
      degree_field_raw: candidate.degree_field_raw,
      is_technical_degree: candidate.is_technical_degree,
      source: candidate.source
    };
  };
  const internalCandidates = [
    {
      candidate_id: "009",
      first_name: "Van Long",
      last_name: "Nguyen",
      name: "Van Long Nguyen",
      seniority: "Lead",
      seniority_level: 4,
      title: "Lead Java Engineer",
      location: "Ho Chi Minh City",
      availability: "available",
      skills: ["Java", "Spring Boot", "PostgreSQL"],
      domains: ["FinTech", "Banking"],
      skills_primary: ["Java", "Spring Boot", "PostgreSQL"],
      skills_secondary: ["Kafka", "Redis", "Docker"],
      skills_exposure: ["Kubernetes", "ElasticSearch"],
      business_domains: ["FinTech", "Banking"],
      technical_domains: ["Distributed Systems", "Backend Engineering"],
      job_titles_canonical: ["Lead Java Engineer", "Senior Backend Engineer"],
      certifications: ["AWS Solutions Architect Associate"],
      salaryMin: 45,
      salaryMax: 65,
      years: 9,
      status: "Shortlisted",
      score: 92,
      holistic_summary_text:
        "Lead Java engineer with deep fintech delivery experience across payments, ledger systems, and service integrations. Known for building resilient backend platforms and guiding small teams through production launches.",
      career_trajectory_text:
        "Consistently specialized in backend engineering, progressing from Java developer roles into lead ownership across multiple fintech programs.",
      experience_block_text:
        "Lead Java Engineer at Momo Finance.\nTechnical domain: FinTech Payments.\nResponsibilities: Led development of payment orchestration services, coordinated cross-team release plans, and improved transaction reliability.\nTechnologies: Java, Spring Boot, PostgreSQL, Kafka.\nMethodologies: Agile, Scrum.\n\nSenior Backend Engineer at Tiki.\nTechnical domain: E-commerce Platforms.\nResponsibilities: Built order processing APIs, optimized database queries, and supported production incident response.\nTechnologies: Java, Hibernate, Redis, Docker.\nMethodologies: Agile, Kanban.",
      degree_level: 2,
      degree_field_raw: "Computer Science",
      is_technical_degree: true,
      source: "Seed Data"
    },
    {
      candidate_id: "013",
      first_name: "Minh Quan",
      last_name: "Hoang",
      name: "Minh Quan Hoang",
      seniority: "Lead",
      seniority_level: 3,
      title: "Senior Java Engineer",
      location: "Ho Chi Minh City",
      availability: "open",
      skills: ["Java", "Spring Boot", "PostgreSQL"],
      domains: ["FinTech", "Banking"],
      skills_primary: ["Java", "Spring Boot", "PostgreSQL"],
      skills_secondary: ["Kafka", "Redis", "Docker"],
      skills_exposure: ["Kubernetes", "GitLab CI"],
      business_domains: ["FinTech", "Banking"],
      technical_domains: ["Distributed Systems", "Backend Engineering"],
      job_titles_canonical: ["Senior Java Engineer", "Backend Engineer"],
      certifications: ["AWS Solutions Architect Associate"],
      salaryMin: 50,
      salaryMax: 68,
      years: 8,
      status: "In Review",
      score: 84,
      holistic_summary_text:
        "Senior Java engineer with a strong record delivering payment workflows, banking integrations, and high-throughput APIs. Brings practical ownership of reliability, performance, and maintainability.",
      career_trajectory_text:
        "Consistently specialized in backend engineering, working primarily as Java developer and senior engineer across fintech and banking products.",
      experience_block_text:
        "Senior Java Engineer at BIDV Digital.\nTechnical domain: Banking Platforms.\nResponsibilities: Delivered core account services, improved batch processing stability, and collaborated with QA on release quality.\nTechnologies: Java, Spring Boot, PostgreSQL, Kafka.\nMethodologies: Agile, Scrum.\n\nJava Engineer at VNGPay.\nTechnical domain: FinTech Payments.\nResponsibilities: Implemented wallet integration features, reduced API latency, and maintained service observability dashboards.\nTechnologies: Java, Redis, Docker, ElasticSearch.\nMethodologies: Agile, Kanban.",
      degree_level: 2,
      degree_field_raw: "Software Engineering",
      is_technical_degree: true,
      source: "Seed Data"
    },
    {
      candidate_id: "010",
      first_name: "Duc Manh",
      last_name: "Tran",
      name: "Duc Manh Tran",
      seniority: "Senior",
      seniority_level: 3,
      title: "Senior Java Engineer",
      location: "Ho Chi Minh City",
      availability: "closed",
      skills: ["Java", "Spring Boot", "PostgreSQL"],
      domains: ["Enterprise", "Banking"],
      skills_primary: ["Java", "Spring Boot", "PostgreSQL"],
      skills_secondary: ["Kafka", "Redis", "Docker"],
      skills_exposure: ["Kubernetes", "AWS"],
      business_domains: ["Enterprise", "Banking"],
      technical_domains: ["Backend Engineering", "Distributed Systems"],
      job_titles_canonical: ["Senior Java Engineer", "Backend Engineer"],
      certifications: ["AWS Solutions Architect Associate"],
      salaryMin: 42,
      salaryMax: 58,
      years: 7,
      status: "Rejected",
      score: 61,
      holistic_summary_text:
        "Senior backend engineer with enterprise delivery experience across internal platforms, integration services, and operational tooling. Focused on stable Java services and clear cross-team execution.",
      career_trajectory_text:
        "Consistently specialized in backend engineering, working primarily as Java engineer on enterprise service platforms and internal APIs.",
      experience_block_text:
        "Senior Java Engineer at FPT Software.\nTechnical domain: Enterprise Platforms.\nResponsibilities: Built internal service endpoints, supported migration efforts, and worked closely with analysts to refine requirements.\nTechnologies: Java, Spring Boot, PostgreSQL, Docker.\nMethodologies: Agile, Scrum.\n\nBackend Engineer at VNPost.\nTechnical domain: Enterprise Integrations.\nResponsibilities: Maintained integration APIs, improved error handling, and supported scheduled job reliability.\nTechnologies: Java, MyBatis, Redis, RabbitMQ.\nMethodologies: Agile, Kanban.",
      degree_level: 2,
      degree_field_raw: "Information Technology",
      is_technical_degree: true,
      source: "Seed Data"
    }
  ];
  const defaultJobOrders = [
    {
      id: "vng-frontend",
      title: "Senior Frontend Engineer",
      company: "VNG",
      date: "20 Mar 2026",
      count: 3,
      candidates: internalCandidates.map((candidate) => ({ ...candidate }))
    },
    {
      id: "tiki-java",
      title: "Senior Java Developer",
      company: "Tiki",
      date: "25 Apr 2026",
      count: 7,
      candidates: []
    },
    {
      id: "momo-devops",
      title: "DevOps Lead",
      company: "MoMo",
      date: "1 May 2026",
      count: 2,
      candidates: []
    }
  ];
  const [jobOrders, setJobOrders] = useState(() => loadJobOrdersFromStorage(defaultJobOrders));
  const jobOrderCandidatesById = useMemo(
    () =>
      jobOrders.reduce((accumulator, jobOrder) => {
        accumulator[jobOrder.id] = jobOrder.candidates || [];
        return accumulator;
      }, {}),
    [jobOrders]
  );
  const getInternalRetrievalCount = (jobOrder) =>
    Array.isArray(jobOrder?.candidates) ? jobOrder.candidates.length : jobOrder?.count || 0;
  useEffect(() => {
    saveJobOrdersToStorage(jobOrders);
  }, [jobOrders]);
  const [kanbanColumns, setKanbanColumns] = useState([
    {
      id: "new",
      label: "New",
      tone: "border-t-4 border-blue-400",
      items: [
        {
          id: "linh-tran",
          first_name: "Linh",
          last_name: "Tran",
          name: "Linh Tran",
          seniority: "Mid",
          date: "12 May",
          source: "LinkedIn"
        },
        {
          id: "quan-le",
          first_name: "Quan",
          last_name: "Le",
          name: "Quan Le",
          seniority: "Junior",
          date: "15 May",
          source: "TopCV"
        },
        {
          id: "ha-my",
          first_name: "Ha",
          last_name: "My",
          name: "Ha My",
          seniority: "Mid",
          date: "18 May",
          source: "ITviec"
        }
      ]
    },
    {
      id: "screening",
      label: "Screening",
      tone: "border-t-4 border-amber-400",
      items: [
        {
          id: "thanh-nhi",
          first_name: "Thanh",
          last_name: "Nhi",
          name: "Thanh Nhi",
          seniority: "Senior",
          date: "9 May",
          source: "Referral"
        },
        {
          id: "minh-anh",
          first_name: "Minh",
          last_name: "Anh",
          name: "Minh Anh",
          seniority: "Mid",
          date: "11 May",
          source: "LinkedIn"
        }
      ]
    },
    {
      id: "internal-interview",
      label: "Internal Interview",
      tone: "border-t-4 border-purple-400",
      items: [
        {
          id: "huy-phan",
          first_name: "Huy",
          last_name: "Phan",
          name: "Huy Phan",
          seniority: "Senior",
          date: "7 May",
          source: "LinkedIn"
        },
        {
          id: "ngoc-linh",
          first_name: "Ngoc",
          last_name: "Linh",
          name: "Ngoc Linh",
          seniority: "Mid",
          date: "8 May",
          source: "VietnamWorks"
        }
      ]
    },
    {
      id: "client-interview",
      label: "Client Interview",
      tone: "border-t-4 border-sky-400",
      items: [
        {
          id: "ngoc-anh",
          first_name: "Ngoc",
          last_name: "Anh",
          name: "Ngoc Anh",
          seniority: "Lead",
          date: "5 May",
          source: "TopCV"
        },
        {
          id: "tuan-kiet",
          first_name: "Tuan",
          last_name: "Kiet",
          name: "Tuan Kiet",
          seniority: "Senior",
          date: "6 May",
          source: "Referral"
        }
      ]
    },
    {
      id: "offered",
      label: "Offered",
      tone: "border-t-4 border-emerald-400",
      items: [
        {
          id: "thao-le",
          first_name: "Thao",
          last_name: "Le",
          name: "Thao Le",
          seniority: "Mid",
          date: "2 May",
          source: "Referral"
        },
        {
          id: "bao-chau",
          first_name: "Bao",
          last_name: "Chau",
          name: "Bao Chau",
          seniority: "Senior",
          date: "4 May",
          source: "LinkedIn"
        }
      ]
    },
    {
      id: "successful",
      label: "Successful Onboarding",
      tone: "border-t-4 border-emerald-500",
      icon: CheckCircle2,
      items: [
        {
          id: "lan-chi",
          first_name: "Lan",
          last_name: "Chi",
          name: "Lan Chi",
          seniority: "Lead",
          date: "28 Apr",
          source: "Referral"
        }
      ]
    },
    {
      id: "rejected",
      label: "Rejected",
      tone: "border-t-4 border-rose-400",
      items: [
        {
          id: "duc-long",
          first_name: "Duc",
          last_name: "Long",
          name: "Duc Long",
          seniority: "Mid",
          date: "3 May",
          source: "VietnamWorks"
        },
        {
          id: "phuong-anh",
          first_name: "Phuong",
          last_name: "Anh",
          name: "Phuong Anh",
          seniority: "Junior",
          date: "1 May",
          source: "Direct Application"
        }
      ]
    }
  ]);
  const newApplicants = useMemo(
    () => kanbanColumns.flatMap((column) => column.items),
    [kanbanColumns]
  );
  const showJobOrders = activeNav === "job-orders";
  const activeJobMeta =
    jobOrders.find((job) => job.id === activeJobId) || jobOrders[1] || jobOrders[0];
  const internalRetrievalCandidates = jobOrderCandidatesById[activeJobId] || [];
  const jobOrderOptions = useMemo(
    () => ["No specific job order", ...jobOrders.map((job) => `${job.title} - ${job.company}`)],
    [jobOrders]
  );
  // Loved/recruitment-team mapping removed; recruitment-team will be a dedicated page
  const internalCount = internalRetrievalCandidates.length;
  const newApplicationsCount = newApplicants.length;
  const userInitials = getUserInitials(authUser?.name);

  const updateScrollButtons = () => {
    const node = kanbanRef.current;
    if (!node) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollLeft = () => {
    if (kanbanRef.current) {
      kanbanRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (kanbanRef.current) {
      kanbanRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleKanbanDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) {
      return;
    }
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    setKanbanColumns((prev) => {
      const next = prev.map((column) => ({
        ...column,
        items: [...column.items]
      }));
      const sourceColumn = next.find((column) => column.id === source.droppableId);
      const destinationColumn = next.find(
        (column) => column.id === destination.droppableId
      );
      if (!sourceColumn || !destinationColumn) {
        return prev;
      }
      const [movedItem] = sourceColumn.items.splice(source.index, 1);
      destinationColumn.items.splice(destination.index, 0, movedItem);
      return next;
    });
  };

  useEffect(() => {
    updateScrollButtons();
  }, [kanbanColumns]);

  const openUploadModal = ({ jobOrder = "", locked = false } = {}) => {
    setUploadJobOrder(jobOrder);
    setIsUploadJobLocked(locked);
    setIsUploadOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
      <aside className="fixed inset-y-0 left-0 flex w-[240px] flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            THESIS DEMO
          </p>
          <h1 className="text-xl font-semibold text-slate-900">RecruitIQ</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            const isDisabled = disabledNavIds.has(item.id);
            const iconTone = isActive
              ? "text-red-500"
              : isDisabled
              ? "text-gray-300"
              : "text-gray-400";
            return (
              <div key={item.id}>
                <button
                  type="button"
                  title={isDisabled ? "Coming soon" : undefined}
                  onClick={
                    isDisabled
                      ? undefined
                      : () => {
                          setActiveNav(item.id);
                          if (item.id === "search") {
                            setViewMode("search");
                          }
                          if (item.id === "recruitment-team") {
                            setViewMode("recruitment-team");
                          }
                        }
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-red-500 bg-[#EFF6FF] text-[#2563EB]"
                      : "border-transparent text-[#4A5568]"
                  } ${
                    isDisabled
                      ? "cursor-default opacity-50"
                      : "hover:text-slate-900"
                  }`}
                >
                  <span className="text-base" aria-hidden="true">
                    <item.icon size={18} className={iconTone} />
                  </span>
                  <span className="flex flex-1 items-center justify-between">
                    <span>{item.label}</span>
                  </span>
                </button>
                {item.id === "job-orders" && showJobOrders && (
                  <div className="mt-2 flex flex-col gap-2 pl-7">
                    {jobOrders.map((job) => {
                      const isJobActive = activeJobId === job.id;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => {
                            setActiveJobId(job.id);
                            setViewMode("job-order");
                            setJobOrderTab("internal");
                          }}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                            isJobActive
                              ? "border-red-500 bg-red-50 text-slate-900"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-left whitespace-normal">
                            {job.title} - {job.company} - {job.date}
                          </span>
                          <span className="flex h-5 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-semibold text-slate-600">
                            {getInternalRetrievalCount(job) + newApplicationsCount}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
                    >
                      <Plus size={14} className="text-slate-400" />
                      New Collection
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

      </aside>

      <div className="ml-[240px] min-h-screen bg-[#F5F7FA]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openUploadModal()}
                className="flex items-center gap-2 rounded-xl bg-[#E53E3E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#C53030]"
              >
                <Upload size={16} className="text-white" />
                Upload CV
              </button>
              <ExportButton
                disabled={!results.length}
                onClick={handleExport}
                label={`Export Results (${results.length})`}
              />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-500 hover:text-slate-900"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-slate-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {userInitials}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-800">
                    {authUser?.name}
                  </p>
                  <p className="text-xs text-gray-500">{authUser?.role}</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut size={16} className="text-gray-500" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          <div className="h-px bg-accent" />
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-8">
          {viewMode === "search" ? (
            <>
              <FilterBar filters={filters} onChange={setFilters} />

              <section className="search-surface flex w-full flex-col gap-4">
                <SearchBar
                  inputRef={searchInputRef}
                  query={query}
                  onChange={setQuery}
                  onSearch={handleSearch}
                  loading={isLoading}
                />
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>20,000+ Candidates</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>AI-Powered</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>Real-time Search</span>
                </div>
                {searchError && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle size={16} />
                    {searchError}
                  </div>
                )}
                {!searchError && errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                )}
                {searchTimeMs !== null && !isLoading && !errorMessage && !searchError && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span>{totalFound} candidates found</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{Math.round(searchTimeMs)} ms search time</span>
                    {results.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        <X size={16} className="text-rose-500" />
                        Clear Search
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-20">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                    <p className="text-sm text-gray-400">Searching through candidates...</p>
                  </div>
                ) : (
                  results.map((candidate) => {
                  const scoreValue = Math.round(
                    Number(candidate.relevance_score ?? 0)
                  );
                  const scorePalette = scoreBadgeStyles(scoreValue);
                  const primarySkills = candidate.skills_primary || [];
                  const businessDomains = candidate.business_domains || [];
                  const salaryMin = formatSalaryMillions(candidate.salary_expectation_min);
                  const salaryMax = formatSalaryMillions(candidate.salary_expectation_max);
                  const salaryText =
                    salaryMin && salaryMax
                      ? `${salaryMin} - ${salaryMax} million VND`
                      : "Salary not specified";
                  return (
                    <div
                      key={candidate.candidate_id}
                      className={`flex min-h-[100px] min-w-0 items-center gap-6 overflow-x-hidden rounded-xl border border-l-4 bg-white p-5 text-slate-900 shadow-sm transition hover:shadow-md ${scorePalette.border}`}
                    >
                      <div className="flex w-16 shrink-0 justify-center">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${scorePalette.badge}`}
                        >
                          {scoreValue}
                        </div>
                      </div>

                      <div className="w-56 shrink-0 border-r border-slate-200 pr-4 flex flex-col gap-1">
                        <p className="text-base font-semibold">
                          {`${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()}
                        </p>
                        <span className="inline-flex max-w-[60px] items-center truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {seniorityLabels[candidate.seniority_level] || "Level"}
                        </span>
                        <p className="mt-1 text-sm text-gray-500">
                          {candidate.job_titles_canonical?.[0] || "Title not specified"}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {candidate.location_city || "Location"}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                candidate.availability_status === "available"
                                  ? "bg-emerald-400"
                                  : candidate.availability_status === "open"
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                              }`}
                            />
                            {candidate.availability_status || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-[1.35] border-r border-slate-200 pr-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                          {primarySkills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-[#EDF2F7] px-2 py-1 text-xs font-semibold text-[#4A5568]"
                            >
                              {skill}
                            </span>
                          ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                          {businessDomains.slice(0, 2).map((domain) => (
                            <span
                              key={domain}
                              className="rounded-full border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                            >
                              {domain}
                            </span>
                          ))}
                          </div>
                        </div>
                      </div>

                      <div className="w-44 shrink-0 border-r border-slate-200 px-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <Banknote size={12} className="text-gray-400" />
                          {salaryText}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={12} className="text-gray-400" />
                          {candidate.years_of_experience || 0} years exp
                        </p>
                      </div>

                      <div className="w-[220px] max-w-[220px] flex-none">
                        <div className="grid w-[220px] max-w-[220px] grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(candidate)}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-500 px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            {shortlistIds.includes(candidate.candidate_id) ? (
                              <BookmarkCheck size={14} className="text-red-500" />
                            ) : (
                              <Bookmark size={14} className="text-red-500" />
                            )}
                            <span className="min-w-0 truncate">Save for Job</span>
                          </button>
                          <ShareDropdown
                            candidate={candidate}
                            onToast={showToast}
                            buttonLabel="Share"
                            buttonClassName="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-500 px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          />
                          <button
                            type="button"
                            onClick={() => handleViewProfile(candidate)}
                            className="col-span-2 flex h-10 w-full max-w-full items-center justify-center gap-2 rounded-lg bg-[#E53E3E] px-2 text-xs font-semibold text-white transition hover:bg-[#C53030]"
                          >
                            <ExternalLink size={14} className="text-white" />
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </section>
            </>
          ) : (
            <section className="flex max-w-5xl flex-col gap-6">
              <button
                type="button"
                onClick={() => {
                  setViewMode("search");
                  setActiveNav("search");
                }}
                className="w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
              >
                Back to Search
              </button>

              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {viewMode === "job-order"
                    ? `${activeJobMeta.title} - ${activeJobMeta.company} - ${activeJobMeta.date}`
                    : activeNav === "recruitment-team"
                    ? "Recruitment Team"
                    : `${totalFound} candidates found`}
                </h2>
                {viewMode === "job-order" && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    {[
                      {
                        label: "Deadline",
                        value: "30 Jun 2026",
                        icon: Calendar,
                        iconTone: "text-amber-300"
                      },
                      {
                        label: "Target",
                        value: "5/10 hired",
                        icon: Users,
                        iconTone: "text-sky-300"
                      },
                      {
                        label: "Status",
                        value: "Active",
                        icon: Briefcase,
                        iconTone: "text-emerald-300"
                      },
                      {
                        label: "Location",
                        value: "Ho Chi Minh City",
                        icon: MapPin,
                        iconTone: "text-rose-300"
                      },
                      {
                        label: "Budget",
                        value: "40 - 70 million VND",
                        icon: Banknote,
                        iconTone: "text-yellow-300"
                      }
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
                      >
                        <item.icon size={14} className={item.iconTone} />
                        <span className="text-slate-500">{item.label}:</span>
                        <span className="text-slate-700">{item.value}</span>
                      </span>
                    ))}
                  </div>
                )}
                {viewMode !== "job-order" && (
                  <p className="mt-1 text-sm text-slate-600">
                    {activeNav === "recruitment-team"
                      ? "Manage your recruitment team members."
                      : `${totalFound} candidates found`}
                  </p>
                )}
              </div>

              {viewMode === "job-order" ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6 border-b border-slate-200 text-sm font-semibold text-slate-500">
                    <button
                      type="button"
                      onClick={() => setJobOrderTab("internal")}
                      className={`pb-2 transition ${
                        jobOrderTab === "internal"
                          ? "border-b-2 border-red-500 text-slate-900"
                          : "border-b-2 border-transparent hover:text-slate-900"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FolderOpen size={16} className="text-gray-400" />
                        Internal Retrieval ({internalCount})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobOrderTab("applications")}
                      className={`pb-2 transition ${
                        jobOrderTab === "applications"
                          ? "border-b-2 border-red-500 text-slate-900"
                          : "border-b-2 border-transparent hover:text-slate-900"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserPlus size={16} className="text-gray-400" />
                        New Applications ({newApplicationsCount})
                      </span>
                    </button>
                  </div>

                  {jobOrderTab === "internal" ? (
                    <div className="flex flex-col gap-3 transition-all">
                      {internalRetrievalCandidates.map((candidate) => (
                        <div
                          key={`${candidate.first_name}-${candidate.last_name}`}
                          className={`flex min-w-0 flex-row items-center gap-4 overflow-x-hidden rounded-xl border border-l-4 bg-white p-4 text-slate-900 shadow-sm transition hover:shadow-md ${statusBorderStyles(candidate.status)}`}
                        >
                          <div className="w-60 shrink-0 border-r border-slate-200 pr-4">
                            <p className="text-base font-semibold text-slate-900">
                              {`${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()}
                            </p>
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {candidate.seniority}
                            </span>
                            <p className="mt-1 text-sm text-slate-500">
                              {candidate.title}
                            </p>
                            <div className="mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-2">
                                <MapPin size={12} className="text-gray-400" />
                                <span>{candidate.location}</span>
                                <span className="text-gray-300">·</span>
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      candidate.availability === "available"
                                        ? "bg-emerald-400"
                                        : candidate.availability === "open"
                                          ? "bg-amber-400"
                                          : "bg-rose-400"
                                    }`}
                                  />
                                  {candidate.availability}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0 flex-[1.55] border-r border-slate-200 pr-4">
                            <div className="flex flex-wrap gap-2">
                              {(candidate.skills || []).slice(0, 3).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-[#EDF2F7] px-2.5 py-1 text-xs font-semibold text-[#4A5568]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(candidate.domains || []).slice(0, 2).map((domain) => (
                                <span
                                  key={domain}
                                  className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600"
                                >
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="w-40 shrink-0 border-r border-slate-200 pr-3">
                            <p className="flex items-center gap-2 text-sm text-slate-700">
                              <Banknote size={12} className="text-gray-400" />
                              {candidate.salaryMin && candidate.salaryMax
                                ? `${candidate.salaryMin} - ${candidate.salaryMax} million`
                                : candidate.salary}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                              <Clock size={12} className="text-gray-400" />
                              {candidate.years ? `${candidate.years} years` : "-"}
                            </p>
                            <div className="mt-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  statusColors[candidate.status]
                                }`}
                              >
                                {candidate.status}
                              </span>
                            </div>
                          </div>

                          <div className="w-[220px] max-w-[220px] flex-none self-center">
                            <div className="grid w-[220px] max-w-[220px] grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSave(candidate)}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500 px-2 text-sm font-semibold leading-none text-red-600 transition hover:bg-red-50"
                              >
                                <BookmarkPlus size={14} className="text-red-500" />
                                <span className="min-w-0 truncate">Save for Job</span>
                              </button>
                              <ShareDropdown
                                candidate={candidate}
                                onToast={showToast}
                                buttonLabel="Share"
                                buttonClassName="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500 px-2 text-sm font-semibold leading-none text-red-600 transition hover:bg-red-50"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const profileCandidate = buildInternalProfileCandidate(candidate);
                                  navigate(`/candidate/${profileCandidate.candidate_id}`, {
                                    state: {
                                      candidate: profileCandidate,
                                      from: "joborder",
                                      jobOrderId: activeJobMeta?.id
                                    }
                                  });
                                }}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E53E3E] px-2 text-sm font-semibold leading-none text-white transition hover:bg-[#C53030]"
                              >
                                <ExternalLink size={14} className="text-white" />
                                View Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromJob(candidate.candidate_id)}
                                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500 px-2 text-sm font-semibold leading-none text-red-600 transition hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 size={14} className="text-red-500" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            openUploadModal({
                              jobOrder: `${activeJobMeta.title} - ${activeJobMeta.company}`,
                              locked: true
                            })
                          }
                          className="flex items-center gap-2 rounded-xl border border-red-500 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Plus size={14} className="text-red-500" />
                          Add Candidate
                        </button>
                      </div>
                      {canScrollLeft && (
                        <button
                          type="button"
                          onClick={scrollLeft}
                          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-500"
                          aria-label="Scroll left"
                        >
                          <ChevronLeft size={16} className="text-slate-500" />
                        </button>
                      )}
                      {canScrollRight && (
                        <button
                          type="button"
                          onClick={scrollRight}
                          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-500"
                          aria-label="Scroll right"
                        >
                          <ChevronRight size={16} className="text-slate-500" />
                        </button>
                      )}
                      <div
                        ref={kanbanRef}
                        onScroll={updateScrollButtons}
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        className="kanban-scroll flex gap-4 overflow-x-auto pb-2 transition-all"
                      >
                        <DragDropContext onDragEnd={handleKanbanDragEnd}>
                          {kanbanColumns.map((column) => (
                            <Droppable droppableId={column.id} key={column.id}>
                              {(dropProvided) => (
                                <div
                                  ref={dropProvided.innerRef}
                                  {...dropProvided.droppableProps}
                                  className={`min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-[#F1F5F9] p-4 ${column.tone}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {column.icon && (
                                        <span className="mr-2 inline-flex">
                                          <column.icon size={14} className="text-emerald-500" />
                                        </span>
                                      )}
                                      {column.label}
                                    </span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                      {column.items.length}
                                    </span>
                                  </div>
                                  <div className="mt-4 flex flex-col gap-3">
                                    {column.items.map((candidate, index) => (
                                      <Draggable
                                        key={candidate.id}
                                        draggableId={candidate.id}
                                        index={index}
                                      >
                                        {(dragProvided) => (
                                          <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm transition hover:border-slate-300"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                  {`${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()}
                                                </p>
                                                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                  {candidate.seniority}
                                                </span>
                                              </div>
                                              <GripVertical size={14} className="text-slate-300" />
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                              <span>{candidate.date}</span>
                                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                                              <span>{candidate.source}</span>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {dropProvided.placeholder}
                                  </div>
                                </div>
                              )}
                            </Droppable>
                          ))}
                        </DragDropContext>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-12 text-sm text-slate-600">
                    <Construction size={48} className="text-slate-300" />
                    Recruitment Team page — coming soon.
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <UploadCVModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onCandidateSaved={handleCandidateSaved}
        jobOrderOptions={jobOrderOptions}
        defaultJobOrder={uploadJobOrder}
        jobOrderLocked={isUploadJobLocked}
      />
      {isSaveJobOpen && (
        <SaveJobModal
          candidate={activeCandidate}
          jobOrders={jobOrders}
          onClose={closeSaveJobModal}
          onSaveToJobOrder={handleSaveToJobOrder}
          onCreateJobOrder={handleCreateJobOrder}
        />
      )}
      {toastMessage && (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
