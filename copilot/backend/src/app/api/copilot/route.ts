import {
    CopilotRuntime,
    GoogleGenerativeAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Read the knowledge base content
const knowledgePath = path.join(process.cwd(), "..", "knowledge", "yajur-summary.md");
let knowledgeBase = "";
try {
    knowledgeBase = fs.readFileSync(knowledgePath, "utf-8");
} catch (error) {
    console.error("Failed to read knowledge base:", error);
}

const serviceAdapter = new GoogleGenerativeAIAdapter({
    model: "gemini-1.5-flash",
});

const runtime = new CopilotRuntime({
    bodyProps: {
        systemPrompt: `You are Yajur Assistant, the AI for Yajur.ai — India's Medical Data Infrastructure Company. 
        Use the following knowledge base to answer questions about the company, its mission, pillars, and services.
        Keep responses professional and concise.
        
        KNOWLEDGE BASE:
        ${knowledgeBase}`,
    },
    actions: [
        {
            name: "getYajurVision",
            description: "Get the vision statement of Yajur Healthcare",
            handler: async () => {
                return "There’s a clear paradigm shift taking place across medical information, and we are at the forefront of this transformation.";
            },
        },
    ],
});

export const POST = async (req: NextRequest) => {
    console.log("POST /api/copilot called");
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/copilot",
    });

    const response = await handleRequest(req);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-copilotkit-public-key, x-copilotcloud-public-api-key, x-copilotkit-runtime-client-id, x-copilotkit-sdk-version, x-copilotkit-runtime-public-key");
    return response;
};

export const OPTIONS = async () => {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-copilotkit-public-key, x-copilotcloud-public-api-key, x-copilotkit-runtime-client-id, x-copilotkit-sdk-version, x-copilotkit-runtime-public-key",
            "Access-Control-Max-Age": "86400",
        },
    });
};
