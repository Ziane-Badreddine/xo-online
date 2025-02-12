'use client';
import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import { Suspense, useEffect, useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MoveRight } from 'lucide-react';
import { Game } from '@prisma/client';
import { v4 as uuidv4 } from "uuid"; // Importer uuid
import { toast } from 'sonner';
import React from 'react';
import { useTheme } from 'next-themes';

interface SymbolPosition {
  top: string;
  left: string;
}



export default function HomePage() {

  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false)
  const { setTheme } = useTheme();

  const inputGame = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTheme("dark");


    const createUserIfNotExists = async () => {
      if (!user) return;

      const { id, username, imageUrl } = user;
      console.log(id, username, imageUrl, user?.emailAddresses[0]?.emailAddress);

      try {
        // Appel à l'API pour créer un utilisateur si nécessaire
        const { data, error } = await supabase.from("User").insert([
          {
            id,
            username,
            email: user?.emailAddresses[0]?.emailAddress,
            avatarUrl: imageUrl,
          }
        ])
        if (error) {
          console.log('Erreur lors de la création de l\'utilisateur', error);
        }


        if (data) {
          console.log('Utilisateur créé ou trouvé :', data);
        }

      } catch (error) {
        console.error('Erreur lors de l\'appel API :', error);
      }
    };
    createUserIfNotExists();


  }, [user]);

  const AnimatedSymbols = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    // Génération aléatoire uniquement côté client
    const generateSymbolPositions = () =>
      Array.from({ length: 15 }, () => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`
      }));

    return (
      <div className="absolute inset-0 z-0">
        {generateSymbolPositions().map((pos, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={symbolVariants}
            initial="hidden"
            animate="visible"
            className="absolute text-4xl text-blue-400/20"
            style={pos}
          >
            {i % 2 === 0 ? '✕' : '○'}
          </motion.div>
        ))}
      </div>
    );
  };
  const symbolVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (i: number) => ({
      opacity: 0.3,
      scale: 1,
      rotate: [0, 360],
      transition: {
        duration: 10 + Math.random() * 10,
        repeat: Infinity,
        delay: i * 0.5
      }
    })
  };

  const generateSymbolPositions = (count: number): SymbolPosition[] => {
    return Array.from({ length: count }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`
    }));
  };


  const handleCreate = async () => {
    try {
      setIsLoading(true);

      // Check for an existing game with status WAITING
      const { data: waitGame, error: waitGameError } = await supabase
        .from("Game")
        .select("*")
        .eq("status", "WAITING")
        .maybeSingle();

      if (waitGameError) {
        console.error("Erreur lors de la recherche du jeu :", waitGameError);
        return;
      }

      if (waitGame) {
        await supabase.from("Game").update({
          player2Id: user?.id,
          status: "IN_PROGRESS"
        }).eq("id",waitGame.id).neq("player1Id",user?.id)
        router.push("/game/" + waitGame.id);
        return;
      }

      // Create a new game if no waiting game exists
      const newGameId = uuidv4();
      const { data, error } = await supabase
        .from("Game")
        .insert([
          {
            id: newGameId,
            player1Id: user?.id,
            currentTurn: user?.id,
            status: "WAITING", // Ensure status is set
            updatedAt: new Date().toISOString(),
          },
        ])
        .select("id")
        .single(); // Expect a single row back

      if (error) {
        console.error("Erreur lors de la création du jeu :", error);
        return;
      }

      if (data) {
        router.push("/game/" + data.id);
      }
    } catch (error) {
      console.error("Erreur inattendue :", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameLink = async () => {
    const gameId = inputGame.current?.value.trim()

    if (inputGame.current) {
      try {
        setIsLoading(true)
        const { data: existGame } = await supabase
        .from("Game")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();
      if(!existGame){
          toast.warning("gameId not found or something be wrong")
            inputGame.current.value = " ";
          
      }else{
        const {data} = await supabase.from("Game").update({
          player2Id: user?.id,
          status: "IN_PROGRESS"
        }).eq("id",gameId)
        router.push("/game/"+gameId);

      }
      
        
      } catch (error) {
        toast.warning("something be wrong")
      }finally{
        setIsLoading(false)
      }
    }

  }




  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <AnimatedSymbols />


      <nav className="relative z-10 bg-gray-800/80 backdrop-blur-sm p-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-400">
          XO-Online
        </Link>

        <div className="flex gap-4 items-center">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button className=" px-4 py-2 rounded-lg transition-colors">
                Connexion
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant={"outline"} className="border  hover:bg-blue-400/10 px-4 py-2 rounded-lg transition-colors">
                Inscription
              </Button>
            </SignUpButton>
          </SignedOut>

        </div>
      </nav>

      {/* Contenu principal */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Bienvenue sur XO-Online
          </h1>

          <div className="grid gap-8 md:grid-cols-2">
            <section className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Top Players</h2>
              <Suspense fallback={<LoadingSkeleton />}>
                <Leaderboard />
              </Suspense>
            </section>

            <div className="space-y-6">
              <SignedIn>
                <div className='flex items-center justify-center gap-2'>
                  <Input ref={inputGame} placeholder='gameId...' className='w-[80%] h-12' />
                  <Button onClick={handleGameLink} size={"icon"} className='w-[20%] h-12'>
                    {isLoading ? <Loader2 className='w-7 h-7 animate-spin' /> : <MoveRight className='w-7 h-7 animate-pulse' />  }
                    
                  </Button>
                </div>

                <Button
                  className=" w-full h-16 text-lg"
                  onClick={handleCreate}
                >
                  {isLoading && <Loader2 className='w-7 h-7 animate-spin' />}
                  Nouvelle Partie

                </Button>
              </SignedIn>
              <Link href={"/game"}>
                <Button
                  className=" w-full h-16 mt-4 text-lg"
                >
                  Play offline
                </Button>
              </Link>

              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Règles du jeu</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• 3 symboles alignés pour gagner</li>
                  <li>• Parties en temps réel</li>
                  <li>• Classement ELO</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-700/50 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}