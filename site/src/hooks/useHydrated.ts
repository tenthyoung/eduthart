"use client";

import { useEffect, useState } from "react";

/**
 * True once React has hydrated on the client. Submit buttons should stay
 * disabled until then: before hydration the form has no onSubmit handler, so
 * pressing Enter or the button triggers a native submission that reloads the
 * page, silently clearing every field.
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
