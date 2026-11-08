import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ProfileForm } from "@/features/settings/components/profile-form";
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
        {user ? <ProfileForm user={user} /> : null}
        <ProfileRow label="Member since" value={formatDate(user?.createdAt)} />
      </CardContent>
    </Card>
  );
}
