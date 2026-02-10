import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalculateStayCost } from "../hooks/usePointCharts";
import type { RoomInfo, StayCostResponse } from "../types";

interface StayCostCalculatorProps {
  resort: string;
  year: number;
  rooms: RoomInfo[];
}

export default function StayCostCalculator({
  resort,
  year,
  rooms,
}: StayCostCalculatorProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StayCostResponse | null>(null);

  const mutation = useCalculateStayCost();

  const validate = (): string | null => {
    if (!checkIn) return "Please select a check-in date.";
    if (!checkOut) return "Please select a check-out date.";
    if (!roomKey) return "Please select a room type.";
    if (checkOut <= checkIn) return "Check-out must be after check-in.";

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);
    const nights = Math.round(
      (coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights > 14) return "Maximum stay is 14 nights.";

    const ciYear = ciDate.getFullYear();
    if (ciYear !== year)
      return `Check-in date must be in ${year}.`;

    return null;
  };

  const handleCalculate = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }
    setError(null);

    mutation.mutate(
      {
        resort,
        room_key: roomKey,
        check_in: checkIn,
        check_out: checkOut,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setError(null);
        },
        onError: (err) => {
          setError(err.message);
          setResult(null);
        },
      }
    );
  };

  const avgPoints = result
    ? Math.round(result.total_points / result.num_nights)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check-in">Check-in</Label>
          <Input
            id="check-in"
            type="date"
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check-out">Check-out</Label>
          <Input
            id="check-out"
            type="date"
            min={checkIn || `${year}-01-01`}
            max={`${year + 1}-01-14`}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Room Type</Label>
          <Select value={roomKey} onValueChange={setRoomKey}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select room..." />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.key} value={room.key}>
                  {room.room_type} - {room.view}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleCalculate} disabled={mutation.isPending}>
          {mutation.isPending ? "Calculating..." : "Calculate"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Total Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{result.total_points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Nights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{result.num_nights}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Avg Points/Night
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgPoints}</p>
              </CardContent>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Weekend?</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.nightly_breakdown.map((night) => (
                <TableRow key={night.date}>
                  <TableCell>{night.date}</TableCell>
                  <TableCell>{night.day_of_week}</TableCell>
                  <TableCell>{night.season}</TableCell>
                  <TableCell>{night.is_weekend ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {night.points}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
