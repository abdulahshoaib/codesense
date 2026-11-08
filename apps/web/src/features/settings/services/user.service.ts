import type { PublicUser, UpdateProfileInput } from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const userService = {
  updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    return apiClient.patch<PublicUser>("/users/me", input);
  }
};
