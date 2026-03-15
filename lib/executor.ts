import { nodeDefinitions } from "./node-definitions";
import { NodeExecutionContext,NodeExecutionResult } from "./types";
 
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
export class WorkflowExecutor{
    async executeNode(context:NodeExecutionContext):Promise<NodeExecutionResult>{
        const {nodeId,input,config}=context;
        const definition=nodeDefinitions[config.type];
        if(!definition){
            return {
                success:false,
                error:`Unknown node type:${config.type}`
            };
        }
        try {
            switch(definition.category){
                case "trigger":
                    return await this.executeTriggerNode(config,input)
                case "ai":
                    return await this.executeAINodeType(config,input)
                case "action":
                    return await this.executeActionNode(config,input)
                case "logic":
                    return await this.executingLogicNode(config,input);
                default:
                    return{
                        success:false,
                        error:`Unsupported node Category: ${definition.category}`
                    }
            }
        } catch (error:any) {
            return{
                success:false,
                error:error.message || "Execution failed",
            }
        }
        
    }
    private async executeAINodeType(config:Record<string,any>,input:any):Promise<NodeExecutionResult>{
        const result=await this.executeAINode(config.type,config,input);
        return{
            success:true,
            output:result,
        }
    }
    private async executeAINode(type:string,config:Record<string,any>,input:any):Promise<any>{
        try{
            const response=await fetch("/api/ai/execute",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({type,config,input})
            })
            if(!response.ok){
                const error=await response.json();
                throw new Error(error.error || "AI execution failed")
            }
            return await response.json();
        }
        catch(error:any){
            throw new Error(error.message || "Failed to execute AI node"); 
        }
    }
    
    private async executeTriggerNode(config:Record<string,any>,input:any):Promise<NodeExecutionResult>{
        return{
            success:true,
            output:input || {
                triggeredAt:new Date().toISOString(),
                config:config,
            }
        }
     }

     private async executeActionNode(config:Record<string,any>,input:any):Promise<NodeExecutionResult>{
        switch (config.type){
            case "httpRequest":
                return await this.executeHttpRequest(config,input);
            case "dataTransform":
                return await this.executeDataTransform(config,input);
            case "sendEmail":
                return await this.executeSendEmail(config,input);
            default:{
                return {
                    success:false,
                    error:`Unknown action node type:${config.type}`
                }
            }
        }
        
        return {
            success:true,
            output: input || {}
        };
     }

     private async executingLogicNode(config:Record<string,any>,input:any):Promise<NodeExecutionResult>{
        switch (config.type){
             case "ifElse":
                return this.executeIfElse(config,input);
            case "delay":
                return this.executeDelay(config,input);
            default:
                    return{
                        success:false,
                        error:`Unsupported node : ${config.type}`
                    }
        }
        return {
            success:true,
            output: input || {}
        };
     }
     private async executeIfElse(config:Record<string,any>,input:any):Promise<NodeExecutionResult>{
         const {condition,operator}=config;
         let result=false;
         if(operator==="javascript"){
            try {
                const evaluateFunction=new Function("input",`return ${condition}`);
                result=evaluateFunction(input);
            } catch (error: any) {
                return { success: false, error: "Condition execution error: " + error.message };
            }
         }
         
         if (!result) {
             return {
                 success: false,
                 error: "Conditions not met"
             }
         }
         
         return{
            success:true,
            output:{
                condition:result,
                branch:"true",
                input,
            }
         }
     }
     private async executeDelay(config: Record<string, any>, input: any): Promise<NodeExecutionResult> {
        const { duration, unit } = config;
        let ms = parseInt(duration || "1000", 10);
        if (unit === "seconds") {
            ms *= 1000;
        }
        await new Promise((resolve) => setTimeout(resolve, ms));
        return {
            success: true,
            output: {
                delayed: ms,
                input,
            }
        };
     }
     
     private async executeHttpRequest(config: Record<string, any>, input: any): Promise<NodeExecutionResult> {
        try {
            const { method, url, headers, body } = config;
            // Send request to the next.js proxy to avoid CORS issues
            const proxyResponse = await fetch("/api/httpProxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method, url, headers, body, input })
            });
            
            if (!proxyResponse.ok) {
                const errorData = await proxyResponse.json();
                throw new Error(errorData.error || "HTTP Request failed");
            }
            
            const data = await proxyResponse.json();
            return {
                success: true,
                output: data
            };
        } catch (error: any) {
             return {
                 success: false,
                 error: error.message || "Failed to execute HTTP Request",
             };
        }
     }
     
     private async executeDataTransform(config: Record<string, any>, input: any): Promise<NodeExecutionResult> {
         try {
             const { code } = config;
             // Be very careful with eval/Function in production. Using new Function here for transforming data
             const transformFunction = new Function("input", code);
             const result = transformFunction(input);
             return {
                 success: true,
                 output: result
             };
         } catch (error: any) {
             return {
                 success: false,
                 error: error.message || "Data transform failed",
             };
         }
     }
     
     private async executeSendEmail(config: Record<string, any>, input: any): Promise<NodeExecutionResult> {
         
         let { to, subject, body } = config;
         if (!body || body.trim() === "") {
             body = extractStringInput(input);
         }
         
         if (typeof window !== "undefined") {
             const mailtoLink = `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
             // Create an anchor element and click it to ensure it works across browsers
             const link = document.createElement("a");
             link.href = mailtoLink;
             link.target = "_blank";
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
         }
         
         return {
             success: true,
             output: { 
                 sentData: { to, subject, body }, 
                 input 
             }
         };
     }
}