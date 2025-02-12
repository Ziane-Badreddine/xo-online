"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import supabase from "@/lib/supabase";
import Chat from "./Chat";
import { User } from "@prisma/client";
import CopyInput from "./InputCopy";

const TicTacToe = ({ gameId }: { gameId: string }) => {
    const { user } = useUser();
    const [currentUser, setCurrentUser] = useState<User>()
    const [board, setBoard] = useState(Array(9).fill(null));
    const [player1Id, setPlayer1Id] = useState<string>()
    const [player2Id, setPlayer2Id] = useState<string>()
    const [currentTurn, setCurrentTurn] = useState<String | null | undefined>();
    const [winner, setWinner] = useState<string | null>(null);
    const [gameStatus, setGameStatus] = useState("WAITING");
    const winningCells = winner ? getWinningCells(board) : [];
    console.log(user?.id)

    useEffect(() => {
        const fetchGame = async () => {
            const { data } = await supabase.from("Game").select("*").eq("id", gameId).single();
            if (data) {
                setBoard(data.board);
                setCurrentTurn(data.currentTurn);
                setGameStatus(data.status);
                setWinner(data.winner);
                setPlayer1Id(data.player1Id);
                setPlayer2Id(data.player2Id)
            }
            const { data: currentUser } = await supabase.from("User").select("*").eq("id", user?.id).single()
            setCurrentUser(data)
        };
        fetchGame();

        const channel = supabase.channel("game-updates")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Game" }, fetchGame)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, user]);

    const handleCellClick = async (index: number) => {
        if (!user || board[index] || gameStatus !== "IN_PROGRESS" || currentTurn !== user.id) return;

        const newBoard = [...board];
        newBoard[index] = user.id === player1Id ? "X" : "O";
        setWinner(calculateWinner(board));
        const nextTurn = currentTurn === player1Id ? player2Id : player1Id;

        const { error } = await supabase.from("Game").update({
            board: newBoard,
            currentTurn: nextTurn,
            winner: winner
        }).eq("id", gameId);

        if (!error) {
            setBoard(newBoard);
            setCurrentTurn(nextTurn);
        }
    };

    const resetGame = async () => {
        const newBoard = Array(9).fill(null);
        await supabase.from("Game").update({
            board: newBoard,
            currentTurn: player1Id,
            status: "IN_PROGRESS",
            winner: null
        }).eq("id", gameId);
    };


    return (
        <div className="flex items-center justify-center w-screen h-screen">
            <Chat gameId={gameId}  />
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center p-4 w-[70%] h-[70%] mx-auto mt-10"
            >
                <h1>Tic-Tac-Toe Game</h1>
                      <CopyInput gameId={gameId} />
                      <p>{gameStatus}</p>
                <h1 className="text-5xl mb-6 italic text-primary animate-pulse">Tic-Tac-Toe</h1>
                <div className="grid grid-cols-3 gap-2">
                    {board.map((cell, index) => (
                        <motion.button
                            key={index}
                            className="w-28 h-28 text-7xl font-mono text-primary font-bold border border-gray-500 flex items-center justify-center"
                            onClick={() => handleCellClick(index)}
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
                        {winner && <h1>Gagnant: {winner}</h1>}
                    </motion.p>
                ) : (
                    <p className="mt-4 text-primary text-2xl">Joueur : {currentTurn === player1Id ? "X" : "O"}</p>
                )}
                <motion.button
                    onClick={resetGame}
                    className="mt-5 px-4 py-2 bg-primary text-white rounded"
                    whileHover={{ scale: 1.1 }}
                >
                    Réinitialiser
                </motion.button>
            </motion.div>


        </div>

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
