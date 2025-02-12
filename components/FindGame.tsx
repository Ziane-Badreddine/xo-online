"use client";

import { useState } from "react";
import supabase from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function FindGame() {
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const findMatch = async () => {
    setSearching(true);

    const { data: queueData } = await supabase
      .from("queue")
      .select("gameId")
      .eq("userId", "CURRENT_USER_ID") // Remplace par l'ID réel du user
      .maybeSingle();

    if (queueData?.gameId) {
      router.push(`/game/${queueData.gameId}`);
      return;
    }

    const { data: match, error } = await supabase.rpc("find_match", { user_id: "CURRENT_USER_ID" });

    if (error) {
      console.error("Erreur de matchmaking:", error);
      setSearching(false);
      return;
    }

    if (match?.gameId) {
      router.push(`/game/${match.gameId}`);
    }
  };

  return (
    <div className="flex justify-center">
      <Button onClick={findMatch} disabled={searching}>
        {searching ? "Recherche en cours..." : "Rechercher une partie"}
      </Button>
    </div>
  );
}
