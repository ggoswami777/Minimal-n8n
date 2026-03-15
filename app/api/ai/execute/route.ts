import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function extractStringInput(input: any): string {
    if (!input) return "";
    if (typeof input === "string") return input;
    if (input.generatedText) return input.generatedText;
    if (input.response) return input.response;
    if (input.result) return input.result;
    if (input.extractedData) return typeof input.extractedData === "string" ? input.extractedData : JSON.stringify(input.extractedData);
    if (input.output) return typeof input.output === "string" ? input.output : JSON.stringify(input.output);
    return JSON.stringify(input);
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
        if(!process.env.GEMINI_API_KEY){
            return NextResponse.json(
                {
                    error:"Gemini API credentials not configured. Add them."
                },
                {status:500}
            )
        }
        const genAI=new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        let result;
        switch (type){
            case "aiTextGenerator":
            case "aiTextGenerate":
                result = await executeTextGenerator(config,input,genAI);
                break;
            case "aiAnalyzer":
                result = await executeAnalyzer(config,input,genAI);
                break;
            case "aiChatbot":
                result = await executeChatbot(config,input,genAI);
                break;        
            case "aiDataExtractor":
                result = await executeDataExtractor(config,input,genAI);
                break;   
            default:
                return NextResponse.json({
                    error:`Unknown node AI type: ${type}`
                },{status:400})
        }
        return NextResponse.json(result);
    } catch (error:any) {
        console.log("AI execution error :",error)
        console.log("Error details",{
            message:error.message,
            stack:error.stack,
            status:error.status,
            response:error.response,
        });
        return NextResponse.json({
            error:error.message || "AI execeution failed",
            details:error.status?`status:${error.status}`:undefined,
        },{status:400})
    }
}

async function executeTextGenerator(config:any,input:any,genAI:GoogleGenerativeAI){
    let {prompt,temperature,maxTokens}=config;
    prompt=replaceTemplateVariables(prompt,input);
    if (!prompt) {
        prompt = extractStringInput(input);
    }
    console.log("Executing text generator with prompt:", prompt?.substring(0,50));
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: {
        temperature: parseFloat(temperature || "0.7"),
        maxOutputTokens: parseFloat(maxTokens || "500")
    }});
    const result = await model.generateContent(prompt);
    return {
        generatedText: result.response.text(),
        model: "gemini-2.5-flash-lite",
    };
}

async function executeAnalyzer(config:any,input:any,genAI:GoogleGenerativeAI){
    let {text,analysisType}=config;
    text=replaceTemplateVariables(text,input);
    if (!text) {
        text = extractStringInput(input);
    }
    let systemPrompt=""
    switch (analysisType){
        case "sentiment":
            systemPrompt="Analyze the sentiment of the following text. First, state clearly whether it is Positive, Negative, or Neutral. Then, give a conversational, helpful sentence or two explaining why and reacting to the text (e.g. 'That is a good idea!'). Finish with a confidence score (0.0 to 1.0)."
            break;
        case "keywords":
            systemPrompt="Extract the most important keywords and phrases from the following text. Return them as a json array."
            break;
        case "summary":
            systemPrompt="provide a concise summary of following text in 2-3 sentences";
            break;
    }
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.3 }});
    const prompt = systemPrompt + "\n\nText: " + text;
    const result = await model.generateContent(prompt);
    return {
        analysisType,
        result: result.response.text(),
    }
}

async function executeChatbot(config:any,input:any,genAI:GoogleGenerativeAI){
    let {systemPrompt, userMessage, personality}=config;
    systemPrompt = replaceTemplateVariables(systemPrompt || "", input);
    if (!userMessage) {
        userMessage = extractStringInput(input);
    }
    
    const instruction = systemPrompt + (personality ? `\nPersonality: ${personality}` : "");
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite", 
        systemInstruction: instruction,
        generationConfig: { temperature: 0.7 } 
    });
    const result = await model.generateContent(userMessage);
    
    return {
        response: result.response.text(),
        model: "gemini-2.5-flash-lite",
    };
}

async function executeDataExtractor(config:any,input:any,genAI:GoogleGenerativeAI){
    let {text, schema}=config;
    text = replaceTemplateVariables(text || "", input);
    if (!text) {
        text = extractStringInput(input);
    }
    let systemPrompt = `Extract information from the provided text according to this JSON schema: ${schema}. Return ONLY valid JSON matching the schema. Do not return markdown.`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.1 } });
    const prompt = systemPrompt + "\n\nText: " + text;
    const result = await model.generateContent(prompt);
    
    let extractedData = result.response.text();
    try {
        if (extractedData.startsWith("```json")) {
            extractedData = extractedData.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        }
        extractedData = JSON.parse(extractedData);
    } catch(e) {
        
    }
    
    return {
        extractedData,
        model: "gemini-2.5-flash-lite",
    };
   
}