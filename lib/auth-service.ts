"use client";

interface TokenRefreshConfig {
  refreshThresholdMinutes?: number; // Refresh token when it expires in X minutes
  checkIntervalMinutes?: number; // Check token expiry every X minutes
  maxRetries?: number; // Maximum refresh attempts
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private config: Required<TokenRefreshConfig>;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastActivityCheck = 0;

  constructor(config: TokenRefreshConfig = {}) {
    this.config = {
      refreshThresholdMinutes: config.refreshThresholdMinutes ?? 60, // Refresh 1 hour before expiry
      checkIntervalMinutes: config.checkIntervalMinutes ?? 10, // Check every 10 minutes
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Start the automatic token refresh service
   */
  start() {
    if (typeof window === "undefined") return;

    this.stop(); // Clear any existing timer
    this.checkAndRefreshToken(); // Check immediately

    // Set up periodic checks
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.config.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop the automatic token refresh service
   */
  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<boolean> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return false;
      }

      if (!this.shouldRefreshToken(token)) {
        return true; // Token is still valid
      }

      return await this.refreshToken();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if token should be refreshed based on expiry time
   */
  private shouldRefreshToken(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      const refreshThreshold = this.config.refreshThresholdMinutes * 60 * 1000;

      return timeUntilExpiry <= refreshThreshold;
    } catch (error) {
      return true; // If we can't parse, assume it needs refresh
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<boolean> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return false;
      }

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Update localStorage with new token
          localStorage.setItem("token", data.token);

          // Update cookie
          document.cookie = `auth-token=${data.token}; path=/; max-age=${
            60 * 60 * 24 * 7
          }`;

          // Dispatch auth change event
          window.dispatchEvent(new Event("auth-change"));

          return true;
        }
      } else if (response.status === 401) {
        // Token is invalid, logout user
        this.logout();
        return false;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  /**
   * Logout user and clean up
   */
  private logout() {
    localStorage.removeItem("token");
    document.cookie =
      "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.dispatchEvent(new Event("auth-change"));

    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  /**
   * Manual token refresh for user activity - throttled to prevent excessive calls
   */
  async refreshOnActivity(): Promise<boolean> {
    const now = Date.now();
    // Throttle activity checks to once per minute
    if (now - this.lastActivityCheck < 60000) {
      return true;
    }

    this.lastActivityCheck = now;

    const token = localStorage.getItem("token");
    if (!token) return false;

    // Only refresh if token is close to expiry
    if (this.shouldRefreshToken(token)) {
      return await this.refreshToken();
    }

    return true;
  }

  /**
   * Get remaining time until token expires
   */
  getTokenTimeRemaining(): number | null {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      return Math.max(0, expiryTime - currentTime);
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for manual configuration if needed
export { AuthService };
export type { TokenRefreshConfig };
