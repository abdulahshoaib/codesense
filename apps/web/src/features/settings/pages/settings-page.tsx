import { PageHeader } from "@/components/layout/page-header";
import { AccountSection } from "@/features/settings/components/account-section";
import { AiModelSection } from "@/features/settings/components/ai-model-section";
import { AppearanceSection } from "@/features/settings/components/appearance-section";
import { GitHubSection } from "@/features/settings/components/github-section";
import { McpAccessSection } from "@/features/settings/components/mcp-access-section";
import { ProfileSection } from "@/features/settings/components/profile-section";

export function SettingsPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, connected accounts, MCP access, appearance, and session."
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProfileSection />
          <GitHubSection />
          <McpAccessSection />
          <AiModelSection />
        </div>

        <div className="flex flex-col gap-6">
          <AppearanceSection />
          <AccountSection />
        </div>
      </div>
    </div>
  );
}
