import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PointChart, RoomInfo } from "../types";

interface PointChartTableProps {
  chart: PointChart;
  rooms: RoomInfo[];
}

/** Map a point value to a heat-map background class (green=low, yellow=mid, red=high). */
function heatColor(value: number, min: number, max: number): string {
  if (max === min) return "bg-green-100 dark:bg-green-900/30";
  const ratio = (value - min) / (max - min);
  if (ratio < 0.2) return "bg-green-100 dark:bg-green-900/30";
  if (ratio < 0.4) return "bg-lime-100 dark:bg-lime-900/30";
  if (ratio < 0.6) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (ratio < 0.8) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

export default function PointChartTable({ chart, rooms }: PointChartTableProps) {
  // Compute global min/max across all values for heat mapping
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const season of chart.seasons) {
    for (const roomData of Object.values(season.rooms)) {
      globalMin = Math.min(globalMin, roomData.weekday, roomData.weekend);
      globalMax = Math.max(globalMax, roomData.weekday, roomData.weekend);
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10">Room Type</TableHead>
            <TableHead className="sticky left-[120px] bg-background z-10">View</TableHead>
            {chart.seasons.map((season) => (
              <TableHead key={season.name} colSpan={2} className="text-center border-l">
                {season.name}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10" />
            <TableHead className="sticky left-[120px] bg-background z-10" />
            {chart.seasons.map((season) => (
              <>
                <TableHead key={`${season.name}-wd`} className="text-center border-l text-xs text-muted-foreground">
                  Wkday
                </TableHead>
                <TableHead key={`${season.name}-we`} className="text-center text-xs text-muted-foreground">
                  Wkend
                </TableHead>
              </>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.key}>
              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                {room.room_type}
              </TableCell>
              <TableCell className="sticky left-[120px] bg-background z-10 text-muted-foreground">
                {room.view}
              </TableCell>
              {chart.seasons.map((season) => {
                const roomData = season.rooms[room.key];
                if (!roomData) {
                  return (
                    <>
                      <TableCell key={`${season.name}-${room.key}-wd`} className="text-center border-l text-muted-foreground">
                        --
                      </TableCell>
                      <TableCell key={`${season.name}-${room.key}-we`} className="text-center text-muted-foreground">
                        --
                      </TableCell>
                    </>
                  );
                }
                return (
                  <>
                    <TableCell
                      key={`${season.name}-${room.key}-wd`}
                      className={`text-center border-l tabular-nums ${heatColor(roomData.weekday, globalMin, globalMax)}`}
                    >
                      {roomData.weekday}
                    </TableCell>
                    <TableCell
                      key={`${season.name}-${room.key}-we`}
                      className={`text-center tabular-nums ${heatColor(roomData.weekend, globalMin, globalMax)}`}
                    >
                      {roomData.weekend}
                    </TableCell>
                  </>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
