"use client"
import { useWorkflowStore } from "@/lib/store";
import Image from "next/image";
import { useState } from "react";
import ReactFlow, { Background,Controls,MiniMap,useEdgesState, useNodesState } from "reactflow";

export default function Home() {
  const {nodes,edges,addNode,addEdge,updateNode,setNodes,setEdges}=useWorkflowStore();
  const[,,onNodesChange]=useNodesState([]);
  const [,,onEdgesChange]=useEdgesState([]);
  const [isExecuting,setIsExecuting]=useState(false);
  const [selectedNodeId,setSelectedNodeId]=useState<string|null>(null);

  return (
    <div className="flex h-screen w-screen ">
      <ReactFlow  
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      >
        <Background/>
        <Controls/>
        <MiniMap/>
      </ReactFlow>
    </div>

  );
}
