type MobileStatusTone = "success" | "warning" | "danger" | "neutral";

type MobileStatusBadgeProps = {
  label: string;
  tone?: MobileStatusTone;
};

const toneClassMap: Record<MobileStatusTone, string> = {
  success: "mobile-status-badge--success",
  warning: "mobile-status-badge--warning",
  danger: "mobile-status-badge--danger",
  neutral: "mobile-status-badge--neutral",
};

export default function MobileStatusBadge({
  label,
  tone = "neutral",
}: MobileStatusBadgeProps) {
  return (
    <span className={["mobile-status-badge", toneClassMap[tone]].join(" ")}>
      {label}
    </span>
  );
}