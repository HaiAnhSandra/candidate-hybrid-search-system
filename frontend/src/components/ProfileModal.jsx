import React, { useMemo, useState } from "react";

const TAB_OPTIONS = [
  "Overview",
  "Experience",
  "Screening & Evaluation",
  "Application History"
];

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

function formatMillions(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return Math.round(Number(value) / 1_000_000);
}

export default function ProfileModal({ candidate, onClose }) {
  const [activeTab, setActiveTab] = useState("Overview");

  const fullName = useMemo(() => {
    if (!candidate) {
      return "Candidate";
    }
    if (candidate.full_name) {
      return candidate.full_name;
    }
    if (candidate.first_name || candidate.last_name) {
      return `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
    }
    return candidate.name || "Candidate";
  }, [candidate]);

  const seniority =
    candidate?.seniority ||
    (candidate?.seniority_level !== undefined
      ? {
          0: "Fresher",
          1: "Junior",
          2: "Mid",
          3: "Senior",
          4: "Lead",
          5: "Expert"
        }[candidate.seniority_level]
      : "Senior");

  const availability = candidate?.availability_status || "available";
  const location = candidate?.location_city || candidate?.location || "Ho Chi Minh City";
  const salaryMin = candidate?.salaryMin ?? formatMillions(candidate?.salary_expectation_min);
  const salaryMax = candidate?.salaryMax ?? formatMillions(candidate?.salary_expectation_max);
  const salaryText =
    salaryMin && salaryMax ? `${salaryMin} - ${salaryMax} million` : "Not specified";

  const summary =
    candidate?.holistic_summary_text ||
    "Experienced engineer with strong delivery track record and cross-functional collaboration.";

  const primarySkills = candidate?.skills_primary || candidate?.skills || ["Java", "Spring Boot"];
  const secondarySkills = candidate?.skills_secondary || ["Kafka", "PostgreSQL"];
  const exposureSkills = candidate?.skills_exposure || ["Docker", "CI/CD"];
  const businessDomains = candidate?.business_domains || ["FinTech", "E-commerce"];
  const technicalDomains = candidate?.technical_domains || ["Backend", "Distributed Systems"];
  const certifications = candidate?.certifications || ["AWS Cloud Practitioner"];

  if (!candidate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0F1629] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{fullName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                {seniority}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {availability}
              </span>
              <span>{location}</span>
              <span>Salary: {salaryText}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/70 transition hover:border-red-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 border-b border-white/10 text-sm font-semibold text-white/60">
          <div className="flex flex-wrap items-center gap-6">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2 transition ${
                  activeTab === tab
                    ? "border-b-2 border-red-500 text-white"
                    : "border-b-2 border-transparent hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 transition-opacity duration-200">
          {activeTab === "Overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                  AI Summary
                </h3>
                <p className="mt-2 text-sm text-white/70">{summary}</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Primary Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {primarySkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Secondary Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {secondarySkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Exposure Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {exposureSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Business Domains</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {businessDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Technical Domains</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {technicalDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-white/50">Certifications</h4>
                  <ul className="mt-2 space-y-2 text-sm text-white/70">
                    {certifications.map((cert) => (
                      <li key={cert}>{cert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Experience" && (
            <div className="space-y-4">
              {DEFAULT_EXPERIENCE.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <span className="text-xs text-white/60">{item.duration}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{item.achievements}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tech.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-white/60">{item.domains}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Screening & Evaluation" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-6 text-sm text-white/70">
                  <div>
                    <p className="text-xs uppercase text-white/50">Screening Score</p>
                    <p className="mt-1 text-lg font-semibold text-white">85/100</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-white/50">Interview Rating</p>
                    <p className="mt-1 text-lg font-semibold text-white">4/5</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase text-white/50">Interviewer Notes</p>
                  <div className="mt-2 rounded-xl border border-white/10 bg-[#0B1224] p-3 text-sm text-white/70">
                    Strong communication and system design skills. Recommended for onsite loop.
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase text-white/50">Overall Performance</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                    <div className="h-2 w-3/4 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Application History" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-6 text-sm text-white/70">
                <span>Total applications: 3</span>
                <span>Success rate: 67%</span>
              </div>
              <div className="space-y-3">
                {DEFAULT_HISTORY.map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm text-white/80">{item.role}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
