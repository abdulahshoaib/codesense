import { SiGithub } from "@icons-pack/react-simple-icons";
import type { GitHubConnection } from "@codesense/shared";
import { Unplug } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useConnectGithub,
  useDisconnectGithub
} from "@/features/settings/hooks/use-github";
import { getErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

function ConnectedGitHubAccount({
  connection,
  onDisconnect
}: {
  connection: GitHubConnection;
  onDisconnect: () => void;
}): React.ReactElement {
  const displayName = connection.name || connection.login;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={displayName} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{displayName}</span>
          <span className="truncate text-xs text-muted-foreground">
            @{connection.login}
          </span>
        </div>
        <Badge variant="success">Connected</Badge>
      </div>
      <Button
        variant="outline"
        onClick={onDisconnect}
        className="text-destructive hover:text-destructive"
      >
        <Unplug aria-hidden="true" />
        Disconnect
      </Button>
    </div>
  );
}

export function GitHubSection(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const connection = user?.github ?? null;
  const connect = useConnectGithub();
  const disconnect = useDisconnectGithub();
  const [searchParams] = useSearchParams();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const oauthStatus = searchParams.get("github");
  const oauthReason = searchParams.get("reason");

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>
          Connect a GitHub account to import repositories and run scans.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {oauthStatus === "connected" ? (
          <Alert variant="success">GitHub account connected.</Alert>
        ) : null}
        {oauthStatus === "error" ? (
          <Alert variant="destructive">
            {oauthReason ?? "GitHub connection failed."}
          </Alert>
        ) : null}
        {connect.error ? (
          <Alert variant="destructive">{getErrorMessage(connect.error)}</Alert>
        ) : null}

        {connection ? (
          <ConnectedGitHubAccount
            connection={connection}
            onDisconnect={() => setIsConfirmOpen(true)}
          />
        ) : (
          <Button
            variant="outline"
            onClick={() => connect.mutate()}
            isLoading={connect.isPending}
          >
            <SiGithub aria-hidden="true" />
            Connect GitHub
          </Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Disconnect GitHub"
        description="Your GitHub account will be disconnected from CodeSense."
        confirmLabel="Disconnect"
        destructive
        isConfirming={disconnect.isPending}
        error={disconnect.error ? getErrorMessage(disconnect.error) : null}
        onConfirm={() => {
          disconnect.mutate(undefined, {
            onSuccess: () => setIsConfirmOpen(false)
          });
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </Card>
  );
}
