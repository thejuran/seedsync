import { useMemo } from "react";

interface SeasonInfo {
  name: string;
  date_ranges: [string, string][];
}

interface SeasonCalendarProps {
  year: number;
  seasons: SeasonInfo[];
}

const SEASON_COLORS: Record<string, { bg: string; text: string; legend: string }> = {
  Adventure: { bg: "bg-blue-200 dark:bg-blue-800", text: "text-blue-900 dark:text-blue-100", legend: "bg-blue-400" },
  Choice: { bg: "bg-teal-200 dark:bg-teal-800", text: "text-teal-900 dark:text-teal-100", legend: "bg-teal-400" },
  Dream: { bg: "bg-purple-200 dark:bg-purple-800", text: "text-purple-900 dark:text-purple-100", legend: "bg-purple-400" },
  Magic: { bg: "bg-amber-200 dark:bg-amber-800", text: "text-amber-900 dark:text-amber-100", legend: "bg-amber-400" },
  Peak: { bg: "bg-rose-200 dark:bg-rose-800", text: "text-rose-900 dark:text-rose-100", legend: "bg-rose-400" },
  Premier: { bg: "bg-red-200 dark:bg-red-800", text: "text-red-900 dark:text-red-100", legend: "bg-red-400" },
  Select: { bg: "bg-green-200 dark:bg-green-800", text: "text-green-900 dark:text-green-100", legend: "bg-green-400" },
};

const FALLBACK_COLORS = [
  { bg: "bg-sky-200 dark:bg-sky-800", text: "text-sky-900 dark:text-sky-100", legend: "bg-sky-400" },
  { bg: "bg-orange-200 dark:bg-orange-800", text: "text-orange-900 dark:text-orange-100", legend: "bg-orange-400" },
  { bg: "bg-indigo-200 dark:bg-indigo-800", text: "text-indigo-900 dark:text-indigo-100", legend: "bg-indigo-400" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getSeasonColor(name: string, index: number) {
  return SEASON_COLORS[name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function SeasonCalendar({ year, seasons }: SeasonCalendarProps) {
  // Build a lookup: day-of-year -> season name
  const dateSeasonMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const season of seasons) {
      for (const [startStr, endStr] of season.date_ranges) {
        const start = new Date(startStr + "T00:00:00");
        const end = new Date(endStr + "T00:00:00");
        const current = new Date(start);
        while (current <= end) {
          const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
          map[key] = season.name;
          current.setDate(current.getDate() + 1);
        }
      }
    }
    return map;
  }, [seasons]);

  // Build color map
  const colorMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getSeasonColor>> = {};
    seasons.forEach((s, i) => {
      map[s.name] = getSeasonColor(s.name, i);
    });
    return map;
  }, [seasons]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <MonthGrid
            key={monthName}
            year={year}
            month={monthIndex}
            monthName={monthName}
            dateSeasonMap={dateSeasonMap}
            colorMap={colorMap}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {seasons.map((season, i) => {
          const color = getSeasonColor(season.name, i);
          return (
            <div key={season.name} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${color.legend}`} />
              <span className="text-sm">{season.name}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-foreground/60" />
          Weekend (Fri/Sat)
        </div>
      </div>
    </div>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  monthName: string;
  dateSeasonMap: Record<string, string>;
  colorMap: Record<string, { bg: string; text: string; legend: string }>;
}

function MonthGrid({ year, month, monthName, dateSeasonMap, colorMap }: MonthGridProps) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  // Pad start
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad end to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="border rounded-lg p-3">
      <h3 className="text-sm font-semibold text-center mb-2">{monthName}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="h-7" />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const seasonName = dateSeasonMap[dateKey];
          const color = seasonName ? colorMap[seasonName] : undefined;
          const dateObj = new Date(year, month, day);
          const dow = dateObj.getDay();
          const isWeekend = dow === 5 || dow === 6; // Fri=5, Sat=6

          return (
            <div
              key={i}
              className={`h-7 flex items-center justify-center text-xs rounded relative ${
                color ? `${color.bg} ${color.text}` : "text-muted-foreground"
              }`}
              title={`${dateKey}${seasonName ? ` - ${seasonName}` : ""}${isWeekend ? " (weekend)" : ""}`}
            >
              {day}
              {isWeekend && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground/60" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
