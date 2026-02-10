import { CheckIcon, AlertTriangleIcon } from "lucide-react";
import { useResorts } from "../hooks/useContracts";
import type { PurchaseType } from "../types";

const LOCATION_GROUPS: Record<string, string> = {
  "Walt Disney World": "Walt Disney World",
  "Disneyland Resort": "Disneyland",
  "Ko Olina, Hawaii": "Hawaii",
  "Hilton Head Island, SC": "Hilton Head",
  "Vero Beach, FL": "Vero Beach",
};

interface EligibleResortsProps {
  eligibleResorts: string[];
  purchaseType: PurchaseType;
  homeResort: string;
}

export default function EligibleResorts({
  eligibleResorts,
  purchaseType,
  homeResort,
}: EligibleResortsProps) {
  const { data: resorts } = useResorts();
  if (!resorts) return null;

  const eligibleSet = new Set(eligibleResorts);
  const eligibleResortData = resorts.filter((r) => eligibleSet.has(r.slug));

  // Group by location
  const grouped: Record<string, typeof eligibleResortData> = {};
  for (const resort of eligibleResortData) {
    const groupName = LOCATION_GROUPS[resort.location] || resort.location;
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(resort);
  }

  const homeResortData = resorts.find((r) => r.slug === homeResort);
  const isRestricted =
    purchaseType === "resale" && eligibleResorts.length === 1;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Eligible Resorts</h4>

      {purchaseType === "direct" && (
        <p className="text-sm text-green-600">Can book at all DVC resorts</p>
      )}

      {purchaseType === "resale" && !isRestricted && (
        <p className="text-sm text-blue-600">
          Can book at 14 original DVC resorts
        </p>
      )}

      {isRestricted && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-700 border border-amber-200">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>
            Resale contract -- can only book at{" "}
            {homeResortData?.short_name || homeResort}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(grouped).map(([location, locationResorts]) => (
          <div key={location}>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {location}
            </p>
            <div className="space-y-0.5">
              {locationResorts.map((resort) => (
                <div
                  key={resort.slug}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <CheckIcon className="size-3.5 text-green-500 shrink-0" />
                  <span>{resort.short_name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
