// google-auth.tsx
import { router } from "expo-router";
import { useEffect } from "react";

export default function GoogleAuthRedirect() {
  useEffect(() => {
    router.replace("/Home");
  }, []);

  return null;
}
