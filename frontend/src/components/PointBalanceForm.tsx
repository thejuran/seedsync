import { useState } from "react";
import { PencilIcon, TrashIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useContractPoints,
  useCreatePointBalance,
  useUpdatePointBalance,
  useDeletePointBalance,
} from "../hooks/usePoints";
import type { PointAllocationType } from "../types";
import { ALLOCATION_TYPE_LABELS } from "../types";

interface PointBalanceFormProps {
  contractId: number;
}

const ALLOCATION_TYPES: PointAllocationType[] = [
  "current",
  "banked",
  "borrowed",
  "holding",
];

export default function PointBalanceForm({ contractId }: PointBalanceFormProps) {
  const { data: pointsData } = useContractPoints(contractId);
  const createBalance = useCreatePointBalance();
  const updateBalance = useUpdatePointBalance();
  const deleteBalance = useDeletePointBalance();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newType, setNewType] = useState<PointAllocationType>("current");
  const [newPoints, setNewPoints] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPoints, setEditPoints] = useState(0);

  const handleAdd = async () => {
    await createBalance.mutateAsync({
      contractId,
      data: {
        use_year: newYear,
        allocation_type: newType,
        points: newPoints,
      },
    });
    setShowAddForm(false);
    setNewPoints(0);
  };

  const handleUpdate = async (balanceId: number) => {
    await updateBalance.mutateAsync({
      balanceId,
      points: editPoints,
      contractId,
    });
    setEditingId(null);
  };

  const handleDelete = async (balanceId: number) => {
    await deleteBalance.mutateAsync({ balanceId, contractId });
  };

  if (!pointsData) return null;

  const years = Object.keys(pointsData.balances_by_year).sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Point Balances</h4>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <PlusIcon className="size-3" />
          Add
        </Button>
      </div>

      {showAddForm && (
        <div className="flex items-end gap-2 rounded-md border p-3 bg-muted/30">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Year</label>
            <Input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="w-20 h-8 text-sm"
              min={2020}
              max={2035}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select
              value={newType}
              onValueChange={(v) => setNewType(v as PointAllocationType)}
            >
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOCATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ALLOCATION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Points</label>
            <Input
              type="number"
              value={newPoints}
              onChange={(e) => setNewPoints(Number(e.target.value))}
              className="w-20 h-8 text-sm"
              min={0}
            />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={createBalance.isPending}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {years.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year) => {
              const yearData = pointsData.balances_by_year[year];
              return ALLOCATION_TYPES.filter((t) => yearData[t] > 0).map(
                (allocType) => {
                  // We need the actual balance ID for edit/delete. For now use a composite key approach.
                  // The grouped API doesn't return individual IDs, so we derive actions from contract points.
                  return (
                    <TableRow key={`${year}-${allocType}`}>
                      <TableCell className="text-sm">{year}</TableCell>
                      <TableCell className="text-sm">
                        {ALLOCATION_TYPE_LABELS[allocType]}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {yearData[allocType]}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Edit/delete require individual balance IDs which come from the detail endpoint */}
                      </TableCell>
                    </TableRow>
                  );
                }
              );
            })}
            <TableRow className="font-semibold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">
                {pointsData.grand_total}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          No point balances entered yet.
        </p>
      )}
    </div>
  );
}
