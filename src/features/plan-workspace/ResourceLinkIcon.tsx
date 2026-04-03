import type { IconPreset } from "../../lib/plan/resource-link-preset";

interface ResourceLinkIconProps {
  preset: IconPreset;
}

const ICON_SIZE = 14;

function FileIcon() {
  return (
    <svg
      data-icon="file"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 1.5h5.586L13 4.914V13.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9.5 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5.5 8.5h5M5.5 10.5h3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      data-icon="external"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.5 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M9 2.5h4.5V7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 2.5 8 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      data-icon="github"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 .2A8 8 0 0 0 5.47 15.79c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 8 .2Z" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg
      data-icon="gitlab"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m8 14.5-3.1-9.54h6.2L8 14.5Z" fill="#E24329" />
      <path d="m8 14.5-3.1-9.54H1.22L8 14.5Z" fill="#FC6D26" />
      <path
        d="M1.22 4.96.07 8.5a.78.78 0 0 0 .28.87L8 14.5 1.22 4.96Z"
        fill="#FCA326"
      />
      <path
        d="M1.22 4.96h3.68L3.24.88a.39.39 0 0 0-.74 0L1.22 4.96Z"
        fill="#E24329"
      />
      <path d="m8 14.5 3.1-9.54h3.68L8 14.5Z" fill="#FC6D26" />
      <path
        d="m14.78 4.96 1.15 3.54a.78.78 0 0 1-.28.87L8 14.5l6.78-9.54Z"
        fill="#FCA326"
      />
      <path
        d="M14.78 4.96h-3.68l1.66-4.08a.39.39 0 0 1 .74 0l1.28 4.08Z"
        fill="#E24329"
      />
    </svg>
  );
}

function JiraIcon() {
  return (
    <svg
      data-icon="jira"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.816 7.404 8.597 1.184 8 .588l-5.404 5.404a.585.585 0 0 0 0 .828L7.588 11.8l.412.413 4.992-4.992.02-.02 1.804-1.797a.585.585 0 0 0 0-.828v.828ZM8 10.388 5.612 8 8 5.612 10.388 8 8 10.388Z"
        fill="#2684FF"
      />
      <path
        d="M8 5.612A3.381 3.381 0 0 1 7.987 .82L2.608 6.2l2.992 2.992L8 5.612Z"
        fill="url(#jira-grad-a)"
      />
      <path
        d="M10.396 7.992 8 10.388a3.38 3.38 0 0 1 0 4.792l5.392-5.392-2.996-2.796Z"
        fill="url(#jira-grad-b)"
      />
      <defs>
        <linearGradient
          id="jira-grad-a"
          x1="7.6"
          y1="3.18"
          x2="4.05"
          y2="5.69"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient
          id="jira-grad-b"
          x1="8.44"
          y1="12.81"
          x2="11.97"
          y2="10.33"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ConfluenceIcon() {
  return (
    <svg
      data-icon="confluence"
      aria-hidden="true"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.26 11.4c-.17.28-.37.62-.52.87a.42.42 0 0 0 .15.58l2.8 1.73a.43.43 0 0 0 .59-.13c.13-.22.31-.53.5-.87 1.26-2.2 2.53-1.93 4.84-.87l2.74 1.25a.43.43 0 0 0 .57-.2l1.3-2.87a.42.42 0 0 0-.2-.56c-.82-.38-2.2-1.01-2.75-1.26C7.04 7.36 3.8 7.05 1.26 11.4Z"
        fill="url(#conf-grad-a)"
      />
      <path
        d="M14.74 4.6c.17-.28.37-.62.52-.87a.42.42 0 0 0-.15-.58l-2.8-1.73a.43.43 0 0 0-.59.13c-.13.22-.31.53-.5.87-1.26 2.2-2.53 1.93-4.84.87L3.64 2.04a.43.43 0 0 0-.57.2l-1.3 2.87a.42.42 0 0 0 .2.56c.82.38 2.2 1.01 2.75 1.26C8.96 8.64 12.2 8.95 14.74 4.6Z"
        fill="url(#conf-grad-b)"
      />
      <defs>
        <linearGradient
          id="conf-grad-a"
          x1="14.38"
          y1="13.55"
          x2="6.38"
          y2="10.26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient
          id="conf-grad-b"
          x1="1.62"
          y1="2.45"
          x2="9.62"
          y2="5.74"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ResourceLinkIcon({ preset }: ResourceLinkIconProps) {
  switch (preset) {
    case "file":
      return <FileIcon />;
    case "external":
      return <ExternalIcon />;
    case "github":
      return <GitHubIcon />;
    case "gitlab":
      return <GitLabIcon />;
    case "jira":
      return <JiraIcon />;
    case "confluence":
      return <ConfluenceIcon />;
  }
}
