/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FsmState } from "../types";
import { rtlModules } from "../data/rtl_code";
import { Cpu, RotateCcw, Activity, HelpCircle, FileText, Settings, ShieldCheck } from "lucide-react";

interface BlockDiagramProps {
  activeFsmState: FsmState;
  onSelectComponentCode: (moduleName: string) => void;
}

export default function BlockDiagram({ activeFsmState, onSelectComponentCode }: BlockDiagramProps) {
  const [selectedBlock, setSelectedBlock] = useState<string>("spi_fsm_controller");

  const components = [
    {
      id: "spi_clock_divider",
      name: "spi_clock_divider",
      title: "Clock Divider",
      description: "Generates divided clock (SCLK) from sys_clk with configured divider ratio (Div 2, 4, 8, 16). Handles CPOL idle states.",
      inputs: ["clk", "rst_n", "clk_div[1:0]", "mode_cpol", "fsm_state[1:0]"],
      outputs: ["sclk_divided", "sclk_pulse"],
      fileName: "spi_clock_divider.v"
    },
    {
      id: "spi_fsm_controller",
      name: "spi_fsm_controller",
      title: "FSM Controller",
      description: "Automates the SPI transaction state transition (IDLE ➔ LOAD ➔ TRANSFER ➔ COMPLETE). Emits synchronized load/shift/sample pulses.",
      inputs: ["clk", "rst_n", "start", "mode_cpha", "sclk_pulse"],
      outputs: ["bit_cnt[2:0]", "load_en", "clear_en", "shift_en", "sample_en", "cs_n", "fsm_state[1:0]"],
      fileName: "spi_fsm_controller.v"
    },
    {
      id: "spi_shift_register",
      name: "spi_shift_register",
      title: "Shift Register",
      description: "Maintains concurrent MSB-first TX shift register to MOSI and RX shift register from MISO lines.",
      inputs: ["clk", "rst_n", "load_en", "clear_en", "shift_en", "sample_en", "tx_data[7:0]", "miso"],
      outputs: ["mosi", "rx_data[7:0]", "bit_cnt[2:0]"],
      fileName: "spi_shift_register.v"
    },
    {
      id: "spi_status_logic",
      name: "spi_status_logic",
      title: "Status Logic",
      description: "Generates system feedback status indicators. Emits busy flag to lock host and done pulse once transfer wraps.",
      inputs: ["clk", "rst_n", "fsm_state[1:0]"],
      outputs: ["busy", "done"],
      fileName: "spi_status_logic.v"
    }
  ];

  const currentBlock = components.find(c => c.id === selectedBlock) || components[1];

  return (
    <div id="block-diagram-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Visual Block Diagram Interconnects */}
      <div className="lg:col-span-12 xl:col-span-8 bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="text-blue-600 h-5 w-5" />
            <h3 className="font-display font-medium text-lg text-gray-900">RTL Architectural Block Diagram</h3>
          </div>
          <p className="text-xs text-gray-500 font-sans">
            Click on any module to inspect port maps and access its Synthesizable Verilog
          </p>
        </div>

        {/* Master Top Frame */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/50 relative">
          <span className="absolute -top-3 left-4 bg-white border border-gray-200 text-[10px] uppercase font-mono px-2 py-0.5 rounded text-gray-500 font-bold">
            Module: spi_master_top
          </span>

          {/* System Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch relative min-h-[300px]">
            {components.map((c) => {
              const isSelected = selectedBlock === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedBlock(c.id)}
                  type="button"
                  className={`flex flex-col text-left p-4 rounded-lg border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-600 shadow-sm"
                      : "bg-white border-gray-250 border-gray-200 hover:border-gray-400 hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded border border-gray-255 border-gray-200">
                      {c.name}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-display text-sm font-semibold text-gray-900 mb-1">{c.title}</h4>
                  <p className="text-[11px] text-gray-500 flex-grow leading-relaxed">{c.description.slice(0, 95)}...</p>
                  
                  {/* Small Port counters info */}
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-[10px] font-mono text-gray-400">
                    <span>In: {c.inputs.length}</span>
                    <span>Out: {c.outputs.length}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Draw Routing Bus Wires Representation */}
          <div className="mt-6 bg-white rounded-lg p-3 border border-gray-200 grid grid-cols-2 md:grid-cols-6 gap-4 text-center items-center text-xs font-mono shadow-sm">
            <div className="flex flex-col border-r border-gray-100 last:border-0 px-2">
              <span className="text-gray-400 text-[9px] uppercase font-medium">CLK / RST_N</span>
              <span className="text-gray-800 font-semibold text-[11px]">Primary Inputs</span>
            </div>
            <div className="flex flex-col border-r border-gray-100 last:border-0 px-2">
              <span className="text-amber-600 text-[9px] uppercase font-medium">START / TX_DATA</span>
              <span className="text-gray-800 font-semibold text-[11px]">Command Bus</span>
            </div>
            <div className="flex flex-col border-r border-gray-100 last:border-0 px-2">
              <span className="text-teal-600 text-[9px] uppercase font-medium">SCLK SIGNAL</span>
              <span className="text-gray-800 font-semibold text-[11px]">{activeFsmState === FsmState.TRANSFER ? "Toggling" : "HeldCPOL"}</span>
            </div>
            <div className="flex flex-col border-r border-gray-100 last:border-0 px-2">
              <span className="text-indigo-600 text-[9px] uppercase font-medium">MOSI / MISO</span>
              <span className="text-gray-800 font-semibold text-[11px]">Physical Bus</span>
            </div>
            <div className="flex flex-col border-r border-gray-100 last:border-0 px-2">
              <span className="text-pink-600 text-[9px] uppercase font-medium">ACTIVE CS_N</span>
              <span className="text-gray-800 font-semibold text-[11px]">CS_N = {activeFsmState === FsmState.IDLE ? "1" : "0"}</span>
            </div>
            <div className="flex flex-col last:border-0 px-2">
              <span className="text-green-600 text-[9px] uppercase font-medium">BUSY / DONE</span>
              <span className="text-gray-800 font-semibold text-[11px]">System Status</span>
            </div>
          </div>
        </div>

        {/* FSM State Machine Progress Map */}
        <div className="mt-6 border border-gray-200 bg-gray-50/50 p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="text-amber-500 h-4 w-4" />
            <h4 className="font-display font-semibold text-sm text-gray-800">FSM State Transition Diagram Live Tracer</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            {/* IDLE state bubble */}
            <div className={`p-3 rounded-lg border text-center relative transition-all ${
              activeFsmState === FsmState.IDLE
                ? "bg-blue-50 border-blue-600 text-blue-700 font-bold ring-2 ring-blue-600/20"
                : "bg-white border-gray-200 text-gray-400"
            }`}>
              <span className="absolute top-1 left-2 text-[8px] font-mono text-gray-400">00</span>
              <div className="text-xs font-mono font-bold">IDLE</div>
              <div className="text-[9px] mt-1 leading-tight font-medium">Wait for start=1</div>
            </div>

            {/* LOAD state bubble */}
            <div className={`p-3 rounded-lg border text-center relative transition-all ${
              activeFsmState === FsmState.LOAD
                ? "bg-amber-50 border-amber-500 text-amber-700 font-bold ring-2 ring-amber-500/20"
                : "bg-white border-gray-200 text-gray-400"
            }`}>
              <span className="absolute top-1 left-2 text-[8px] font-mono text-gray-400">01</span>
              <div className="text-xs font-mono font-bold">LOAD</div>
              <div className="text-[9px] mt-1 leading-tight font-medium">Preload TX word</div>
            </div>

            {/* TRANSFER state bubble */}
            <div className={`p-3 rounded-lg border text-center relative transition-all ${
              activeFsmState === FsmState.TRANSFER
                ? "bg-teal-50 border-teal-500 text-teal-700 font-bold ring-2 ring-teal-500/20"
                : "bg-white border-gray-200 text-gray-400"
            }`}>
              <span className="absolute top-1 left-2 text-[8px] font-mono text-gray-400">10</span>
              <div className="text-xs font-mono font-bold">TRANSFER</div>
              <div className="text-[9px] mt-1 leading-tight font-medium">Shift TX / Sample MISO</div>
            </div>

            {/* COMPLETE state bubble */}
            <div className={`p-3 rounded-lg border text-center relative transition-all ${
              activeFsmState === FsmState.COMPLETE
                ? "bg-green-5 border-green-600 text-green-700 font-bold ring-2 ring-green-600/20 shadow-sm"
                : "bg-white border-gray-200 text-gray-400"
            }`} style={activeFsmState === FsmState.COMPLETE ? { backgroundColor: "#f0fdf4" } : {}}>
              <span className="absolute top-1 left-2 text-[8px] font-mono text-gray-400">11</span>
              <div className="text-xs font-mono font-bold">COMPLETE</div>
              <div className="text-[9px] mt-1 leading-tight font-medium font-sans">Done pulse & release</div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Block Sidebar Information & Port map */}
      <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6 font-sans">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col flex-grow shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-250 border-gray-200 text-gray-750">
            <Settings className="text-amber-500 h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-gray-700">Sub-Module Metadata Explorer</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 font-display mb-1 flex items-center justify-between">
            {currentBlock.title}
            <span className="text-[10px] uppercase font-mono bg-gray-50 text-blue-600 px-2 py-0.5 border border-gray-200 rounded font-bold">
              {currentBlock.fileName}
            </span>
          </h3>
          <p className="text-xs text-gray-500 font-sans leading-relaxed mb-4">
            {currentBlock.description}
          </p>

          {/* Port-Map Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg flex-grow border border-gray-200">
            <h4 className="text-xs font-mono tracking-widest text-gray-550 text-gray-500 uppercase mb-3 flex items-center gap-1.5 font-bold">
              <Activity className="h-3.5 w-3.5" />
              Pin Out Port maps
            </h4>

            <div className="space-y-4">
              {/* Inputs */}
              <div>
                <span className="text-[10px] text-amber-700 font-mono uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                  Input ports
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {currentBlock.inputs.map((inp) => (
                    <span
                      key={inp}
                      className="text-[11px] font-mono bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded shadow-sm"
                    >
                      {inp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Outputs */}
              <div>
                <span className="text-[10px] text-teal-700 font-mono uppercase bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-bold">
                  Output ports
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {currentBlock.outputs.map((out) => (
                    <span
                      key={out}
                      className="text-[11px] font-mono bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded shadow-sm"
                    >
                      {out}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Load Code button */}
          <button
            onClick={() => onSelectComponentCode(currentBlock.fileName)}
            type="button"
            className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            Load Synthesizable RTL Verilog
          </button>
        </div>
      </div>
    </div>
  );
}
