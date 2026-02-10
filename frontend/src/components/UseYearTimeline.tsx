import { format, parseISO } from "date-fns";
import { CalendarIcon, ClockIcon, AlertTriangleIcon } from "lucide-react";
import type { UseYearTimeline as TimelineType } from "../types";

interface UseYearTimelineProps {
  timelines: TimelineType[];
}

function getDeadlineColor(
  bankingDeadlinePassed: boolean,
  daysUntilBankingDeadline: number
): string {
  if (bankingDeadlinePassed) return "text-red-600";
  if (daysUntilBankingDeadline <= 30) return "text-amber-600";
  return "text-green-600";
}

function getDeadlineBarColor(
  bankingDeadlinePassed: boolean,
  daysUntilBankingDeadline: number
): string {
  if (bankingDeadlinePassed) return "bg-red-100 border-red-200";
  if (daysUntilBankingDeadline <= 30) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function TimelineEntry({ timeline }: { timeline: TimelineType }) {
  const deadlineColor = getDeadlineColor(
    timeline.banking_deadline_passed,
    timeline.days_until_banking_deadline
  );
  const barColor = getDeadlineBarColor(
    timeline.banking_deadline_passed,
    timeline.days_until_banking_deadline
  );

  return (
    <div className={`rounded-md border p-3 space-y-2 ${barColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{timeline.label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            timeline.status === "active"
              ? "bg-green-100 text-green-700"
              : timeline.status === "upcoming"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {timeline.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <CalendarIcon className="size-3" />
          <span>
            {formatDate(timeline.start)} - {formatDate(timeline.end)}
          </span>
        </div>

        <div className={`flex items-center gap-1 ${deadlineColor}`}>
          {timeline.banking_deadline_passed ? (
            <AlertTriangleIcon className="size-3" />
          ) : (
            <ClockIcon className="size-3" />
          )}
          <span>
            Banking deadline: {formatDate(timeline.banking_deadline)} (
            {daysLabel(timeline.days_until_banking_deadline)})
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <ClockIcon className="size-3" />
          <span>
            Expires: {formatDate(timeline.point_expiration)} (
            {daysLabel(timeline.days_until_expiration)})
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UseYearTimeline({ timelines }: UseYearTimelineProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Use Year Timeline</h4>
      <div className="space-y-2">
        {timelines.map((tl) => (
          <TimelineEntry key={tl.use_year} timeline={tl} />
        ))}
      </div>
    </div>
  );
}
