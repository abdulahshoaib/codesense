import { SiGithub } from "@icons-pack/react-simple-icons";
import { ExternalLink, Unplug } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const GITHUB_APPLICATIONS_URL = "https://github.com/settings/applications";

export interface GitHubConnection {
  login: string;
  name: string;
}

export interface GitHubSectionProps {
  connection?: GitHubConnection | null;
  onDisconnect?: () => void;
}

export function GitHubSection({
  connection,
  onDisconnect
}: GitHubSectionProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>
          Connect a GitHub account to import repositories and run scans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connection ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={connection.name || connection.login} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {connection.name || connection.login}
                </span>
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
        ) : (
          <a
            href={GITHUB_APPLICATIONS_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <SiGithub aria-hidden="true" />
            Connect GitHub
            <ExternalLink aria-hidden="true" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
