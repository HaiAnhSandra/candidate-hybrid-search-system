import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BarChart2,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Code2,
  GraduationCap,
  Handshake,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Bookmark,
  Sparkles,
  Star,
  Users,
  UsersRound
} from "lucide-react";
import SaveJobModal from "../components/SaveJobModal.jsx";
import ShareDropdown from "../components/ShareDropdown.jsx";
import { getCandidateById } from "../api/candidates.js";

const NAV_ITEMS = [
  { id: "search", label: "Search", icon: LayoutDashboard },
  { id: "job-orders", label: "Job Orders", icon: Briefcase },
  { id: "candidates", label: "Candidates", icon: Users },
  { id: "recruitment-team", label: "Recruitment Team", icon: UsersRound },
  { id: "sources", label: "Sources & Vendors", icon: Building2 },
  { id: "clients", label: "Clients", icon: Handshake },
  { id: "analytics", label: "Analytics", icon: BarChart2 }
];

const TAB_OPTIONS = [
  { id: "Overview", label: "Overview", icon: LayoutDashboard },
  { id: "Experience", label: "Experience", icon: Briefcase },
  {
    id: "Applications & Assessment",
    label: "Applications & Assessment",
    icon: ClipboardList
  },
  { id: "Notes & Comments", label: "Notes & Comments", icon: MessageSquare },
  { id: "Application History", label: "Application History", icon: History }
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

const AVAILABILITY_DOT = {
  available: "bg-emerald-500",
  open: "bg-amber-400",
  closed: "bg-rose-500"
};

const DEFAULT_EXPERIENCE = [
  {
    title: "Senior Backend Engineer",
    duration: "2022 - Present",
    tech: ["Java", "Spring Boot", "Kafka"],
    domains: "FinTech / Payments",
    achievements:
      "Led migration to event-driven architecture and reduced latency by 35%."
  },
  {
    title: "Backend Engineer",
    duration: "2019 - 2022",
    tech: ["PostgreSQL", "Docker", "Redis"],
    domains: "E-commerce",
    achievements:
      "Built resilient order pipelines and improved system observability."
  }
];

const DEFAULT_HISTORY = [
  { role: "Senior Java Developer - Tiki", status: "Shortlisted" },
  { role: "Backend Lead - MoMo", status: "In Review" },
  { role: "Platform Engineer - VNG", status: "Rejected" }
];

const APPLICATION_STATUS_STYLES = {
  Shortlisted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  "In Review": "bg-amber-100 text-amber-700"
};

const APPLICATIONS = [
  {
    id: "tiki-java",
    title: "Senior Java Developer",
    company: "Tiki",
    date: "15 Apr 2026",
    status: "Shortlisted",
    assessment: {
      screening: {
        recruiter: "Thanh Le",
        date: "16 Apr 2026",
        impression:
          "Strong backend fundamentals and consistent delivery history. Communicates clearly and aligns with team expectations.",
        criteria: [
          { label: "Technical Knowledge", score: 9 },
          { label: "Problem Solving", score: 8 },
          { label: "Communication Skills", score: 8 },
          { label: "Culture Fit", score: 9 },
          { label: "Motivation & Attitude", score: 8 }
        ],
        overallScore: 88,
        recommendation: "Pass"
      },
      rounds: [
        {
          id: "tech",
          title: "Technical Interview",
          interviewer: "Anh Nguyen",
          date: "18 Apr 2026",
          duration: "60 min",
          criteria: [
            { label: "Technical Depth", score: 4 },
            { label: "System Design", score: 4 },
            { label: "Code Quality", score: 4 },
            { label: "Problem Solving", score: 5 },
            { label: "Communication", score: 4 }
          ],
          strengths:
            "Demonstrated clear system design thinking and strong debugging approach with large-scale services.",
          improvements:
            "Could deepen trade-off analysis for performance vs. scalability decisions.",
          overall: 4.2
        },
        {
          id: "hr",
          title: "HR Interview",
          interviewer: "Minh Tran",
          date: "20 Apr 2026",
          duration: "45 min",
          criteria: [
            { label: "Culture Fit", score: 4 },
            { label: "Career Goals Alignment", score: 4 },
            { label: "Team Collaboration", score: 4 },
            { label: "Salary Expectation Match", score: 5 },
            { label: "Availability & Notice Period", score: 3 }
          ],
          strengths:
            "Aligned on growth path and demonstrated strong team-first mindset.",
          improvements:
            "Notice period is slightly longer than expected; needs follow-up.",
          overall: 4.0
        }
      ],
      decision: {
        status: "Offer Extended",
        salary: 65,
        date: "22 Apr 2026",
        notes: "Proceed with offer and align start date with notice period."
      }
    }
  },
  {
    id: "vng-backend",
    title: "Backend Engineer",
    company: "VNG",
    date: "10 Mar 2026",
    status: "Rejected",
    assessment: {
      screening: {
        recruiter: "Khoa Pham",
        date: "12 Mar 2026",
        impression:
          "Solid coding experience but limited exposure to distributed systems at scale. Communication was average.",
        criteria: [
          { label: "Technical Knowledge", score: 6 },
          { label: "Problem Solving", score: 6 },
          { label: "Communication Skills", score: 5 },
          { label: "Culture Fit", score: 6 },
          { label: "Motivation & Attitude", score: 6 }
        ],
        overallScore: 62,
        recommendation: "Reject"
      },
      rounds: [
        {
          id: "tech",
          title: "Technical Interview",
          interviewer: "Linh Do",
          date: "15 Mar 2026",
          duration: "60 min",
          criteria: [
            { label: "Technical Depth", score: 3 },
            { label: "System Design", score: 2 },
            { label: "Code Quality", score: 3 },
            { label: "Problem Solving", score: 3 },
            { label: "Communication", score: 3 }
          ],
          strengths: "Structured approach to simpler tasks and clear documentation style.",
          improvements:
            "Struggled with scalability discussions and handling edge cases in distributed workflows.",
          overall: 3.0
        },
        {
          id: "hr",
          title: "HR Interview",
          interviewer: "Huy Le",
          date: "17 Mar 2026",
          duration: "30 min",
          criteria: [
            { label: "Culture Fit", score: 3 },
            { label: "Career Goals Alignment", score: 3 },
            { label: "Team Collaboration", score: 3 },
            { label: "Salary Expectation Match", score: 2 },
            { label: "Availability & Notice Period", score: 4 }
          ],
          strengths: "Open to feedback and has a pragmatic working style.",
          improvements:
            "Salary expectations exceeded the target range for this role.",
          overall: 3.1
        }
      ],
      decision: {
        status: "Rejected",
        salary: 0,
        date: "20 Mar 2026",
        notes: "Not a match for current role requirements. Keep in pipeline."
      }
    }
  },
  {
    id: "momo-lead",
    title: "Lead Engineer",
    company: "MoMo",
    date: "1 May 2026",
    status: "In Review",
    assessment: {
      screening: {
        recruiter: "Phuong Tran",
        date: "2 May 2026",
        impression:
          "Senior leader with strong delivery history. Needs deeper alignment on team leadership expectations.",
        criteria: [
          { label: "Technical Knowledge", score: 8 },
          { label: "Problem Solving", score: 7 },
          { label: "Communication Skills", score: 7 },
          { label: "Culture Fit", score: 7 },
          { label: "Motivation & Attitude", score: 8 }
        ],
        overallScore: 78,
        recommendation: "Hold"
      },
      rounds: [
        {
          id: "tech",
          title: "Technical Interview",
          interviewer: "Hoang Nguyen",
          date: "5 May 2026",
          duration: "60 min",
          criteria: [
            { label: "Technical Depth", score: 4 },
            { label: "System Design", score: 4 },
            { label: "Code Quality", score: 4 },
            { label: "Problem Solving", score: 4 },
            { label: "Communication", score: 4 }
          ],
          strengths: "Balanced technical depth and strong mentorship examples.",
          improvements: "Needs more detail on incident management leadership.",
          overall: 4.0
        },
        {
          id: "hr",
          title: "HR Interview",
          interviewer: "Pending",
          date: "TBD",
          duration: "TBD",
          criteria: [
            { label: "Culture Fit", score: 0 },
            { label: "Career Goals Alignment", score: 0 },
            { label: "Team Collaboration", score: 0 },
            { label: "Salary Expectation Match", score: 0 },
            { label: "Availability & Notice Period", score: 0 }
          ],
          strengths: "Pending",
          improvements: "Pending",
          overall: 0
        }
      ],
      decision: {
        status: "On Hold",
        salary: 0,
        date: "TBD",
        notes: "Awaiting HR round and hiring manager alignment."
      }
    }
  }
];

function formatMillions(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return Math.round(Number(value) / 1_000_000);
}

function formatSalaryRange(minValue, maxValue) {
  const min = formatMillions(minValue);
  const max = formatMillions(maxValue);

  if (min !== null && max !== null) {
    return `${min} - ${max} million VND`;
  }
  if (min !== null) {
    return `${min} million VND`;
  }
  if (max !== null) {
    return `${max} million VND`;
  }
  return "Not specified";
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getDegreeLabel(level) {
  if (level === null || level === undefined || level === "") {
    return "Not specified";
  }
  return DEGREE_LEVEL_LABELS[level] || "Not specified";
}

function parseExperience(text) {
  if (!text) {
    return [];
  }
  return text
    .split(/\n\s*\n/)
    .filter((block) => block.trim());
}

function parseBlock(block) {
  const lines = block
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  let title = "";
  let company = "";
  let domain = "";
  let responsibilities = "";
  let technologies = [];
  let methodologies = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.includes(" at ") && !title) {
      const parts = trimmed.replace(".", "").split(" at ");
      title = parts[0]?.trim();
      company = parts[1]?.trim();
    } else if (trimmed.startsWith("Technical domain:")) {
      domain = trimmed
        .replace("Technical domain:", "")
        .trim()
        .replace(".", "");
    } else if (trimmed.startsWith("Responsibilities:")) {
      responsibilities = trimmed.replace("Responsibilities:", "").trim();
    } else if (trimmed.startsWith("Technologies:")) {
      technologies = trimmed
        .replace("Technologies:", "")
        .trim()
        .replace(".", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (trimmed.startsWith("Methodologies:")) {
      methodologies = trimmed
        .replace("Methodologies:", "")
        .trim()
        .replace(".", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  });

  return {
    title,
    company,
    domain,
    responsibilities,
    technologies,
    methodologies
  };
}

function getInitials(name) {
  if (!name) {
    return "C";
  }
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) {
    return "C";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function CandidateProfilePage({ authUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: candidateIdParam } = useParams();
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedApplicationId, setSelectedApplicationId] = useState(APPLICATIONS[0].id);
  const [openRounds, setOpenRounds] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [isSaveJobOpen, setIsSaveJobOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [candidate, setCandidate] = useState(location.state?.candidate || null);
  const [isLoadingCandidate, setIsLoadingCandidate] = useState(!location.state?.candidate && Boolean(candidateIdParam));
  const [candidateLoadError, setCandidateLoadError] = useState("");
  const [jobOrders, setJobOrders] = useState([
    { id: "vng-frontend", title: "Senior Frontend Engineer", company: "VNG", date: "20 Mar 2026", count: 3 },
    { id: "tiki-java", title: "Senior Java Developer", company: "Tiki", date: "25 Apr 2026", count: 7 },
    { id: "momo-devops", title: "DevOps Lead", company: "MoMo", date: "2 May 2026", count: 2 }
  ]);

  const { from, jobOrderId, searchQuery, searchResults, filters, toastMessage: routeToastMessage } =
    location.state || {};

  useEffect(() => {
    let isCancelled = false;

    if (location.state?.candidate) {
      setCandidate(location.state.candidate);
      setIsLoadingCandidate(false);
      setCandidateLoadError("");
      return undefined;
    }

    if (!candidateIdParam) {
      setCandidate(null);
      setIsLoadingCandidate(false);
      setCandidateLoadError("Candidate not found");
      return undefined;
    }

    setIsLoadingCandidate(true);
    setCandidateLoadError("");

    getCandidateById(candidateIdParam)
      .then((candidateData) => {
        if (!isCancelled) {
          setCandidate(candidateData);
          setCandidateLoadError("");
        }
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        if (error?.status === 404) {
          setCandidate(null);
          setCandidateLoadError("Candidate not found");
        } else {
          setCandidate(null);
          setCandidateLoadError(error?.message || "Unable to load candidate profile");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingCandidate(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [candidateIdParam, location.state]);

  const displayName = useMemo(() => {
    const name = `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim();
    return name || "Candidate";
  }, [candidate]);

  const candidateId = candidate?.candidate_id || `internal-${displayName}`;
  const jobTitles = asArray(candidate?.job_titles_canonical);
  const title = jobTitles[0] || "Role not specified";
  const seniority =
    candidate?.seniority ||
    (candidate?.seniority_level !== undefined && candidate?.seniority_level !== null
      ? SENIORITY_LABELS[candidate.seniority_level] || "Not specified"
      : "Not specified");
  const availability = candidate?.availability_status || "available";
  const locationText = candidate?.location_city || "Not specified";
  const yearsExperience = candidate?.years_of_experience ?? "Not specified";
  const salaryText = formatSalaryRange(
    candidate?.salary_expectation_min,
    candidate?.salary_expectation_max
  );
  const scoreValue = Math.round(
    Number(candidate?.score ?? candidate?.relevance_score ?? 82)
  );

  const summary = candidate?.holistic_summary_text || "No summary available";
  const careerTrajectory = candidate?.career_trajectory_text || "No career trajectory available";
  const experienceBlocks = parseExperience(candidate?.experience_block_text);
  const primarySkills = asArray(candidate?.skills_primary);
  const secondarySkills = asArray(candidate?.skills_secondary);
  const exposureSkills = asArray(candidate?.skills_exposure);
  const businessDomains = asArray(candidate?.business_domains);
  const technicalDomains = asArray(candidate?.technical_domains);
  const certifications = asArray(candidate?.certifications);
  const sourceValue =
    candidate?.source || candidate?.vendor || candidate?.source_vendor || candidate?.data_source;
  const degreeField = candidate?.degree_field_raw || "Not specified";
  const degreeLabel = getDegreeLabel(candidate?.degree_level);
  const isTechnicalDegree = Boolean(candidate?.is_technical_degree);
  const avatarInitials = getInitials(displayName);
  const userInitials = getInitials(authUser?.name);


  const selectedApplication = APPLICATIONS.find(
    (application) => application.id === selectedApplicationId
  );

  const toggleRound = (roundKey) => {
    setOpenRounds((prev) => ({
      ...prev,
      [roundKey]: !prev[roundKey]
    }));
  };

  const handleSave = (currentCandidate) => {
    const salaryMin = currentCandidate?.salary_expectation_min ?? currentCandidate?.salaryMin ?? null;
    const salaryMax = currentCandidate?.salary_expectation_max ?? currentCandidate?.salaryMax ?? null;

    setActiveCandidate({
      ...currentCandidate,
      location_display:
        currentCandidate?.location_city || currentCandidate?.location || currentCandidate?.city || "Not specified",
      availability_display:
        currentCandidate?.availability_status || currentCandidate?.availability || "Not specified",
      years_experience_display:
        currentCandidate?.years_of_experience ?? currentCandidate?.years ?? "Not specified",
      title_display:
        currentCandidate?.job_titles_canonical?.[0] || currentCandidate?.title || currentCandidate?.role || "Role not specified",
      salary_display: formatSalaryRange(salaryMin, salaryMax)
    });
    setIsSaveJobOpen(true);
  };

  const handleSaveToJobOrder = (jobOrder) => {
    setToastMessage(`Saved to ${jobOrder.title}`);
    setIsSaveJobOpen(false);
    setActiveCandidate(null);
  };

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!routeToastMessage) {
      return;
    }

    setToastMessage(routeToastMessage);
  }, [routeToastMessage]);

  const handleCreateJobOrder = (jobOrderName) => {
    const newJobOrder = {
      id: `job-${Date.now()}`,
      title: jobOrderName,
      company: "Internal",
      date: "Today",
      count: 0
    };
    setJobOrders((prev) => [newJobOrder, ...prev]);
    setToastMessage(`Created ${jobOrderName}`);
    setIsSaveJobOpen(false);
    setActiveCandidate(null);
  };

  if (isLoadingCandidate) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">Loading candidate profile...</h1>
        </div>
      </div>
    );
  }

  if (!candidate) {
    if (candidateLoadError && candidateLoadError !== "Candidate not found") {
      return (
        <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
          <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-2xl font-semibold">Unable to load candidate profile</h1>
            <p className="text-sm text-slate-600">{candidateLoadError}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
            >
              Back to Search
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">Candidate not found</h1>
          <p className="text-sm text-slate-600">{candidateLoadError || "Go back to the search page and open a profile again."}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (from === "joborder") {
      navigate("/", {
        state: {
          activeView: "joborder",
          jobOrderId
        }
      });
      return;
    }
    if (from === "recruitment-team") {
      navigate("/", {
        state: {
          activeView: "recruitment-team"
        }
      });
      return;
    }
    if (searchQuery || searchResults || filters) {
      navigate("/", {
        state: {
          searchQuery,
          searchResults,
          filters
        }
      });
      return;
    }
    navigate(-1);
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
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === "candidates";
            const iconTone = isActive ? "text-red-500" : "text-gray-400";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "search") {
                    navigate("/");
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-red-500 bg-[#EFF6FF] text-[#2563EB]"
                    : "border-transparent text-[#4A5568] hover:text-slate-900"
                }`}
              >
                <span className="text-base" aria-hidden="true">
                  <item.icon size={18} className={iconTone} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="ml-[240px] min-h-screen bg-[#F5F7FA]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
              >
                <ArrowLeft size={18} className="text-slate-500" />
                Back
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Candidate Profile
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {displayName}
                </h2>
              </div>
            </div>
              <div className="flex items-center gap-3">
                {authUser && (
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white">
                      {userInitials}
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-sm font-medium text-gray-800">
                        {authUser.name}
                      </p>
                      <p className="text-xs text-gray-500">{authUser.role}</p>
                    </div>
                  </div>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <LogOut size={16} className="text-gray-500" />
                    Sign Out
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(candidate)}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-red-500 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Bookmark size={14} className="text-red-500" />
                  Save for Job
                </button>
                <ShareDropdown
                  candidate={candidate}
                  onToast={setToastMessage}
                  buttonLabel="Share Profile"
                  buttonClassName="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#E53E3E] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#C53030]"
                />
              </div>
          </div>
          <div className="h-px bg-accent" />
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-700">
                  {avatarInitials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-semibold text-slate-900">{displayName}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {seniority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>{locationText}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          AVAILABILITY_DOT[availability] || "bg-slate-300"
                        }`}
                      />
                      {availability}
                    </span>
                    <span>
                      {yearsExperience === "Not specified" ? yearsExperience : `${yearsExperience} yrs exp`}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Salary</p>
                <p className="text-lg font-semibold text-slate-900">{salaryText}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-500">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2 transition ${
                    activeTab === tab.id
                      ? "border-b-2 border-red-500 text-slate-900"
                      : "border-b-2 border-transparent hover:text-slate-900"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <tab.icon
                      size={15}
                      className={
                        activeTab === tab.id ? "text-red-500" : "text-gray-400"
                      }
                    />
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            {activeTab === "Overview" && (
              <div className="space-y-6">
                <div>
                  <h4 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles size={14} className="text-slate-400" />
                    Holistic Profile
                  </h4>
                  <p className="mt-2 text-sm text-slate-700">{summary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Career Trajectory
                  </h4>
                  <p className="mt-2 text-sm italic text-slate-700">{careerTrajectory}</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h5 className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      <Code2 size={14} className="text-slate-400" />
                      Primary Skills
                    </h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {primarySkills.length > 0 ? (
                        primarySkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#EDF2F7] px-3 py-1 text-xs font-semibold text-[#4A5568]"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-slate-500">Secondary Skills</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {secondarySkills.length > 0 ? (
                        secondarySkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#EDF2F7] px-3 py-1 text-xs font-semibold text-[#4A5568]"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-slate-500">Exposure Skills</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exposureSkills.length > 0 ? (
                        exposureSkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-[#EDF2F7] px-3 py-1 text-xs font-semibold text-[#4A5568]"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-slate-500">Business Domains</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {businessDomains.length > 0 ? (
                        businessDomains.map((domain) => (
                          <span
                            key={domain}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
                          >
                            {domain}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-slate-500">Technical Domains</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {technicalDomains.length > 0 ? (
                        technicalDomains.map((domain) => (
                          <span
                            key={domain}
                            className="rounded-full border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700"
                          >
                            {domain}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      <Award size={14} className="text-slate-400" />
                      Certifications
                    </h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {certifications.length > 0 ? (
                        certifications.map((cert) => (
                          <span
                            key={cert}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {cert}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      <GraduationCap size={14} className="text-slate-400" />
                      Education
                    </h5>
                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                      <p>{degreeField}</p>
                      <p>{degreeLabel}</p>
                      {isTechnicalDegree && (
                        <p className="inline-flex items-center gap-2 font-semibold text-emerald-600">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          Technical Degree
                        </p>
                      )}
                      {sourceValue && <p>Source: {sourceValue}</p>}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-slate-500">Job Titles</h5>
                    <div className="mt-3 space-y-3">
                      {jobTitles.length > 0 ? (
                        jobTitles.map((jobTitle, index) => (
                          <div
                            key={`${jobTitle}-${index}`}
                            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {jobTitles.length - index}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{jobTitle}</p>
                              <p className="text-xs text-slate-500">
                                {index === 0 ? "Current / latest role" : `Previous role ${index}`}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">None listed</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Experience" && (
              <div className="space-y-4">
                {experienceBlocks.length > 0 ? (
                  experienceBlocks.map((block, index) => {
                    const parsed = parseBlock(block);
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-l-4 border-red-500 bg-white p-5 flex flex-col gap-3"
                      >
                        {/* Header */}
                        <div>
                          <h3 className="text-slate-900 font-bold text-base">
                            {parsed.title}
                          </h3>
                          <p className="text-slate-500 text-sm">
                            {parsed.company}
                          </p>
                        </div>

                        {/* Domain tag */}
                        {parsed.domain && (
                          <span className="text-xs px-2 py-1 rounded-full border border-red-200 text-red-600 w-fit">
                            {parsed.domain}
                          </span>
                        )}

                        {/* Responsibilities */}
                        {parsed.responsibilities && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Responsibilities
                            </p>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {parsed.responsibilities}
                            </p>
                          </div>
                        )}

                        {/* Technologies */}
                        {parsed.technologies.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                              Technologies
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {parsed.technologies.map((tech, techIndex) => (
                                <span
                                  key={techIndex}
                                  className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Methodologies */}
                        {parsed.methodologies.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                              Methodologies
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {parsed.methodologies.map((method, methodIndex) => (
                                <span
                                  key={methodIndex}
                                  className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800"
                                >
                                  {method}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    No experience data available
                  </div>
                )}
              </div>
            )}

            {activeTab === "Applications & Assessment" && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    Sample Data (Demo)
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    Applications
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    {APPLICATIONS.map((application) => {
                      const isSelected = application.id === selectedApplicationId;
                      return (
                        <button
                          key={application.id}
                          type="button"
                          onClick={() => setSelectedApplicationId(application.id)}
                          className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 border-l-4 px-4 py-3 text-left text-sm transition ${
                            isSelected
                              ? "border-red-500 border-l-red-500 bg-red-50"
                              : "border-slate-200 border-l-transparent bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex min-w-[240px] flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {application.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              {application.company}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{application.date}</span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              APPLICATION_STATUS_STYLES[application.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {application.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedApplication && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                        Section A - Screening Assessment
                      </p>
                      <div className="mt-4 space-y-4 text-sm text-slate-600">
                        <p>
                          Conducted by: {selectedApplication.assessment.screening.recruiter} on{" "}
                          {selectedApplication.assessment.screening.date}
                        </p>
                        <p className="text-slate-600">
                          {selectedApplication.assessment.screening.impression}
                        </p>
                        <div className="space-y-3">
                          {selectedApplication.assessment.screening.criteria.map((item) => {
                            const percentage = Math.round((item.score / 10) * 100);
                            return (
                              <div key={item.label} className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{item.label}</span>
                                  <span>
                                    {item.score}/10 · {percentage}%
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-red-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm font-semibold text-slate-900">
                            Overall screening score: {selectedApplication.assessment.screening.overallScore}/100
                          </span>
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Recommendation: {selectedApplication.assessment.screening.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                        Section B - Interview Rounds
                      </p>
                      <div className="mt-4 space-y-4">
                        {selectedApplication.assessment.rounds.map((round) => {
                          const roundKey = `${selectedApplication.id}-${round.id}`;
                          const isOpen = openRounds[roundKey] ?? true;
                          return (
                            <div
                              key={roundKey}
                              className="rounded-2xl border border-slate-200 bg-white"
                            >
                              <button
                                type="button"
                                onClick={() => toggleRound(roundKey)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {round.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Interviewer: {round.interviewer} | Date: {round.date} | Duration:{" "}
                                    {round.duration}
                                  </p>
                                </div>
                                <span className="text-slate-400">
                                  {isOpen ? (
                                    <ChevronUp size={16} className="text-slate-400" />
                                  ) : (
                                    <ChevronDown size={16} className="text-slate-400" />
                                  )}
                                </span>
                              </button>
                              {isOpen && (
                                <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {round.criteria.map((criterion) => (
                                      <div
                                        key={criterion.label}
                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <span className="text-xs text-slate-600">
                                          {criterion.label}
                                        </span>
                                        <span className="flex items-center gap-1 text-sm text-red-500">
                                          {Array.from({ length: 5 }).map((_, index) => (
                                            <Star
                                              key={`${roundKey}-${criterion.label}-${index}`}
                                              size={14}
                                              className={
                                                index < criterion.score
                                                  ? "text-red-500 fill-red-500"
                                                  : "text-slate-300"
                                              }
                                            />
                                          ))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-4 space-y-3">
                                    <div>
                                      <p className="text-xs uppercase text-red-400">Strengths</p>
                                      <p className="mt-1 text-sm text-slate-600">{round.strengths}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase text-red-400">Areas for improvement</p>
                                      <p className="mt-1 text-sm text-slate-600">{round.improvements}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs uppercase text-red-400">Overall rating</span>
                                      <span className="text-sm font-semibold text-slate-900">
                                        {round.overall ? `${round.overall}/5` : "Pending"}
                                      </span>
                                      <span className="flex items-center gap-1 text-red-500">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                          <Star
                                            key={`${roundKey}-overall-${index}`}
                                            size={14}
                                            className={
                                              index < Math.round(round.overall || 0)
                                                ? "text-red-500 fill-red-500"
                                                : "text-slate-300"
                                            }
                                          />
                                        ))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                        Section C - Final Decision
                      </p>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-slate-900">Hiring Manager decision:</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {selectedApplication.assessment.decision.status}
                          </span>
                        </div>
                        <p>
                          Offered salary: {selectedApplication.assessment.decision.salary || "TBD"} million VND
                        </p>
                        <p>Decision date: {selectedApplication.assessment.decision.date}</p>
                        <p className="text-slate-600">{selectedApplication.assessment.decision.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Notes & Comments" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    Sample Data (Demo)
                  </p>
                </div>
                {["Strong culture fit.", "Needs deeper Kafka experience.", "Schedule follow-up."].map(
                  (note, index) => (
                    <div
                      key={`${note}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                    >
                      {note}
                    </div>
                  )
                )}
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500 hover:text-slate-900"
                >
                  <Plus size={14} className="text-slate-400" />
                  Add Comment
                </button>
              </div>
            )}

            {activeTab === "Application History" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    Sample Data (Demo)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
                  <span>Total applications: 3</span>
                  <span>Success rate: 67%</span>
                </div>
                <div className="space-y-3">
                  {DEFAULT_HISTORY.map((item) => (
                    <div
                      key={item.role}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <span className="text-sm text-slate-700">{item.role}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {toastMessage && (
        <div className="fixed right-6 top-6 z-50 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            aria-label="Dismiss notification"
            className="rounded-md px-1 text-slate-400 transition hover:text-slate-700"
          >
            <X size={14} />
          </button>
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
          onSaveToJobOrder={handleSaveToJobOrder}
          onCreateJobOrder={handleCreateJobOrder}
        />
      )}
    </div>
  );
}
