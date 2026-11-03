import {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiClientError,
  UNAUTHORIZED_EVENT,
  apiClient,
  getErrorMessage
} from "@/lib/api-client";
import { tokenStorage } from "@/lib/token-storage";

type Adapter = NonNullable<AxiosRequestConfig["adapter"]>;

function errorBody(code: string, message: string): unknown {
  return { success: false, error: { code, message } };
}

function failingAdapter(status: number, data: unknown): Adapter {
  return async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config
    };

    throw new AxiosError(
      `Request failed with status code ${status}`,
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response
    );
  };
}

function successAdapter(status: number, data: unknown): Adapter {
  return async (config: InternalAxiosRequestConfig) => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config
  });
}

describe("api client", () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  afterEach(() => {
    tokenStorage.clear();
  });

  it("unwraps the successful response envelope", async () => {
    const data = await apiClient.get<{ id: string }[]>("/repositories", {
      adapter: successAdapter(200, {
        success: true,
        data: [{ id: "1" }],
        message: "Repositories retrieved"
      })
    });

    expect(data).toEqual([{ id: "1" }]);
  });

  it("normalizes backend error responses into ApiClientError", async () => {
    const error = await apiClient
      .post(
        "/repositories",
        {},
        {
          adapter: failingAdapter(
            422,
            errorBody("VALIDATION_ERROR", "Invalid request")
          )
        }
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    const apiError = error as ApiClientError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe("VALIDATION_ERROR");
    expect(apiError.message).toBe("Invalid request");
  });

  it("clears the session and emits an event on unauthorized responses", async () => {
    tokenStorage.set("signed.jwt.token");
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await apiClient
      .get("/repositories", {
        adapter: failingAdapter(
          401,
          errorBody("AUTH_REQUIRED", "Authentication required")
        )
      })
      .catch(() => undefined);

    expect(tokenStorage.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("keeps the session on 401 responses from auth endpoints", async () => {
    tokenStorage.set("signed.jwt.token");

    await apiClient
      .post(
        "/auth/login",
        { email: "ada@example.com", password: "wrong" },
        {
          adapter: failingAdapter(
            401,
            errorBody("INVALID_CREDENTIALS", "Invalid email or password")
          )
        }
      )
      .catch(() => undefined);

    expect(tokenStorage.get()).toBe("signed.jwt.token");
  });

  it("maps network failures to a readable error", async () => {
    const error = await apiClient
      .get("/repositories", {
        adapter: (async () => {
          throw new AxiosError("Network Error", "ERR_NETWORK");
        }) as Adapter
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).code).toBe("NETWORK_ERROR");
    expect(getErrorMessage(error)).toMatch(/unable to reach/i);
  });
});
