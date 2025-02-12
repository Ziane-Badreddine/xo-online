'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabase from '@/lib/supabase';
import { User } from '@prisma/client';
import { v4 as uuidv4 } from "uuid"; // Import uuid
import { useUser } from '@clerk/nextjs';

interface ChatProps {
  gameId: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  senderId: string;
  sender?: {
    username?: string | null;
    avatarUrl?: string | null;
  };
}

export default function Chat({ gameId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const {user} = useUser();

  useEffect(() => {
    const fetchInitialMessages = async () => {
      const { data, error } = await supabase
        .from('ChatMessage')
        .select('*')
        .eq('gameId', gameId) // Make sure to use gameId here
        .order('createdAt', { ascending: true });

      if (data) {
        setMessages(data);
        console.log(data,gameId)
      }
    };

    const channel = supabase
      .channel(`realtime-chat-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ChatMessage',
          filter: `gameId=eq.${gameId}` // Use gameId here
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('User')
            .select('username, avatarUrl')
            .eq('id', payload.new.senderId)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              ...payload.new,
              sender: senderData
            } as Message
          ]);
        }
      )
      .subscribe();

    fetchInitialMessages();
    return () => {
      channel.unsubscribe();
    };
  }, [gameId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const newMessageId = uuidv4();
    try {
      const { error } = await supabase.from('ChatMessage').insert([{
        id: newMessageId,  // Ensure UUID is generated correctly
        content: newMessage,
        gameId: gameId,  // Use gameId
        senderId: user?.id
      }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-xl p-4">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-24 lg:max-w-md p-3 rounded-xl ${
                message.senderId === user?.id
                  ? 'bg-blue-600 ml-4'
                  : 'bg-gray-700 mr-4'
              }`}
            >
              <p className="text-sm break-words">{message.content}</p>
              <p>{message.created_at}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1  bg-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSending}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          disabled={isSending || !newMessage.trim()}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
