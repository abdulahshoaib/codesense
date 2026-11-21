import { Link } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { GithubRepoPicker } from "@/features/repositories/components/github-repo-picker";
import { useAuthStore } from "@/stores/auth.store";

export function ConnectRepositoryPage(): React.ReactElement {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Connect repository"
        description="Import repositories from your connected GitHub account."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Import from GitHub</CardTitle>
          <CardDescription>
            Browse repositories on your connected GitHub account and connect them
            with one click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.github ? (
            <GithubRepoPicker />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account to import its repositories.
              </p>
              <div>
                <Link
                  to="/settings"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Connect GitHub
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
