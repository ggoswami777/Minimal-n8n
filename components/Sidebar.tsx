"use client"
import { NodeDefinition, nodeDefinitions } from '@/lib/node-definitions';
import { useWorkflowStore } from '@/lib/store';
import React from 'react'
import { Button } from './ui/button';
import { Play, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps{
    onExecute:()=>void;
    isExecuting:boolean;
    onDelete?: () => void;
    onAddNode?: (type: string) => void;
}
export default function Sidebar({onExecute,isExecuting, onDelete, onAddNode}:SidebarProps){
    const {clearWorkflow}=useWorkflowStore();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const onDragStart=(event:React.DragEvent,nodeType:string)=>{
        event.dataTransfer.setData("application/reactflow",nodeType);
        event.dataTransfer.effectAllowed="move";
    }
    const categories={
        trigger:"Trigger Nodes",
        ai:"AI NODES",
        action:"Action Nodes",
        logic:"logic Nodes",
    };
    const groupNodes=Object.values(nodeDefinitions).reduce((acc,node)=>{
        if(!acc[node.category]){
            acc[node.category]=[];
        }
        acc[node.category].push(node);
        return acc;

    },{} as Record<string,NodeDefinition[]>);
    if (isCollapsed) {
        return (
            <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 relative z-10 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsCollapsed(false)}>
               <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
        )
    }

    return(
        <div className='w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col h-full '>
            <div className='mb-6'>
                <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-lg font-bold text-gray-900'>Minimal n8n</h2>
                    <button onClick={() => setIsCollapsed(true)} className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-500">
                        <ChevronLeft className="w-4 h-4"/>
                    </button>
                </div>
                <div className='flex gap-2'>
                    <Button onClick={onExecute} disabled={isExecuting} className='flex-1 bg-[#222222] text-white hover:bg-black rounded border border-[#222222]'>
                        <Play className='mr-2 h-4 w-4 fill-white'></Play>
                        {isExecuting?"Running":"Execute"}
                    </Button>
                    <Button variant='outline' onClick={onDelete || clearWorkflow} className='rounded border border-gray-300'>
                        <Trash2 className='w-4 h-4 text-gray-700'/>
                    </Button>
                </div>
            </div>
            
            {Object.entries(categories).map(([category,title])=>(
                <div key={category} className='mb-6'>
                    <h3 className='text-[11px] font-semibold mb-3 text-gray-500 uppercase tracking-wider'>
                        {title}
                    </h3>
                    <div className='space-y-2'>
                        {groupNodes[category]?.map((node)=>(
                            <div 
                                key={node.type} 
                                draggable 
                                onDragStart={(event)=>onDragStart(event,node.type)} 
                                onDoubleClick={() => onAddNode && onAddNode(node.type)}
                                className='p-2.5 bg-gray-50/50 border border-gray-100 rounded cursor-grab active:cursor-grabbing hover:border-gray-200 transition-colors'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className={`bg-[#222222] p-1.5 rounded`}>
                                        <node.icon className="h-4 w-4 text-white"/>
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='font-medium text-[13px] text-gray-900 leading-tight'>
                                            {node.label}
                                        </div>
                                        <div className='text-[11px] text-gray-500 mt-0.5 truncate'>
                                            {node.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}