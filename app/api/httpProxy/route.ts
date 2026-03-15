import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { method, url, headers, body, input } = await request.json();
        
        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }
        
        // Parse headers safely
        let parsedHeaders: Record<string, string> = {
            "Content-Type": "application/json"
        };
        
        try {
            const userHeaders = typeof headers === "string" ? JSON.parse(headers || "{}") : (headers || {});
            parsedHeaders = { ...parsedHeaders, ...userHeaders };
        } catch (e) {
            console.warn("Could not parse headers, using default content-type");
        }
        
        // Handle template variable replacement globally right here if needed
        let processedUrl = url;
        let processedBody = typeof body === "string" ? body : JSON.stringify(body || {});
        
        if (input) {
            const replaceVars = (text: string) => {
                if (!text || typeof text !== "string") return text;
                return text.replace(/\{\{input\.([^}]+)\}\}/g, (match, path) => {
                    const fields = path.split(".");
                    let value = input;
                    for (const field of fields) {
                        if (value && typeof value === "object" && field in value) {
                            value = value[field];
                        } else {
                            return match;
                        }
                    }
                    return typeof value === "object" ? JSON.stringify(value) : String(value);
                }).replace(/\{\{input\}\}/g, typeof input === "object" ? JSON.stringify(input) : String(input));
            };
            
            processedUrl = replaceVars(processedUrl);
            processedBody = replaceVars(processedBody);
        }

        const fetchOptions: RequestInit = {
            method: method || "GET",
            headers: parsedHeaders,
        };
        
        if (method !== "GET" && method !== "HEAD") {
            fetchOptions.body = processedBody;
        }
        
        const response = await fetch(processedUrl, fetchOptions);
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }
        
        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData
        });
        
    } catch (error: any) {
        console.error("HTTP Proxy Error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch from proxy" }, { status: 500 });
    }
}
