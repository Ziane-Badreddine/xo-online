import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {

    const users = await prisma.user.findMany({
        select: {
            id:true,
            username: true,
            eloRating: true,
            wins: true,
            avatarUrl: true,
        },
        orderBy: { eloRating: 'desc' },
    })
    return NextResponse.json(users, { status: 200 });
}


export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json('Unauthorized', { status: 401 });
    }
    const userExists = await prisma.user.findUnique({
        where:{
            id: userId
        }
    })
    if(userExists){
        return NextResponse.json('User already exists', { status: 200 });
    }
    const body = await req.json();
    
    const user = await prisma.user.create({
        data: {
            ...body,
        }
    })

    

    if (!user) return new NextResponse('Bad Request', { status: 400 });

    return NextResponse.json(user, { status: 200 });
}
