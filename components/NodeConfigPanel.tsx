"use client";
import { nodeDefinitions } from "@/lib/node-definitions";
import { useWorkflowStore } from "@/lib/store";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface NodeConfigPanelProps{
    nodeId:string;
    onClose:()=>void;
}
export default function NodeConfigPanel({
    nodeId,
    onClose
}:NodeConfigPanelProps){
    const {nodes,updateNode}=useWorkflowStore();
    const node=nodes.find((n)=>n.id===nodeId);
    const [config,setConfig]=useState<Record<string,any>>(node?.data.config || {});
    useEffect(()=>{
        if(node?.data.config){
            setConfig(node.data.config);
        }
    },[node])
    if(!node) return ;
    const definition=nodeDefinitions[node.data.type];
    if(!definition){
        return;
    }
    return(
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-y-auto">
             <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark-border-gray-700 p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Configure Node
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {definition.label}
                    </p>
                    
                </div>
                <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={onClose}>
                    <X className="w-5 h-5"/>
                </button>
             </div>
             <div className="p-4 space-y-4">
                {definition.configFields.map((field) => (
                    <div key={field.name}>
                        <Label className="text-gray-700 dark:text-gray-300 ">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.type === "text" && (
                             <input 
                             type="text"
                             value={config[field.name] || field.defaultValue || "" }
                             onChange={(e)=>handleChange(field.name,e.target.value)}
                             placeholder={field.placeholder}
                             className="mt-1"
                              />
                        )}
                        {field.type === "number" && (
                             <Input
                             type="number"
                             value={config[field.name] || field.defaultValue || "" }
                             onChange={(e)=>handleChange(field.name,e.target.value)}
                             placeholder={field.placeholder}
                             className="mt-1"
                              />
                        )}
                        {field.type === "textarea" && (
                             <TextArea
                             
                             value={config[field.name] || field.defaultValue || "" }
                             onChange={(e)=>handleChange(field.name,e.target.value)}
                             placeholder={field.placeholder}
                             className="mt-1 font-mono text-sm"
                              />
                        )}
                        {field.type === "select" && (
                             <Select
                            
                             value={config[field.name] || field.defaultValue || "" }
                             onChange={(e)=>handleChange(field.name,e.target.value)}
                            
                             className="mt-1"
                              >
                                {field.options?.map((option)=>
                                (
                                    <option value={option.value} key={option.value}>{option.label}</option>
                                ))}
                              </Select>
                        )}
                    </div>
                ))}
             </div>
        </div>
    )
}