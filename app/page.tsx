"use client"
import CustomNode from "@/components/CustomNode";
import Sidebar from "@/components/Sidebar";
import { nodeDefinitions } from "@/lib/node-definitions";
import { useWorkflowStore } from "@/lib/store";
import { NodeData, WorkflowNode } from "@/lib/types";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import ReactFlow, { Background,Controls,MiniMap, NodeTypes,OnConnect,OnNodesChange,OnEdgesChange,Panel,Connection,useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
let nodeIdCounter=0;
const nodeTypes:NodeTypes={
  custom:CustomNode,
}
export default function Home() {
  const {nodes,edges,addNode,addEdge,updateNode,setNodes,setEdges}=useWorkflowStore();
  const reactFlowWrapper=useRef<HTMLDivElement>(null);
  const [reactFlowInstance,setReactFlowInstance]=useState<any>(null);
  const[,,onNodesChange]=useNodesState([]);
  const [,,onEdgesChange]=useEdgesState([]);
  const [isExecuting,setIsExecuting]=useState(false);
  const [selectedNodeId,setSelectedNodeId]=useState<string|null>(null);
  const handleNodeChange:OnNodeChange=useCallback(
    (changes)=>{
      onNodesChange(changes);
      changes.forEach((change)=>{
        if(change.type==="remove"){
          const{nodes:currentNodes}=useWorkflowStore.getState();
          setNodes(currentNodes.filter((node)=>node.id!==change.id));
        }
        else if(change.type==="position" && "position" in change){
          const node=nodes.find((n)=>n.id===change.id);
          if(node && change.position){
            const updateNodes=nodes.map((node)=> node.id===change.id ?{...node,position:change.position!}:node)
            setNodes(updateNodes);
          }
        }
      })
    },[nodes,onNodesChange,setNodes]
  )
  const onDrop=useCallback(
    (event:React.DragEvent)=>{
      event.preventDefault();
      const type=event.dataTransfer.getData("application/reactflow");
      if(!type || !reactFlowInstance) return ;
      const definition=nodeDefinitions[type];
      if(!definition) return;
      const position=reactFlowInstance.screenToFlowPosition({
        x:event.clientX,
        y:event.clientY,
      })
      const newNode:WorkflowNode={
        id:`node-${nodeIdCounter++}`,
        type:"custom",
        position,
        data:{
          label:definition.label,
          type:definition.type,
          config:{...definition.defaultConfig,type:definition.type},
        }as NodeData,
      }
      addNode(newNode);
    },[reactFlowInstance,addNode]
  )
  const onDragOver=useCallback((event:React.DragEvent)=>{
    event.preventDefault();
    event.dataTransfer.dropEffect="move";


  },[])
  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar ></Sidebar>
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow  
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodeChange as onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
        >
          <Background color="#aaa"/>
          <Controls/>
          <MiniMap/>
        </ReactFlow>
      </div>
    </div>

  );
}
