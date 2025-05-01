import * as React from "react"

// Adjusted breakpoint to ensure sidebar hides correctly on medium screens (Tailwind's 'md' is 768px)
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false); // Default to false initially

  React.useEffect(() => {
    // Check on mount (client-side only)
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkDevice();

    // Listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup listener
    return () => window.removeEventListener("resize", checkDevice);
  }, []); // Empty dependency array ensures this runs only on the client on mount/unmount

  return isMobile; // Return the state
}
