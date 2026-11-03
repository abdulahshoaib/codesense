const TOKEN_KEY = "codesense.token";

/**
 * Access-token storage.
 *
 * Security trade-off (documented per task requirements):
 * The backend issues stateless JWT access tokens through the response body, so
 * the browser has to hold the token somewhere. The token is kept in memory for
 * the active tab and mirrored to `sessionStorage` so a refresh does not force a
 * re-login. `sessionStorage` is readable by any script running on the page, so
 * an XSS vulnerability would expose it. This is acceptable for the initial
 * implementation but should be replaced by an httpOnly, SameSite cookie flow
 * (or a short-lived refresh-token exchange) once the backend supports it.
 */
let inMemoryToken: string | null = null;

export const tokenStorage = {
  get(): string | null {
    if (inMemoryToken !== null) {
      return inMemoryToken;
    }

    try {
      return window.sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set(token: string): void {
    inMemoryToken = token;

    try {
      window.sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable — keep the in-memory copy only */
    }
  },

  clear(): void {
    inMemoryToken = null;

    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },

  has(): boolean {
    return tokenStorage.get() !== null;
  }
};
