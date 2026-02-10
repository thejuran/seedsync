import { useState } from "react";
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useResorts, useDeleteContract } from "../hooks/useContracts";
import { useContractTimeline } from "../hooks/usePoints";
import { USE_YEAR_MONTH_NAMES } from "../types";
import type { ContractWithDetails, UseYearMonth } from "../types";
import UseYearTimeline from "./UseYearTimeline";
import EligibleResorts from "./EligibleResorts";
import PointBalanceForm from "./PointBalanceForm";

interface ContractCardProps {
  contract: ContractWithDetails;
  onEdit: (contract: ContractWithDetails) => void;
}

export default function ContractCard({ contract, onEdit }: ContractCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: resorts } = useResorts();
  const deleteContract = useDeleteContract();
  const { data: timelineData } = useContractTimeline(
    expanded ? contract.id : 0
  );

  const resort = resorts?.find((r) => r.slug === contract.home_resort);
  const resortName = resort?.short_name || contract.home_resort;
  const monthName =
    USE_YEAR_MONTH_NAMES[contract.use_year_month as UseYearMonth] ||
    `Month ${contract.use_year_month}`;

  // Compute point summary from contract's point_balances
  const totalPoints = contract.point_balances.reduce(
    (sum, pb) => sum + pb.points,
    0
  );

  const handleDelete = async () => {
    await deleteContract.mutateAsync(contract.id);
    setShowDeleteConfirm(false);
  };

  // Quick timeline summary from the inline use_year_timeline
  const tl = contract.use_year_timeline;
  const bankingInfo = tl
    ? tl.banking_deadline_passed
      ? "Banking deadline passed"
      : `Banking deadline ${tl.days_until_banking_deadline > 0 ? `in ${tl.days_until_banking_deadline} days` : "today"}`
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {resortName}
                {contract.name && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    -- {contract.name}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {monthName} Use Year &middot; {contract.annual_points} pts/year
              </CardDescription>
            </div>
            <CardAction>
              <Badge
                variant={
                  contract.purchase_type === "direct" ? "default" : "secondary"
                }
                className={
                  contract.purchase_type === "direct"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }
              >
                {contract.purchase_type === "direct" ? "Direct" : "Resale"}
              </Badge>
            </CardAction>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Point summary */}
          <div className="text-sm">
            <span className="text-muted-foreground">Total points: </span>
            <span className="font-semibold">
              {totalPoints > 0 ? totalPoints : "--"}
            </span>
          </div>

          {/* Banking deadline snippet */}
          {bankingInfo && (
            <div
              className={`text-xs ${
                tl?.banking_deadline_passed
                  ? "text-red-600"
                  : tl && tl.days_until_banking_deadline <= 30
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }`}
            >
              {bankingInfo}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onEdit(contract)}
            >
              <PencilIcon className="size-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <TrashIcon className="size-3" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUpIcon className="size-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDownIcon className="size-3" />
                  More
                </>
              )}
            </Button>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="space-y-4 border-t pt-4">
              <PointBalanceForm contractId={contract.id} />
              {timelineData && (
                <UseYearTimeline timelines={timelineData.timelines} />
              )}
              <EligibleResorts
                eligibleResorts={contract.eligible_resorts}
                purchaseType={contract.purchase_type}
                homeResort={contract.home_resort}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{contract.name || resortName}"?
              This will also delete all associated point balances. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContract.isPending}
            >
              {deleteContract.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
