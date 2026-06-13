import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCopy,
  Link,
  Mail,
  Link2 as Linkedin,
  Share2
} from "lucide-react";

function formatMillions(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return Math.round(numericValue / 1_000_000);
}

export default function ShareDropdown({
  candidate,
  onToast,
  buttonLabel = "Share",
  buttonClassName = "",
  menuClassName = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const candidateId = candidate?.candidate_id;
  const fullName =
    `${candidate?.first_name || ""} ${candidate?.last_name || ""}`.trim() ||
    candidate?.name ||
    "Candidate";
  const role = candidate?.job_titles_canonical?.[0] || candidate?.title || "Role not specified";
  const location = candidate?.location_city || candidate?.location || "Not specified";
  const yearsExperience = candidate?.years_of_experience ?? candidate?.years ?? "Not specified";
  const skills = candidate?.skills_primary || candidate?.skills || [];
  const salaryMin = formatMillions(candidate?.salary_expectation_min ?? candidate?.salaryMin);
  const salaryMax = formatMillions(candidate?.salary_expectation_max ?? candidate?.salaryMax);
  const profileUrl = candidateId
    ? `${window.location.origin}/candidate/${candidateId}`
    : window.location.origin;

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedInsideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(event.target);

      if (!clickedInsideWrapper && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return;
    }

    const updatePosition = () => {
      const buttonNode = buttonRef.current;
      if (!buttonNode) {
        return;
      }

      const rect = buttonNode.getBoundingClientRect();
      const menuWidth = 256;
      const viewportPadding = 8;
      const top = rect.bottom + window.scrollY + 8;
      const idealLeft = rect.right + window.scrollX - menuWidth;
      const clampedLeft = Math.max(
        viewportPadding,
        Math.min(idealLeft, window.scrollX + window.innerWidth - menuWidth - viewportPadding)
      );

      setMenuStyle({
        position: "absolute",
        top,
        left: clampedLeft,
        width: menuWidth,
        zIndex: 9999
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const showToast = (message) => {
    if (typeof onToast === "function") {
      onToast(message);
    }
  };

  const shareOptions = [
    {
      label: "Copy Link",
      icon: <Link size={14} />,
      action: async () => {
        if (!candidateId) {
          showToast("Candidate link is unavailable.");
          return;
        }
        await navigator.clipboard.writeText(profileUrl);
        showToast("Link copied!");
      }
    },
    {
      label: "Share via Email",
      icon: <Mail size={14} />,
      action: () => {
        const subject = `Candidate Profile: ${fullName}`;
        const skillList = skills.length ? skills.join(", ") : "Not specified";
        const body =
          `Check out this candidate profile:\n\n` +
          `Name: ${fullName}\n` +
          `Role: ${role}\n` +
          `Location: ${location}\n` +
          `Experience: ${yearsExperience} years\n` +
          `Skills: ${skillList}\n\n` +
          `View profile: ${profileUrl}`;
        window.open(
          `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        );
      }
    },
    {
      label: "Share to LinkedIn",
      icon: <Linkedin size={14} />,
      action: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    },
    {
      label: "Copy Profile Summary",
      icon: <ClipboardCopy size={14} />,
      action: async () => {
        const skillList = skills.length ? skills.join(", ") : "Not specified";
        const salaryText =
          salaryMin !== null && salaryMax !== null
            ? `Salary: ${salaryMin}-${salaryMax}M VND`
            : "Salary: Not specified";
        const summary =
          `${fullName}\n` +
          `${role} | ${location}\n` +
          `${yearsExperience} years experience\n` +
          `Skills: ${skillList}\n` +
          `${salaryText}`;
        await navigator.clipboard.writeText(summary);
        showToast("Profile summary copied!");
      }
    }
  ];

  const handleAction = async (action) => {
    try {
      await action();
    } finally {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative block w-full min-w-0 ${menuClassName}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Share2 size={14} className="shrink-0" />
        {buttonLabel}
      </button>

      {isOpen && menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            {shareOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleAction(option.action)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}