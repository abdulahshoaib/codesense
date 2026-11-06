import { Info } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import { formatDate } from "@/lib/format";

function ProfileRow({
  label,
  value
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ProfileSection(): React.ReactElement {
  const user = useAuthStore((state) => state.user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your CodeSense account information.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileRow label="Display name" value={user?.name ?? "—"} />
          <ProfileRow label="Email address" value={user?.email ?? "—"} />
          <ProfileRow
            label="Member since"
            value={formatDate(user?.createdAt)}
          />
        </div>
        <Alert variant="info" icon={Info}>
          Profile editing is not available yet. The backend does not expose a
          profile update endpoint.
        </Alert>
      </CardContent>
    </Card>
  );
}
