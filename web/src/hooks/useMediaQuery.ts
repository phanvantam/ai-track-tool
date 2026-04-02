import { useEffect, useState } from "react";

/**
 * Hook để detect media query breakpoints.
 * Sử dụng window.matchMedia để track responsive state.
 * 
 * ⚠️ SSR Safe: Initializes with false, updates after mount.
 *
 * @param query - Media query string (e.g., "(min-width: 1024px)")
 * @returns boolean - true nếu media query match, false nếu không
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Chỉ chạy trên client sau mount
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    // Lắng nghe thay đổi
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  // Không return cho đến khi mounted để tránh hydration mismatch
  return mounted ? matches : false;
}

/**
 * Utility functions để kiểm tra breakpoints.
 */
export const breakpoints = {
  isMobile: () => useMediaQuery("(max-width: 639px)"),
  isTablet: () => useMediaQuery("(min-width: 640px) and (max-width: 1023px)"),
  isDesktop: () => useMediaQuery("(min-width: 1024px)"),
  isSmallScreen: () => useMediaQuery("(max-width: 1023px)"),
};
