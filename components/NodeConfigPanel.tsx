"use client";
import { nodeDefinitions } from "@/lib/node-definitions";
import { useWorkflowStore } from "@/lib/store";
import { X, Copy, Check } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

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
    const [copied, setCopied] = useState(false);
    
    const getMainOutput = (output: any) => {
        if (!output) return "";
        if (typeof output === "string") return output;
        if (output.generatedText) return output.generatedText;
        if (output.response) return output.response;
        if (output.result) return output.result;
        if (output.extractedData) return typeof output.extractedData === "string" ? output.extractedData : JSON.stringify(output.extractedData, null, 2);
        if (output.sentData) return `Sent To: ${output.sentData.to}\nSubject: ${output.sentData.subject}\nBody:\n${output.sentData.body}`;
        if (output.condition !== undefined) return JSON.stringify(output, null, 2);
        return typeof output === "object" ? JSON.stringify(output, null, 2) : String(output);
    };

    const handleCopy = () => {
        const textToCopy = getMainOutput(node?.data?.output);
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    useEffect(()=>{
        if(node?.data.config){
            setConfig(node.data.config);
        }
    },[node])
    const handleSave=()=>{
        updateNode(nodeId,{config});
        onClose();
    }
    const handleChange=(name:string,value:any)=>{
        setConfig((prev)=>({...prev,[name]:value}));
    }
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
                             <Textarea
                             
                             value={config[field.name] || field.defaultValue || "" }
                             onChange={(e)=>handleChange(field.name,e.target.value)}
                             placeholder={field.placeholder}
                             className="mt-1 font-mono text-sm"
                             rows={6}
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
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <Button onClick={handleSave} className="flex-1">Save Configutation</Button>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
                {node.data.error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                            Execution Error
                        </h4>
                        <pre className="text-xs text-red-600 dark:text-red-400 overflow-y-auto max-h-64 whitespace-pre-wrap">
                            {String(node.data.error)}
                        </pre>
                    </div>
                )}
                {node.data.output && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                Last Output
                            </h4>
                            <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-y-auto max-h-96 whitespace-pre-wrap break-words">
                            {getMainOutput(node.data.output)}
                        </pre>
                    </div>
                )}
             </div>
        </div>
    )
}