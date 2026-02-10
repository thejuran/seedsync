import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResorts } from "../hooks/useContracts";
import {
  useAvailableCharts,
  usePointChart,
  useChartRooms,
  useChartSeasons,
} from "../hooks/usePointCharts";
import PointChartTable from "../components/PointChartTable";
import SeasonCalendar from "../components/SeasonCalendar";
import StayCostCalculator from "../components/StayCostCalculator";

type TabId = "chart" | "calendar" | "calculator";

const TABS: { id: TabId; label: string }[] = [
  { id: "chart", label: "Point Chart" },
  { id: "calendar", label: "Season Calendar" },
  { id: "calculator", label: "Cost Calculator" },
];

export default function PointChartsPage() {
  const { data: charts, isLoading: chartsLoading } = useAvailableCharts();
  const { data: resorts } = useResorts();

  const [selectedResort, setSelectedResort] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("chart");

  // Build resort display names lookup
  const resortNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (resorts) {
      for (const r of resorts) {
        map[r.slug] = r.short_name;
      }
    }
    return map;
  }, [resorts]);

  // Get unique resorts and years from available charts
  const uniqueResorts = useMemo(() => {
    if (!charts) return [];
    const set = new Set(charts.map((c) => c.resort));
    return Array.from(set).sort();
  }, [charts]);

  const availableYears = useMemo(() => {
    if (!charts || !selectedResort) return [];
    return charts
      .filter((c) => c.resort === selectedResort)
      .map((c) => c.year)
      .sort();
  }, [charts, selectedResort]);

  // Auto-select first chart when data loads
  useEffect(() => {
    if (charts && charts.length > 0 && !selectedResort) {
      setSelectedResort(charts[0].resort);
      setSelectedYear(String(charts[0].year));
    }
  }, [charts, selectedResort]);

  // When resort changes, auto-select first year
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const year = Number(selectedYear);

  const { data: chart, isLoading: chartLoading } = usePointChart(
    selectedResort,
    year
  );
  const { data: roomsData } = useChartRooms(selectedResort, year);
  const { data: seasonsData } = useChartSeasons(selectedResort, year);

  if (chartsLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Point Charts</h2>
        <p className="text-muted-foreground">Loading available charts...</p>
      </div>
    );
  }

  if (!charts || charts.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Point Charts</h2>
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            No point charts available. Add chart JSON files to data/point_charts/.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Point Charts</h2>
        <p className="text-sm text-muted-foreground">
          Browse point costs by resort, season, and room type
        </p>
      </div>

      {/* Chart selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">Resort</label>
          <Select value={selectedResort} onValueChange={setSelectedResort}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select resort..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueResorts.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  {resortNames[slug] || slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Year</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {chartLoading && (
        <p className="text-muted-foreground">Loading chart data...</p>
      )}

      {activeTab === "chart" && chart && roomsData && (
        <PointChartTable chart={chart} rooms={roomsData.rooms} />
      )}

      {activeTab === "calendar" && seasonsData && (
        <SeasonCalendar year={year} seasons={seasonsData.seasons} />
      )}

      {activeTab === "calculator" && roomsData && (
        <StayCostCalculator
          resort={selectedResort}
          year={year}
          rooms={roomsData.rooms}
        />
      )}
    </div>
  );
}
