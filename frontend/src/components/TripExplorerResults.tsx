import { parseRoomKey } from "../lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TripExplorerResponse } from "../types";

interface TripExplorerResultsProps {
  data: TripExplorerResponse;
}

export default function TripExplorerResults({ data }: TripExplorerResultsProps) {
  return (
    <div className="space-y-4">
      {/* Coverage info banner */}
      <div className="bg-muted/50 border rounded-lg p-3 text-sm">
        {data.resorts_skipped.length > 0 ? (
          <>
            <p>
              Checked {data.resorts_checked.length} resort(s).{" "}
              {data.resorts_skipped.length} eligible resort(s) skipped — no
              point chart data available.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Skipped:{" "}
              {data.resorts_skipped
                .map((s) => s.replace(/_/g, " "))
                .join(", ")}
            </p>
          </>
        ) : (
          <p>
            Checked all {data.resorts_checked.length} eligible resort(s).
          </p>
        )}
      </div>

      {/* Results summary */}
      <p className="text-sm font-medium">
        {data.total_options} affordable option(s) for {data.num_nights}{" "}
        night(s)
      </p>

      {/* Results grid */}
      {data.options.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            No affordable options found for these dates.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {data.options.map((option, idx) => {
            const { roomType, view } = parseRoomKey(option.room_key);
            const remainingPct =
              option.available_points > 0
                ? option.points_remaining / option.available_points
                : 0;

            return (
              <Card key={`${option.contract_id}-${option.room_key}-${idx}`}>
                <CardContent className="pt-4">
                  <p className="font-semibold">{option.resort_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {roomType}
                    {view ? ` — ${view}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.contract_name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold">
                      {option.total_points} pts
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({option.nightly_avg} pts/night)
                    </span>
                  </div>
                  <div className="mt-2">
                    <Badge
                      variant="secondary"
                      className={
                        remainingPct >= 0.5
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }
                    >
                      {option.points_remaining} pts remaining
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
