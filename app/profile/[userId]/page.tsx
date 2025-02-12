"use client";

import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label } from "recharts";
import supabase from "@/lib/supabase";
import { User } from "@prisma/client";
import React, { useEffect, useState } from "react";

// Configuration des valeurs maximales
const MAX_VALUES = {
  ELO: 10000,
  WINS: 100,
  LOSSES: 100
};

interface ChartData {
  name: string;
  value: number;
  fill: string;
  max: number;
}

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = React.use(params);
  const [userData, setUserData] = useState<User | null>(null);
  const [eloData, setEloData] = useState<ChartData[]>([]);
  const [winsData, setWinsData] = useState<ChartData[]>([]);
  const [lossesData, setLossesData] = useState<ChartData[]>([]);

  // Calcul dynamique de l'angle de fin
  const calculateEndAngle = (current: number, max: number) => {
    const percentage = (current / max) * 360;
    return Math.min(percentage, 360); // Ne pas dépasser 360 degrés
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
  
      // Add a mounted flag to prevent state updates after unmounting
      let isMounted = true;
  
      const { data: user, error: userError } = await supabase
        .from("User")
        .select("*")
        .eq("id", userId)
        .single();
  
      if (userError || !user) return;
      if (!isMounted) return;  // Prevent updates if the component is unmounted
      setUserData(user);
  
      setEloData([{
        name: "ELO",
        value: user.eloRating,
        fill: "#4f46e5",
        max: MAX_VALUES.ELO
      }]);
  
      setWinsData([{
        name: "Wins",
        value: user.wins,
        fill: "#10b981",
        max: MAX_VALUES.WINS
      }]);
  
      setLossesData([{
        name: "Losses",
        value: user.losses,
        fill: "#ef4444",
        max: MAX_VALUES.LOSSES
      }]);
  
      return () => {
        isMounted = false; // Cleanup when the component unmounts
      };
    };
  
    
  
    fetchData();
  
    const subscription = supabase
      .channel("realtime user")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "User" }, (payload) => {
        if (payload.new.id === userId) {
          fetchData();
        }
      })
      .subscribe();
  
    return () => {
      // Cleanup the subscription when the component unmounts
      supabase.removeChannel(subscription);
    };
  }, [userId]);
  
  if (!userData) return <div className="container mx-auto py-8"></div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src={userData.avatarUrl ?? ""} />
          <AvatarFallback>{userData.username[0]}</AvatarFallback>
        </Avatar>
        <h1 className="text-4xl font-bold">{userData.username}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Carte ELO */}
        <Card>
          <CardHeader>
            <CardTitle>ELO Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <RadialBarChart
              width={300}
              height={300}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={calculateEndAngle(eloData[0]?.value || 0, MAX_VALUES.ELO)}
              data={eloData}
            >
              <PolarGrid stroke="none" />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground flex justify-between items-center">
            <h1 className="text-lg">
              Current ELO Rating
            </h1>
            <p
              className="text-2xl font-bold"
            >
              {userData.eloRating}
              <span className="block text-sm font-normal text-muted-foreground">
                /{MAX_VALUES.ELO}
              </span>
            </p>
          </CardFooter>
        </Card>

        {/* Carte Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <RadialBarChart
              width={300}
              height={300}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={calculateEndAngle(winsData[0]?.value || 0, MAX_VALUES.WINS)}
              data={winsData}
            >
              <PolarGrid stroke="none" />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={10}
              />
              <Label
                position="center"
                content={() => (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    className="text-2xl font-bold"
                  >
                    {userData.wins}
                    <tspan className="block text-sm font-normal text-muted-foreground">
                      /{MAX_VALUES.WINS}
                    </tspan>
                  </text>
                )}
              />
            </RadialBarChart>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground flex justify-between items-center">
            <h1 className="text-lg">
              Total Wins
            </h1>
            <p
              className="text-2xl font-bold"
            >
              {userData.wins}
              <span className="block text-sm font-normal text-muted-foreground">
                /{MAX_VALUES.WINS}
              </span>
            </p>
          </CardFooter>
        </Card>

        {/* Carte Losses */}
        <Card>
          <CardHeader>
            <CardTitle>Losses</CardTitle>
          </CardHeader>
          <CardContent>
            <RadialBarChart
              width={300}
              height={300}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={calculateEndAngle(lossesData[0]?.value || 0, MAX_VALUES.LOSSES)}
              data={lossesData}
            >
              <PolarGrid stroke="none" />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={10}
              />
              <Label
                position="center"
                content={() => (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    className="text-2xl font-bold"
                  >
                    {userData.losses}
                    <tspan className="block text-sm font-normal text-muted-foreground">
                      /{MAX_VALUES.LOSSES}
                    </tspan>
                  </text>
                )}
              />
            </RadialBarChart>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground flex justify-between items-center">
            <h1 className="text-lg">
              Total Losses
            </h1>
            <p
              className="text-2xl font-bold"
            >
              {userData.losses}
              <span className="block text-sm font-normal text-muted-foreground">
                /{MAX_VALUES.LOSSES}
              </span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}