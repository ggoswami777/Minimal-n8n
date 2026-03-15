"use client"
import CustomNode from "@/components/CustomNode";
import NodeConfigPanel from "@/components/NodeConfigPanel";
import Sidebar from "@/components/Sidebar";
import { Lightbulb, X } from "lucide-react";
import { WorkflowExecutor } from "@/lib/executor";
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
  const [showTips, setShowTips] = useState(true);
  const onConnect:OnConnect=useCallback(
    (connection:Connection)=>{
      const edge={
        ...connection,
        id:`e${connection.source}-${connection.target}`,
        type:"smoothstep",
        animated:true,
        style: { stroke: '#a1a1aa', strokeWidth: 1.5 }
      };
      addEdge(edge as any);
    },[addEdge]
  )
  const onNodeDoubleClick=useCallback(
    (event:React.MouseEvent,node:any)=>{
      setSelectedNodeId(node.id);

    },[]
  )
  const executeWorkflow=async()=>{
    if(nodes.length==0){
      alert("Add some nodes to workflow")
      return;
    }
    setIsExecuting(true);
    const executor=new WorkflowExecutor();
    const triggerNodes=nodes.filter((node)=>!edges.some((edge)=>edge.target===node.id))
    if(triggerNodes.length===0){
      alert("Add a trigger node to start the flow");
      setIsExecuting(false);
      return;
    }
    nodes.forEach((node)=>{
      updateNode(node.id,{
        output:undefined,
        error:undefined,
        isExecuting:false,
      })
    })

    const executedNodes=new Set<string>();
    const nodeOutputs:Record<string,any>={};
    const executeNodeChain=async(nodeId:string, input:any=null)=>{
        if(executedNodes.has(nodeId)) return ;
        const node=nodes.find((n)=>n.id===nodeId);
        if(!node) return ;
        executedNodes.add(nodeId);
        updateNode(nodeId,{isExecuting:true,error:undefined});
        try {
          const result=await executor.executeNode({
            nodeId:node.id,
            input,
            config:node.data.config || {},
            previousNodes:nodeOutputs,
          })
          if(result.success){
            updateNode(nodeId,{
              output:result.output,
              isExecuting:false,
            })
         
          nodeOutputs[nodeId]=result.output;
          const connectedEdges=edges.filter((edge)=>edge.source===nodeId);
          for(const edge of connectedEdges){
            await executeNodeChain(edge.target,result.output)
          }
         }
         else{
          updateNode(nodeId,{
            error:result.error,
            isExecuting:false,
          })
         }
        } catch (error:any) {
          updateNode(nodeId,{
            error:error.message || "Executing failed",
            isExecuting:false,
          })
        }
    }
    for(const triggerNode of triggerNodes){
      await executeNodeChain(triggerNode.id)
    }
    setIsExecuting(false);
  }
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      changes.forEach((change)=>{
        if(change.type==="remove"){
          const{edges:currentEdges}=useWorkflowStore.getState();
          setEdges(currentEdges.filter((edge)=>edge.id!==change.id));
        }
      })
    },[edges,onEdgesChange,setEdges]
  )
  const handleNodesChange:OnNodesChange=useCallback(
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
            const updateNodes=nodes.map((n)=> n.id===change.id ?{...n,position:change.position!}:n)
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

  const handleAddNode = useCallback((type: string) => {
    const definition = nodeDefinitions[type];
    if (!definition) return;
    
    let position = { x: 250, y: 250 };
    if (reactFlowInstance) {
        position = reactFlowInstance.project({
            x: window.innerWidth / 2,     
            y: window.innerHeight / 2
        });
    }

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: "custom",
      position,
      data: {
        label: definition.label,
        type: definition.type,
        config: { ...definition.defaultConfig, type: definition.type },
      } as NodeData,
    };
    addNode(newNode);
  }, [reactFlowInstance, addNode]);
  return (
    <div className="flex h-screen w-screen bg-gray-100">
      <Sidebar 
          onExecute={executeWorkflow} 
          isExecuting={isExecuting} 
          onDelete={() => {
              if (selectedNodeId) {
                  useWorkflowStore.getState().deleteNode(selectedNodeId);
                  setSelectedNodeId(null);
              } else {
                  if (window.confirm("Are you sure you want to clear the entire workflow?")) {
                      useWorkflowStore.getState().clearWorkflow();
                      setSelectedNodeId(null);
                  }
              }
          }} 
          onAddNode={handleAddNode}
      />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {showTips && (
          <div className="absolute top-4 right-4 z-50 bg-[#fff1f2] border border-[#ffccd5] rounded shadow-sm p-4 w-72">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 text-[#e11d48]">
                <Lightbulb className="w-3.5 h-3.5" />
                <h4 className="text-xs font-semibold">Quick tips</h4>
              </div>
              <button onClick={() => setShowTips(false)} className="text-[#e11d48] hover:text-red-700 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#e11d48] mb-1.5 leading-tight">
              Drag nodes to build and double-click to drop instantly.
            </p>
            <p className="text-[11px] text-[#e11d48] leading-tight">
              Connect the flow, then execute when you're ready.
            </p>
          </div>
        )}
        <ReactFlow  
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange as OnNodesChange}
        onEdgesChange={ handleEdgesChange as OnEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        fitView
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#a1a1aa', strokeWidth: 1.5 } }}
        className="bg-[#fafafa]"
        >
          <Background color="#d4d4d8" gap={16} size={1} />
          <Controls className="bg-white border-gray-200 shadow-sm" showInteractive={false} />
          <MiniMap
          nodeColor={(node)=>{
            return "#222222";
          }}
          className="bg-white border border-gray-200 rounded shadow-sm"
          maskColor="rgba(250, 250, 250, 0.7)"
          />
          <Panel position="top-center" className="bg-white px-4 py-2 mt-2 rounded border border-gray-200">
            <div className="text-[11px] text-gray-500 font-medium">
              <span className="font-bold text-gray-900">{nodes.length}</span>{" "}
              nodes {" • "}
              <span className="font-bold text-gray-900">
                {edges.length}
              </span>{" "}
              connections
            </div>
          </Panel>
        </ReactFlow>
      </div>
      {selectedNodeId && (
        <NodeConfigPanel nodeId={selectedNodeId} onClose={()=>setSelectedNodeId(null)}/>
      )}
    </div>

  );
}
