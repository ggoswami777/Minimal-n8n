import { nodeDefinitions } from "./node-definitions";
import { NodeExecutionContext,NodeExecutionResult } from "./types";
 
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
        const result=this.executeAINode(config.type,config,input);
        return{
            success:true,
            output:result,
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
}