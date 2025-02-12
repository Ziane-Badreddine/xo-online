'use client';
import supabase from '@/lib/supabase';
import { User } from '@prisma/client';
import axios from 'axios';
// app/components/Leaderboard.client.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';



export default function Leaderboard() {


  const [players, setPlayers] = useState<User[]>([]);

  useEffect(() => {
    // Initial fetch with error handling
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase.from<'User',User>('User').select('*').order("eloRating",{ascending: false});
        
        if (error) throw new Error(error.message);
        
        setPlayers(data || []); // Ensure data is not null
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchInitialData();

    // Real-time subscription with proper typing
    const channel = supabase
      .channel('realtime-users')
      .on<User>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'User',
        },
        (payload) => {
          setPlayers(currentPlayers => {
            // Handle different event types
            switch (payload.eventType) {
              case 'INSERT':
                return [...currentPlayers, payload.new]
                  .sort((a, b) => b.eloRating - a.eloRating);

              case 'UPDATE':
                return currentPlayers.map(player =>
                  player.id === payload.new.id ? payload.new : player
                ).sort((a, b) => b.eloRating - a.eloRating);

              case 'DELETE':
                return currentPlayers.filter(
                  player => player.id !== payload.old.id
                );

              default:
                return currentPlayers;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  return (
    <div className="space-y-3">
      {players.map((player, index) => (
        <Link href={`/profile/${player.id}`} key={index}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <img src={player.avatarUrl ?? ""} alt="@user" className='rounded-full w-10 h-10' />
              <span className="text-blue-400 font-bold w-6">#{index + 1}</span>
              <span className="font-medium">{player.username || 'Anonymous'}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">🏆 {player.wins}</span>
              <span className="text-blue-400">⭐ {player.eloRating}</span>
            </div>
          </motion.div>
        </Link>

      ))}
    </div>
  );
}