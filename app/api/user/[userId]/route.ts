import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(requst: NextRequest, props: { params: Promise<{ userId: string }> }) {
    const params = await props.params;
    const { userId: id } = await auth();
    if (!id) {
        return NextResponse.json('Unauthorized', { status: 401 });
    }
    const { userId } = params;

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    })
    if(!user) {
        return NextResponse.json("User not found" , { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });

}