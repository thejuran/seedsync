import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContracts } from "../hooks/useContracts";
import ContractCard from "../components/ContractCard";
import ContractFormDialog from "../components/ContractFormDialog";
import type { ContractWithDetails } from "../types";

export default function ContractsPage() {
  const { data: contracts, isLoading, error } = useContracts();
  const [formOpen, setFormOpen] = useState(false);
  const [editContract, setEditContract] = useState<ContractWithDetails | null>(
    null
  );

  const handleEdit = (contract: ContractWithDetails) => {
    setEditContract(contract);
    setFormOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditContract(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Contracts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your DVC contracts and point balances
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon className="size-4" />
          Add Contract
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Loading contracts...</p>
      )}

      {error && (
        <p className="text-destructive">
          Failed to load contracts: {error.message}
        </p>
      )}

      {contracts && contracts.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            No contracts yet. Add your first DVC contract to get started.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setFormOpen(true)}
          >
            <PlusIcon className="size-4" />
            Add Contract
          </Button>
        </div>
      )}

      {contracts && contracts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <ContractFormDialog
        open={formOpen}
        onOpenChange={handleOpenChange}
        editContract={editContract}
      />
    </div>
  );
}
