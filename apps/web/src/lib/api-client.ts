import type { ApiErrorResponse, ApiSuccess } from "@codesense/shared";
import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosInstance
} from "axios";

import { tokenStorage } from "./token-storage";

export const UNAUTHORIZED_EVENT = "codesense:unauthorized";

const DEFAULT_BASE_URL = "http://localhost:5000/api/v1";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;

export interface ApiClientErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, options: ApiClientErrorOptions = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.details = options.details;
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;
      const url = error.config?.url ?? "";
      const isAuthEndpoint = url.includes("/auth/");

      if (status === 401 && !isAuthEndpoint) {
        tokenStorage.clear();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }
      }

      if (data && typeof data === "object" && data.success === false) {
        return Promise.reject(
          new ApiClientError(data.error.message, {
            status,
            code: data.error.code,
            details: data.error.details
          })
        );
      }

      return Promise.reject(
        new ApiClientError(`Request failed with status ${status}`, {
          status,
          code: "HTTP_ERROR"
        })
      );
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiClientError("The request timed out. Please try again.", {
          code: "TIMEOUT_ERROR"
        })
      );
    }

    return Promise.reject(
      new ApiClientError(
        "Unable to reach the CodeSense API. Check your connection and try again.",
        { code: "NETWORK_ERROR" }
      )
    );
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiSuccess<T>>(config);
  return response.data.data;
}

export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, url, method: "GET" });
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, url, method: "POST", data });
  },
  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return request<T>({ ...config, url, method: "PATCH", data });
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, url, method: "DELETE" });
  }
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
