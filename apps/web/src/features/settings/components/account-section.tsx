import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLogout } from "@/features/auth/hooks/use-logout";

export function AccountSection(): React.ReactElement {
  const logout = useLogout();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Manage your current session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => setIsConfirmOpen(true)}
          className="text-destructive hover:text-destructive"
        >
          <LogOut aria-hidden="true" />
          Log out
        </Button>
      </CardContent>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Log out"
        description="You will be signed out of CodeSense on this device."
        confirmLabel="Log out"
        destructive
        onConfirm={() => {
          setIsConfirmOpen(false);
          logout();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </Card>
  );
}
