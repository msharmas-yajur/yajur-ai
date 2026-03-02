import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("room");
    const username = req.nextUrl.searchParams.get("username");

    if (!room || !username) {
        return NextResponse.json(
            { error: "Missing room or username" },
            { status: 400 }
        );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
    });

    // roomAgentDispatch in the token automatically dispatches yajur-agent
    // when the browser connects — no separate API call needed
    // (roomAgentDispatch not yet in SDK types, cast to any)
    at.addGrant({
        roomJoin: true,
        room: room,
        roomAgentDispatch: [{ agentName: "yajur-agent" }],
    } as any);

    const response = NextResponse.json({ accessToken: await at.toJwt(), wsUrl });
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
}

export const OPTIONS = async () => {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
