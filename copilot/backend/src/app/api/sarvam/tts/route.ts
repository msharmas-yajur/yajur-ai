import { NextRequest, NextResponse } from "next/server";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "SARVAM_API_KEY not set" }, { status: 500, headers: CORS });
    }

    const { text, language } = await req.json();
    if (!text) {
        return NextResponse.json({ error: "Missing text" }, { status: 400, headers: CORS });
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: [text],
            target_language_code: language || "en-IN",
            speaker: "anushka",
            model: "bulbul:v2",
            enable_preprocessing: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status, headers: CORS });
    }

    const data = await response.json();
    return NextResponse.json({ audio: data.audios?.[0] }, { headers: CORS });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS });
}
