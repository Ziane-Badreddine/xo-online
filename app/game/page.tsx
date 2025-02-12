"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const winner = calculateWinner(board);
  const winningCells = winner ? getWinningCells(board) : [];

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center p-4 w-[70%] h-[70%] mx-auto mt-10"
    >
      <h1 className="text-5xl mb-6 italic text-primary animate-pulse">Tic-Tac-Toe</h1>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <motion.button
            key={index}
            className="w-28 h-28 text-7xl font-mono text-primary font-bold border border-gray-500 flex items-center justify-center"
            onClick={() => handleClick(index)}
            whileTap={{ scale: 0.8 }}
            animate={winningCells.includes(index) ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            {cell}
          </motion.button>
        ))}
      </div>
      {winner ? (
        <motion.p 
          className="mt-4 text-2xl text-primary font-semibold" 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          Gagnant: {winner}
        </motion.p>
      ) : (
        <p className="mt-4 text-primary text-2xl">Joueur : {isXNext ? "X" : "O"}</p>
      )}
      <motion.button
        onClick={resetGame}
        className="mt-5 px-4 py-2  bg-primary text-white rounded"
        whileHover={{ scale: 1.1 }}
      >
        Réinitialiser
      </motion.button>
    </motion.div>
  );
};

const calculateWinner = (board: Array<string | null>) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.includes(null) ? null : "Égalité";
};

const getWinningCells = (board: Array<string | null>) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a, b, c];
    }
  }
  return [];
};

export default TicTacToe;
