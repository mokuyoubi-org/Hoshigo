import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { supabase } from "@/src/stable/services/supabase/supabase";

export function useCountryUpdate() {
  const { updateProfile } = useProfile();

  const updateCountry = async (selectedCountry: string) => {
    try {
      const { error } = await supabase.rpc("update_country", {
        new_country: selectedCountry,
      });
      if (error) {
        console.error(error);
      } else {
        updateProfile({ country: selectedCountry });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return { updateCountry };
}
