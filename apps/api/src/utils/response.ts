import type { ApiSuccess } from "@codesense/shared";

export function successResponse<T>(
  data: T,
  message = "Operation successful"
): ApiSuccess<T> {
  return { success: true, data, message };
}
