import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Groq from "groq-sdk";

function extractStringInput(input: any): string {
    if (!input) return "";
    if (typeof input === "string") return input;
    
    const data = input.output !== undefined ? input.output : input;
    if (!data) return "";
    if (typeof data === "string") return data;

    if (data.generatedText) return data.generatedText;
    if (data.response) return data.response;
    if (data.result) return data.result;
    if (data.extractedData) return typeof data.extractedData === "string" ? data.extractedData : JSON.stringify(data.extractedData);
    if (data.output) return typeof data.output === "string" ? data.output : JSON.stringify(data.output);
    
    return typeof data === "object" ? JSON.stringify(data) : String(data);
}

function replaceTemplateVariables(text:string,input:any):string{
    if(!text || typeof text!=="string"){
        return text;
    }
    let result=text.replace(
        /\{\{input\}\}/g,typeof input==="object"?JSON.stringify(input):String(input)
    );
    result=result.replace(
         /\{\{input\.([^}]+)\}\}/g,
         (match:string,path:string)=>{
            const fields=path.split(".");
            let value=input;
            for(const field of fields){
                if(value && typeof value==="object" && field in value){
                    value=value[field];
                }else{
                    return match;
                }
            }
            return typeof value==="object"?JSON.stringify(value):String(value);
         }
    )
    return result;
}

export async function POST(request:NextRequest){
    try {
        const {type,config,input}=await request.json();
        const provider = config.provider || "gemini";
        const modelName = config.model || (provider === "gemini" ? "gemini-2.5-flash" : provider === "groq" ? "llama-3.1-8b-instant" : "deepseek-chat");

        let result;
        if (provider === "gemini") {
            if(!process.env.GEMINI_API_KEY){
                return NextResponse.json({ error:"Gemini API key not configured." }, {status: 500});
            }
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            result = await executeWithGemini(type, config, input, genAI, modelName);
        } else if (provider === "groq") {
            if(!process.env.GROQ_API_KEY){
                return NextResponse.json({ error:"Groq API key not configured." }, {status: 500});
            }
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            result = await executeWithGroq(type, config, input, groq, modelName);
        } else {
            return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error:any) {

        return NextResponse.json({
            error: error.message || "AI execution failed",
            details: error.status ? `status: ${error.status}` : undefined,
        }, { status: 400 });
    }
}

async function executeWithGemini(type: string, config: any, input: any, genAI: GoogleGenerativeAI, modelName: string) {
    let prompt = "";
    let systemInstruction = "";

    switch (type) {
        case "aiTextGenerator":
        case "aiTextGenerate":
            prompt = replaceTemplateVariables(config.prompt, input) || extractStringInput(input);
            break;
        case "aiAnalyzer":
            const analysisText = replaceTemplateVariables(config.text, input) || extractStringInput(input);
            const systemPrompt = getAnalyzerSystemPrompt(config.analysisType);
            prompt = systemPrompt + "\n\nText: " + analysisText;
            break;
        case "aiChatbot":
            const incomingContext = extractStringInput(input);
             if (config.userMessage) {
                if (config.userMessage.includes("{{input}}")) {
                    prompt = replaceTemplateVariables(config.userMessage, input);
                } else if (incomingContext) {
                    prompt = `${config.userMessage}\n\nContext from previous node:\n${incomingContext}`;
                } else {
                    prompt = config.userMessage;
                }
            } else {
                prompt = incomingContext || "Hello";
            }
            systemInstruction = replaceTemplateVariables(config.systemPrompt || "", input) + (config.personality ? `\nPersonality: ${config.personality}` : "");
            break;
        case "aiDataExtractor":
            const extractText = replaceTemplateVariables(config.text, input) || extractStringInput(input);
            prompt = `Extract information from the provided text according to this JSON schema: ${config.schema}. Return ONLY valid JSON matching the schema. Do not return markdown.\n\nText: ${extractText}`;
            break;
        default:
            throw new Error(`Unknown node AI type: ${type}`);
    }

    const model = genAI.getGenerativeModel({ 
        model: modelName, 
        systemInstruction: systemInstruction || undefined,
        generationConfig: {
            temperature: parseFloat(config.temperature || "0.7"),
            maxOutputTokens: parseFloat(config.maxTokens || "500")
        }
    });

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    if (type === "aiDataExtractor") {
        text = cleanJsonResponse(text);
    }

    return {
        generatedText: text,
        result: text, 
        response: text, 
        extractedData: type === "aiDataExtractor" ? JSON.parse(text) : undefined,
        model: modelName,
    };
}

async function executeWithGroq(type: string, config: any, input: any, groq: Groq, modelName: string) {
    let messages: any[] = [];
    switch (type) {
        case "aiTextGenerator":
        case "aiTextGenerate":
            messages = [{ role: "user", content: replaceTemplateVariables(config.prompt, input) || extractStringInput(input) }];
            break;
        case "aiAnalyzer":
            const analysisText = replaceTemplateVariables(config.text, input) || extractStringInput(input);
            messages = [
                { role: "system", content: getAnalyzerSystemPrompt(config.analysisType) },
                { role: "user", content: analysisText }
            ];
            break;
        case "aiChatbot":
            const incomingContext = extractStringInput(input);
            let userPrompt = "";
            if (config.userMessage) {
                if (config.userMessage.includes("{{input}}")) {
                    userPrompt = replaceTemplateVariables(config.userMessage, input);
                } else if (incomingContext) {
                    userPrompt = `${config.userMessage}\n\nContext from previous node:\n${incomingContext}`;
                } else {
                    userPrompt = config.userMessage;
                }
            } else {
                userPrompt = incomingContext || "Hello";
            }
            const systemPrompt = replaceTemplateVariables(config.systemPrompt || "", input) + (config.personality ? `\nPersonality: ${config.personality}` : "");
            messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];
            break;
        case "aiDataExtractor":
            const extractText = replaceTemplateVariables(config.text, input) || extractStringInput(input);
            messages = [
                { role: "system", content: `Extract information from the provided text according to this JSON schema: ${config.schema}. Return ONLY valid JSON matching the schema.` },
                { role: "user", content: extractText }
            ];
            break;
        default:
            throw new Error(`Unknown node AI type: ${type}`);
    }

    const response = await groq.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: parseFloat(config.temperature || "0.7"),
        max_tokens: parseInt(config.maxTokens || "500"),
    });

    let text = response.choices[0].message.content || "";

    if (type === "aiDataExtractor") {
        text = cleanJsonResponse(text);
    }

    return {
        generatedText: text,
        result: text, 
        response: text,
        extractedData: type === "aiDataExtractor" ? JSON.parse(text) : undefined,
        model: modelName,
    };
}

function getAnalyzerSystemPrompt(analysisType: string) {
    switch (analysisType) {
        case "sentiment":
            return "Analyze the sentiment of the following text. First, state clearly whether it is Positive, Negative, or Neutral. Then, give a conversational, helpful sentence or two explaining why and reacting to the text (e.g. 'That is a good idea!'). Finish with a confidence score (0.0 to 1.0).";
        case "keywords":
            return "Extract the most important keywords and phrases from the following text. Return them as a json array.";
        case "summary":
            return "Provide a concise summary of the following text in 2-3 sentences.";
        default:
            return "Analyze the following text.";
    }
}

function cleanJsonResponse(text: string) {
    if (text.startsWith("```json")) {
        return text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }
    return text;
}