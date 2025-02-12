'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import supabase from '@/lib/supabase';

interface GameBoardProps {
  gameId: string;
  userId: string;
}

type BoardState = Array<'X' | 'O' | ''>;

export default function GameBoard({ gameId, userId }: GameBoardProps) {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(''));
  const [isYourTurn, setIsYourTurn] = useState<boolean>(false);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Game',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        const newBoard = payload.new.board as BoardState;
        setBoard(newBoard);
        setIsYourTurn(payload.new.current_turn === userId);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId, userId]);

  const handleMove = async (index: number) => {
    if (!isYourTurn || board[index]) return;

    const newBoard: BoardState = [...board];
    newBoard[index] = 'X';

    const { error } = await supabase
      .from('Game')
      .update({ board: newBoard, current_turn: null })
      .eq('id', gameId);

    if (!error) setIsYourTurn(false);
  };

  return (
    <div className="grid grid-cols-3 gap-2 w-96 h-96">
      {board.map((cell, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.05 }}
          className={`h-32 text-6xl rounded-lg ${!cell && isYourTurn ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50'}`}
          onClick={() => handleMove(index)}
          disabled={!isYourTurn || !!cell}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: cell ? 1 : 0 }}
            className={cell === 'X' ? 'text-blue-400' : 'text-red-400'}
          >
            {cell}
          </motion.span>
        </motion.button>
      ))}
    </div>
  );
}