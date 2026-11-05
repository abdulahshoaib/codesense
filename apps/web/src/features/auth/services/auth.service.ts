import type {
  AuthResponse,
  LoginInput,
  PublicUser,
  RegisterInput
} from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const authService = {
  login(input: LoginInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/login", input);
  },

  register(input: RegisterInput): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/register", input);
  },

  me(): Promise<PublicUser> {
    return apiClient.get<PublicUser>("/auth/me");
  }
};
