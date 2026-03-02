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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
        return NextResponse.json({ error: "Missing audio file" }, { status: 400, headers: CORS });
    }

    const sarvamForm = new FormData();
    sarvamForm.append("file", file, file.name || "audio.webm");
    sarvamForm.append("model", "saarika:v2.5");
    sarvamForm.append("language_code", "unknown"); // auto-detect language

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: { "api-subscription-key": apiKey },
        body: sarvamForm,
    });

    if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status, headers: CORS });
    }

    const data = await response.json();
    return NextResponse.json(
        { transcript: data.transcript, language: data.language_code },
        { headers: CORS }
    );
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS });
}
