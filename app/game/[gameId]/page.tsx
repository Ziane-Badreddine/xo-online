'use client';

import TicTacToeOnline from '@/components/TicTacToeOnline';
import supabase from '@/lib/supabase';
import React, { useEffect, useState, useRef, use } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

const GAME_TIMEOUT_SECONDS = 60; // 1 minute timeout in seconds

const Page = ({ params }: { params: Promise<{ gameId: string }> }) => {
  const [status, setStatus] = useState<string>('WAITING'); // Default to 'WAITING'
  const [timeRemaining, setTimeRemaining] = useState(GAME_TIMEOUT_SECONDS); // Time in seconds
  const [gameData, setGameData] = useState<any>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const router = useRouter()

  const { gameId } = use(params); // Use `useParams` if necessary
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch and subscribe to game data via Supabase Realtime
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: gameData } = await supabase
          .from('Game')
          .select('*')
          .eq('id', gameId)
          .single();

        setGameData(gameData);
        setStatus(gameData.status);
        setTimeRemaining(GAME_TIMEOUT_SECONDS); // Reset the timer when new game data is fetched
      } catch (error) {
        toast.warning('Something went wrong while fetching the game data.');
      }
    }

    fetchData();

    const channel = supabase
      .channel('changes-game')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Game', filter: `id=eq.${gameId}` },
        (payload) => {
          // Whenever the game data is updated, we will fetch the latest game data
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe(); // Unsubscribe from the channel on cleanup
    };
  }, [gameId]);

  // Game timeout mechanism
  useEffect(() => {
    const startTimer = () => {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleGameTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleGameTimeout = async () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      try {
        await supabase
          .from('Game')
          .update({ status: 'FINISHED' })
          .eq('id', gameId);

        setIsTimeout(true);
        toast.warning('Game finished due to inactivity!');
      } catch (error) {
        toast.error('Failed to update game status');
      }
    };

    if (status === 'IN_PROGRESS') {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameId, status]);

  // Format time remaining in seconds
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Calculate progress percentage
  const progressPercentage =
    ((GAME_TIMEOUT_SECONDS - timeRemaining) / GAME_TIMEOUT_SECONDS) * 100;

  return (
    <div className="relative">
      {/* Time Remaining Display */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Time Remaining:</span>
          <span className="text-lg font-bold">{formatTime(timeRemaining)}</span>
        </div>
        <Progress value={progressPercentage} className="w-full mt-2" />
      </div>

      <div className="board">
        <TicTacToeOnline gameId={gameId} />
      </div>

      {/* Timeout or Game Finished Notification */}
      {isTimeout && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-700 opacity-75 flex justify-center items-center z-20">
          <div className="text-white p-4 bg-gray-900 rounded-lg">
            <h2 className="text-xl">Game Timed Out!</h2>
            <p>The game has been automatically ended due to inactivity.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
