'use client'

import CopyInput from '@/components/InputCopy'
import TicTacToeOnline from '@/components/TicTacToeOnline'
import supabase from '@/lib/supabase'
import React, { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

const page = ({ params }: { params: Promise<{ gameId: string }> }) => {

  const [status, setStatus] = useState<string>('');
  const [gameData,setGameData] = useState<any>()
  const { gameId } = use(params);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: gameData } = await supabase
          .from("Game")
          .select("*")
          .eq("id", gameId)
          .single();
        setGameData(gameData)

      } catch (error) {
        toast.warning("Something went wrong while fetching the game data.");
      }
    }

    fetchData();

    const channelGame = supabase.channel("chages-game")
      .on("postgres_changes", { event: "*", schema: "public", table: "Game" }, (payload) => fetchData());

    return () => {
      channelGame.unsubscribe();  // Cleanup on unmount
    }
  }, [gameId]);



  return (
    <div>
      

      <div className="board">
        <TicTacToeOnline gameId={gameId}  />
      </div>
    </div>
  );
};

export default page;
