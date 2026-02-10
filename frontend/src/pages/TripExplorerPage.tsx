import { useState } from "react";
import { useTripExplorer } from "../hooks/useTripExplorer";
import TripExplorerForm from "../components/TripExplorerForm";
import TripExplorerResults from "../components/TripExplorerResults";

export default function TripExplorerPage() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const { data, isLoading, error } = useTripExplorer(
    checkIn || null,
    checkOut || null
  );

  const showPrompt = !checkIn && !checkOut && !data;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Trip Explorer</h2>
        <p className="text-sm text-muted-foreground">
          Find what you can afford for a date range
        </p>
      </div>

      <TripExplorerForm
        checkIn={checkIn}
        checkOut={checkOut}
        onCheckInChange={setCheckIn}
        onCheckOutChange={setCheckOut}
        isLoading={isLoading}
      />

      {error && (
        <p className="text-destructive">
          Failed to search: {error.message}
        </p>
      )}

      {data && <TripExplorerResults data={data} />}

      {showPrompt && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            Select check-in and check-out dates to see what you can book.
          </p>
        </div>
      )}
    </div>
  );
}
