import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True while a Supabase session exists. Used to avoid firing authed
 *  server functions after sign-out (which throws "No authorization header"). */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return signedIn;
}
