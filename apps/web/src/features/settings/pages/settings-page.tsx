import { PageHeader } from "@/components/layout/page-header";
import { AccountSection } from "@/features/settings/components/account-section";
import { AppearanceSection } from "@/features/settings/components/appearance-section";
import { ProfileSection } from "@/features/settings/components/profile-section";

export function SettingsPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and account."
      />

      <div className="flex max-w-3xl flex-col gap-6">
        <ProfileSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </div>
  );
}
