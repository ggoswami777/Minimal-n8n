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
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-100 z-50 overflow-y-auto font-sans">
             <div className="sticky top-0 bg-black p-4 flex items-center justify-between shadow-md z-50">
                <div className="z-100">
                    <h3 className="text-[17px] font-bold text-white">
                        Configure Node
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {definition.label}
                    </p>
                </div>
                <button className="text-gray-400 hover:text-white transition-colors" onClick={onClose}>
                    <X className="w-5 h-5"/>
                </button>
             </div>
             <div className="p-4 space-y-4">
                {definition.configFields.map((field) => {
                    const isMainAIField = ["prompt", "text", "userMessage", "body"].includes(field.name);
                    const isUsingAuto = isMainAIField && (!config[field.name] || config[field.name] === "");

                    return (
                        <div key={field.name} className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <Label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                </Label>
                                {isMainAIField && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isUsingAuto ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {isUsingAuto ? "CONNECTED TO PREVIOUS" : "MANUAL INPUT"}
                                    </span>
                                )}
                            </div>
                            
                            {field.type === "text" && (
                                 <input 
                                 type="text"
                                 value={config[field.name] || "" }
                                 onChange={(e)=>handleChange(field.name,e.target.value)}
                                 placeholder={isMainAIField ? "Leave blank to use data from previous node..." : field.placeholder}
                                 className="w-full bg-white text-gray-900 border-2 border-gray-100 rounded-md p-3 text-sm font-mono placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                                  />
                            )}
                            {field.type === "number" && (
                                 <input
                                 type="number"
                                 value={config[field.name] || field.defaultValue || "" }
                                 onChange={(e)=>handleChange(field.name,e.target.value)}
                                 placeholder={field.placeholder}
                                 className="w-full bg-white text-gray-900 border-2 border-gray-100 rounded-md p-3 text-sm font-mono placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
                                  />
                            )}
                            {field.type === "textarea" && (
                                 <textarea
                                 value={config[field.name] || "" }
                                 onChange={(e)=>handleChange(field.name,e.target.value)}
                                 placeholder={isMainAIField ? "Leave blank to automatically ingest data from the previous connected node..." : field.placeholder}
                                 className="w-full bg-white text-gray-900 border-2 border-gray-100 rounded-md p-3 text-sm font-mono placeholder-gray-300 resize-none focus:outline-none focus:border-black transition-colors min-h-[120px]"
                                 rows={6}
                                  />
                            )}
                             {field.type === "select" && (
                                 <div className="relative group">
                                     <select
                                     value={config[field.name] || field.defaultValue || "" }
                                     onChange={(e)=>handleChange(field.name,e.target.value)}
                                     className="w-full bg-white text-gray-900 border-2 border-gray-100 rounded-md p-3 pr-10 text-sm font-mono focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer"
                                      >
                                       {field.options?.filter(option => {
                                           if (field.name === "model") {
                                               const currentProvider = config.provider || "gemini";
                                               if (currentProvider === "gemini") return option.value.startsWith("gemini");
                                               if (currentProvider === "groq") return option.label.includes("(Groq)") || option.value.startsWith("llama") || option.value.startsWith("openai");
                                           }
                                           return true;
                                       }).map((option)=>
                                        (
                                            <option value={option.value} key={option.value}>{option.label}</option>
                                        ))}
                                     </select>
                                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 5l7 7-7 7" transform="rotate(90 12 12)"/>
                                         </svg>
                                     </div>
                                 </div>
                             )}
                            {isMainAIField && isUsingAuto && (
                                <p className="text-[10px] text-green-600 font-medium italic">
                                     This node will automatically use the output from the previous node.
                                </p>
                            )}
                        </div>
                    );
                })}
                 {definition.category === "ai" && (
                    <div className="bg-white border-2 border-black p-4 mb-2 rounded-md shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-2 w-2 rounded-full bg-black animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">Rate Limit Notice</span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Every model has a daily limit. If you encounter an error or slow response, please <span className="font-bold underline">select a different model</span> from the dropdown above.
                        </p>
                    </div>
                 )}
                 <div className="pt-4 flex gap-2">
                    <Button onClick={handleSave} className="flex-[2] bg-black hover:bg-gray-800 text-white rounded-md shadow-md border-none transition-all active:scale-95 py-6">Save Configuration</Button>
                    <Button variant="outline" onClick={onClose} className="flex-1 bg-white text-black hover:bg-gray-50 border-2 border-gray-100 shadow-sm rounded-md transition-all py-6">Cancel</Button>
                </div>
                {node.data.error && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-100">
                        <h4 className="text-[11px] font-semibold text-red-600 mb-1">
                            Execution Error
                        </h4>
                        <pre className="text-[10px] text-red-600 overflow-y-auto max-h-64 whitespace-pre-wrap">
                            {String(node.data.error)}
                        </pre>
                    </div>
                )}
                {node.data.output && (
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                Last Output
                            </h4>
                            <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition-colors">
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <pre className="text-[11px] text-gray-700 overflow-y-auto max-h-96 whitespace-pre-wrap break-words">
                            {getMainOutput(node.data.output)}
                        </pre>
                    </div>
                )}
             </div>
        </div>
    )
}