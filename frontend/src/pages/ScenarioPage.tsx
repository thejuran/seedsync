import { useScenarioStore } from "@/store/useScenarioStore";
import { useScenarioEvaluation } from "@/hooks/useScenarioEvaluation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ScenarioPage() {
  const bookings = useScenarioStore((s) => s.bookings);
  const clearAll = useScenarioStore((s) => s.clearAll);
  const { data: _evaluation } = useScenarioEvaluation(bookings);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          What-If Scenarios
        </h2>
        <p className="text-sm text-muted-foreground">
          Model hypothetical bookings and compare point impact
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Workspace</CardTitle>
          <CardDescription>
            {bookings.length} hypothetical booking(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            disabled={bookings.length === 0}
            onClick={() => clearAll()}
          >
            Clear All
          </Button>
          <p className="text-sm text-muted-foreground">
            Full scenario workspace coming in next plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
