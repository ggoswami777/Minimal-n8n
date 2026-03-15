"use client"
import { nodeDefinitions } from "@/lib/node-definitions";
import { WorkflowNode } from "@/lib/types";
import { AlertCircle, CheckCircle, Loader2, Settings, X } from "lucide-react";
import React,{memo} from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { useWorkflowStore } from "@/lib/store";

function CustomNode({data,id,selected}:NodeProps<WorkflowNode["data"]>){
    const definition=nodeDefinitions[data.type];
    const { deleteNode } = useWorkflowStore();
    if(!definition)return null;
    const Icon=definition.icon;
    const showInput=definition.category!=="trigger";
    return(
        <div>
        <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all hover:shadow-md 
        ${selected?"border-gray-400":"border-gray-200 dark:border-gray-700"} ${data.isExecuting?"ring-1 ring-blue-400":""} ${data.error?"ring-1 ring-red-400":""} min-w-[250px]`}>
            {showInput && (
                <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#f15b50] !border-none"/>
            )}
            
            <button 
                onClick={(e) => { e.stopPropagation(); deleteNode(id); }} 
                className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 border border-gray-200 shadow-sm hover:bg-gray-100 z-10"
            >
                <X className="w-3 h-3 text-gray-500"/>
            </button>

            <div className={`bg-[#222222] p-2.5 rounded-t-lg flex items-center gap-2`}>
                <Icon className="h-4 w-4 text-white"></Icon>
                <span className="font-semibold text-white text-xs flex-1">
                    {definition.label}
                </span>
                {
                    data.isExecuting &&(
                        <Loader2 className="h-4 w-4 text-white animate-spin"/>
                    )
                }
                {
                    data.output && !data.isExecuting && !data.error && (
                        <CheckCircle className="h-4 w-4 text-white"/>
                    )
                }
                {data.error && <AlertCircle className="h-4 w-4 text-white"/>}
            </div>
            <div className="p-3 bg-white rounded-b-lg">
                <div className="text-[11px] text-gray-500 mb-3 truncate">
                    {definition.description}
                </div>
                {data.config && Object.keys(data.config).length>0 && (
                    <div className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100">
                        <Settings className="h-3 w-3"></Settings>
                        <span>Configured</span>
                    </div>
                ) }
                {data.error &&(
                    <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/2 text-red-600 dark:text-red-400 p-2 rounded border border-red-200 dark:border-red-800">
                        {data.error}
                    </div>
                )}
                {!data.error && data.output &&(
                    <div className="mt-2 text-xs bg-green-50 dark:bg-green-900/2 text-green-600 dark:text-green-400 p-2 rounded border border-green-200 dark:border-green-800">
                        Executed Successfully
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#f15b50] !border-none"/>
        </div>
    </div>
    )
}
export default memo(CustomNode)