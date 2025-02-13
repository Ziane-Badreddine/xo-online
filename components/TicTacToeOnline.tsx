"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import supabase from "@/lib/supabase";
import Chat from "./Chat";
import { User } from "@prisma/client";
import CopyInput from "./InputCopy";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/router";
import { toast } from "sonner";

const TicTacToe = ({ gameId }: { gameId: string }) => {



    const { user } = useUser();
    const [currentUser, setCurrentUser] = useState<User>()
    const [board, setBoard] = useState(Array(9).fill(null));
    const [player1Id, setPlayer1Id] = useState<string>()
    const [player2Id, setPlayer2Id] = useState<string>()
    const [player, setPlayer] = useState<User>()
    const [currentTurn, setCurrentTurn] = useState<String | null | undefined>();
    const [winner, setWinner] = useState<string | null>(null);
    const [gameStatus, setGameStatus] = useState("WAITING");
    const [result, setResult] = useState({ x: 0, o: 0 })
    const winningCells = winner ? getWinningCells(board) : [];

    const isWinnerHandled = useRef(false);

    useEffect(() => {
        const handleBeforeUnload = async (event: BeforeUnloadEvent) => {

      
          // Update game status to "FINISHED"
          try {
            await supabase
              .from('Game')
              .update({ status: 'FINISHED' })
              .eq('id', gameId);
            toast.warning('Game finished due to page refresh or close.');
          } catch (error) {
            toast.error('Failed to update game status');
          }
        };
      

      
        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
      
        // Cleanup event listeners
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };
      }, []);


    useEffect(() => {

        const handleClose = async () => {
            await supabase.from("Game").update({
                status: "FINISHED"
            }).eq("id",gameId)
        }


        return () => {
            if(isWinnerHandled.current){
                handleClose()

            }
            

        };
    }, []);








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

        };
        fetchGame();



        const channel = supabase.channel("game-updates")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Game" }, fetchGame)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameId, user]);

    useEffect(() => {
        async function fetchUsers() {
            if (user) {
                console.log(user.id, player1Id, player2Id, user.id === player1Id ? player1Id : player2Id)
                const { data: currentUser } = await supabase.from("User").select("*").eq("id", user?.id).single()
                setCurrentUser(currentUser)
                const { data: playerData } = await supabase.from("User").select("*").eq("id", user?.id === player1Id ? player2Id : player1Id).single()
                setPlayer(playerData)
            }

        }
        fetchUsers();

    }, [gameId, player1Id, player2Id]);

    useEffect(() => {
        if (winner && !isWinnerHandled.current) {
            handleWinner(winner);
            isWinnerHandled.current = true; // Mark as handled
        }
    }, [winner]);

    async function handleWinner(winner: string | null) {
        if (!winner) return;

        try {
            if (winner === 'X' && gameStatus !== "FINISHED") {
                // Update local state
                setResult((prev) => ({ x: prev.x + 1, o: prev.o }));
                console.log(player1Id, player2Id);

                // Update database: Player 1 (X) wins, Player 2 (O) loses
                await supabase.rpc("update_game_result", { userid: player1Id, result: "win", elo_change: 10 });
                await supabase.rpc("update_game_result", { userid: player2Id, result: "loss", elo_change: 10 });
            } else if (winner === 'O') {
                // Update local state
                setResult((prev) => ({ x: prev.x, o: prev.o + 1 }));

                // Update database: Player 2 (O) wins, Player 1 (X) loses
                await supabase.rpc("update_game_result", { userid: player2Id, result: "win", elo_change: 10 });
                await supabase.rpc("update_game_result", { userid: player1Id, result: "loss", elo_change: 10 });
            } else if (winner === 'Égalité') {
                // Update local state
                setResult((prev) => ({ x: prev.x + 1, o: prev.o + 1 }));

                // Update database: Draw for both players
                await supabase.rpc("update_game_result", { userid: player1Id, result: "draw", elo_change: 5 });
                await supabase.rpc("update_game_result", { userid: player2Id, result: "draw", elo_change: 5 });
            }
        } catch (error) {
            console.error("Error updating game result:", error);
        }
    }


    const handleCellClick = async (index: number) => {
        if (!user) {
            console.error("connextion");
        }
        if (board[index] || gameStatus !== "IN_PROGRESS" || currentTurn !== user?.id) {
            return;
        }

        const newBoard = [...board];
        newBoard[index] = user?.id === player1Id ? "X" : "O";

        const newWinner = calculateWinner(newBoard); // Calcul après mise à jour


        const nextTurn = currentTurn === player1Id ? player2Id : player1Id;

        const { error } = await supabase.from("Game").update({
            board: newBoard,
            currentTurn: newWinner ? null : nextTurn, // Arrête le jeu si gagnant
            winner: newWinner
        }).eq("id", gameId);

        if (!error) {
            setBoard(newBoard);
            setCurrentTurn(newWinner ? null : nextTurn);
            setWinner(newWinner);
        }
        handleWinner(winner)
    };

    const resetGame = async () => {
        const newBoard = Array(9).fill(null);
        await supabase.from("Game").update({
            board: newBoard,
            currentTurn: player1Id,
            status: "IN_PROGRESS",
            winner: null
        }).eq("id", gameId);
        isWinnerHandled.current = false;
    };


    return (
        <div className="flex items-center justify-center w-screen h-screen">
            <Chat gameId={gameId} gameStatus={gameStatus} />
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center gap-2 px-4 w-[70%] h-[70%] mx-auto "
            >
                <div className="flex items-center justify-between w-[50%] mb-5 ">
                    <div className="flex  items-center justify-center gap-10">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={user?.imageUrl} alt="@shadcn" />
                                <AvatarFallback>X</AvatarFallback>
                            </Avatar>
                            <p className="text-2xl text-primary/75">{user?.username}</p>
                        </div>
                        <div className="text-7xl mb-5">
                            {result.x}
                        </div>

                    </div>
                    <div>
                        <h1 className="text-7xl mb-5 text-primary">VS</h1>
                    </div>
                    <div className="flex items-center justify-center gap-10">
                        <div className="text-7xl mb-5">
                            {result.o}
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={player?.avatarUrl ?? 'O'} alt="@shadcn" />
                                <AvatarFallback>O</AvatarFallback>
                            </Avatar>
                            <p className="text-2xl text-primary/75">{player ? player.username : "O"}</p>
                        </div>


                    </div>
                </div>
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
                    <motion.div
                        className="mt-4 text-2xl text-primary font-semibold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {winner && <h1>Gagnant: {winner}</h1>}
                    </motion.div>
                ) : (
                    <p className="mt-4 text-primary text-2xl">Joueur : {currentTurn === player1Id ? "X" : "O"}</p>
                )}
                <motion.button
                    disabled= {!isWinnerHandled.current}
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
    return board.includes('') || board.includes(null) ? null : "Égalité";
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
