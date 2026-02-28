import {
    CopilotRuntime,
    OpenAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAIAdapter();

const runtime = new CopilotRuntime({
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
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter: openai,
        endpoint: "/api/copilot",
    });

    const response = await handleRequest(req);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
};

export const OPTIONS = async () => {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
};
