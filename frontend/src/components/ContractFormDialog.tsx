import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResorts, useCreateContract, useUpdateContract } from "../hooks/useContracts";
import {
  USE_YEAR_MONTHS,
  USE_YEAR_MONTH_NAMES,
} from "../types";
import type {
  ContractWithDetails,
  UseYearMonth,
  PurchaseType,
} from "../types";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editContract?: ContractWithDetails | null;
}

export default function ContractFormDialog({
  open,
  onOpenChange,
  editContract,
}: ContractFormDialogProps) {
  const { data: resorts } = useResorts();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const [name, setName] = useState("");
  const [homeResort, setHomeResort] = useState("");
  const [useYearMonth, setUseYearMonth] = useState<string>("");
  const [annualPoints, setAnnualPoints] = useState("");
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("resale");

  const isEditing = !!editContract;

  useEffect(() => {
    if (editContract) {
      setName(editContract.name || "");
      setHomeResort(editContract.home_resort);
      setUseYearMonth(String(editContract.use_year_month));
      setAnnualPoints(String(editContract.annual_points));
      setPurchaseType(editContract.purchase_type);
    } else {
      setName("");
      setHomeResort("");
      setUseYearMonth("");
      setAnnualPoints("");
      setPurchaseType("resale");
    }
  }, [editContract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: name || undefined,
      home_resort: homeResort,
      use_year_month: Number(useYearMonth),
      annual_points: Number(annualPoints),
      purchase_type: purchaseType,
    };

    if (isEditing && editContract) {
      await updateContract.mutateAsync({ id: editContract.id, data });
    } else {
      await createContract.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isPending = createContract.isPending || updateContract.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Contract" : "Add Contract"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your DVC contract details."
              : "Add a new DVC contract to track."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nickname (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Our Poly contract"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home_resort">Home Resort</Label>
            <Select value={homeResort} onValueChange={setHomeResort}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a resort" />
              </SelectTrigger>
              <SelectContent>
                {resorts?.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>
                    {r.short_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="use_year_month">Use Year Month</Label>
            <Select value={useYearMonth} onValueChange={setUseYearMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {USE_YEAR_MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {USE_YEAR_MONTH_NAMES[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annual_points">Annual Points</Label>
            <Input
              id="annual_points"
              type="number"
              min="1"
              max="2000"
              placeholder="e.g., 160"
              value={annualPoints}
              onChange={(e) => setAnnualPoints(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase_type">Purchase Type</Label>
            <Select
              value={purchaseType}
              onValueChange={(v) => setPurchaseType(v as PurchaseType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resale">Resale</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || !homeResort || !useYearMonth || !annualPoints
              }
            >
              {isPending
                ? "Saving..."
                : isEditing
                ? "Update"
                : "Add Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
