import { FolderGit2, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface QuickActionsProps {
  onConnect: () => void;
  onViewRepositories: () => void;
  onStartScan: () => void;
  canStartScan: boolean;
}

export function QuickActions({
  onConnect,
  onViewRepositories,
  onStartScan,
  canStartScan
}: QuickActionsProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline" className="justify-start" onClick={onConnect}>
          <Plus aria-hidden="true" />
          Connect repository
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={onViewRepositories}
        >
          <FolderGit2 aria-hidden="true" />
          View repositories
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={onStartScan}
          disabled={!canStartScan}
        >
          <Play aria-hidden="true" />
          Start a scan
        </Button>
      </CardContent>
    </Card>
  );
}
