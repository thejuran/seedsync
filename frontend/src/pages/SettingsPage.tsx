import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type AppSetting = { key: string; value: string };

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AppSetting[]>("/settings"),
  });

  const mutation = useMutation({
    mutationFn: (value: string) =>
      api.put<AppSetting>("/settings/borrowing_limit_pct", { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const currentValue =
    settings?.find((s) => s.key === "borrowing_limit_pct")?.value ?? "100";

  const options = [
    {
      value: "100",
      label: "100%",
      description: "Borrow up to full annual points",
    },
    {
      value: "50",
      label: "50%",
      description: "Borrow up to half of annual points",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure application preferences
        </p>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Loading settings...</p>
      )}

      {error && (
        <p className="text-destructive">
          Failed to load settings: {(error as Error).message}
        </p>
      )}

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Borrowing Policy</CardTitle>
            <CardDescription>
              Controls the maximum percentage of a contract's annual points that
              can be borrowed from the next use year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => mutation.mutate(opt.value)}
                  disabled={mutation.isPending}
                  className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    currentValue === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div
                    className={`text-sm ${
                      currentValue === opt.value
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
            {mutation.isError && (
              <p className="text-destructive text-sm mt-3">
                Failed to update setting: {(mutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
