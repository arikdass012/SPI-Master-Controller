/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Play, RotateCcw, Sliders, ChevronRight, Hash, Copy, Check } from "lucide-react";

interface FPGABoardProps {
  txPayload: string; // 8-bit binary string e.g. "10100101"
  rxPayload: string; // 8-bit binary string
  isBusy: boolean;
  isDone: boolean;
  onToggleSwitch: (index: number) => void;
  onTriggerStart: () => void;
  onResetBoard: () => void;
}

export default function FPGABoard({
  txPayload,
  rxPayload,
  isBusy,
  isDone,
  onToggleSwitch,
  onTriggerStart,
  onResetBoard
}: FPGABoardProps) {
  const [copied, setCopied] = React.useState(false);

  const xdcText = `## Basys 3 Pin Constraints for SPI Controller
set_property PACKAGE_PIN W5 [get_ports clk]							
set_property IOSTANDARD LVCMOS33 [get_ports clk]

set_property PACKAGE_PIN U18 [get_ports rst_n]						
set_property IOSTANDARD LVCMOS33 [get_ports rst_n]

set_property PACKAGE_PIN U17 [get_ports start]						
set_property IOSTANDARD LVCMOS33 [get_ports start]`;

  const handleCopyXDC = () => {
    navigator.clipboard.writeText(xdcText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="fpga-board-wrapper" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* 3D-Like Flat Vector FPGA PCB */}
      <div className="lg:col-span-12 xl:col-span-8 bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
        
        {/* Header decoration */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-display font-semibold text-gray-900 text-lg">
              Digilent Basys-3 FPGA Prototype Board
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 uppercase font-bold">
            Artix-7 XC7A35T
          </span>
        </div>

        {/* PCB Board Frame (Keep high-fidelity green solder mask look for authentic Hardware aesthetic!) */}
        <div className="relative bg-[#165a39] border-4 border-[#0f3f27] rounded-xl p-6 shadow-lg mb-6 select-none flex-grow flex flex-col justify-between min-h-[340px]">
          
          {/* Silkscreen text decorations */}
          <div className="absolute top-2 left-4 text-[#ffffff80] uppercase text-[9px] font-mono font-bold tracking-wider">
            MAKE IN INDIA
          </div>
          <div className="absolute top-2 right-4 text-[#ffffff80] uppercase text-[9px] font-mono font-bold tracking-wider">
            REV_C INVENT_ARIK
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-grow py-4">
            
            {/* FPGA Target Processor chip in center */}
            <div className="md:col-span-4 flex flex-col items-center justify-center">
              <div className="w-28 h-28 bg-stone-800 border-4 border-stone-700 shadow-xl rounded flex flex-col items-center justify-center relative p-3 text-center">
                {/* Pins outline */}
                <div className="absolute inset-0.5 border border-stone-600 border-dashed" />
                <span className="text-white text-xs font-mono font-bold tracking-widest z-10 uppercase">
                  XILINX
                </span>
                <span className="text-[8px] text-zinc-400 font-mono z-10 mt-1 uppercase">
                  Artix-7
                </span>
                <span className="text-[7px] text-zinc-500 font-mono z-10">
                  XC7A35T
                </span>
                {/* Visual heat sync grids */}
                <div className="absolute bottom-1.5 w-full flex justify-center gap-1 opacity-20">
                  <span className="w-1.5 h-1.5 bg-slate-300" />
                  <span className="w-1.5 h-1.5 bg-slate-300" />
                  <span className="w-1.5 h-1.5 bg-slate-300" />
                </div>
              </div>
            </div>

            {/* PMOD Header Pins and Clock Oscillators */}
            <div className="md:col-span-8 grid grid-cols-2 gap-4">
              
              {/* Host Control Pmod Map */}
              <div className="bg-white/10 backdrop-blur-sm rounded p-3 border border-white/20 text-[10px] font-mono">
                <div className="text-white border-b border-white/15 pb-1.5 mb-2 font-bold uppercase">
                  PMOD JA1 Header Pinouts
                </div>
                <div className="space-y-1 text-emerald-100 font-bold">
                  <div className="flex justify-between">
                    <span>Pin 1 (CS_N):</span>
                    <span className="text-rose-300 font-bold">{isBusy ? "LOW (0)" : "HIGH (1)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pin 2 (MOSI):</span>
                    <span className="text-blue-300 font-bold">Pin L2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pin 3 (MISO):</span>
                    <span className="text-pink-300 font-bold">Pin J2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pin 4 (SCLK):</span>
                    <span className="text-teal-300 font-bold">Pin G2</span>
                  </div>
                </div>
              </div>

              {/* Status and Active Diagnostic Displays */}
              <div className="bg-white/10 backdrop-blur-sm rounded p-3 border border-white/20 flex flex-col justify-between text-[10px] font-mono">
                <div>
                  <div className="text-white border-b border-white/15 pb-1.5 mb-2 font-bold uppercase">
                    7-Segment Display
                  </div>
                  {/* Digital glowing readout */}
                  <div className="flex justify-center my-1 bg-black/45 p-1.5 rounded border border-black/60 shadow-inner">
                    <span className="text-red-500 text-lg font-bold tracking-widest font-mono select-none" style={{ textShadow: "0 0 6px rgba(239, 68, 68, 0.75)" }}>
                      {isBusy ? "BUSY" : `RX:${parseInt(rxPayload, 2).toString(16).toUpperCase().padStart(2, "0")}`}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* User Interfaces on the board: LEDs & Switches bottom section */}
          <div className="border-t border-[#ffffff15] mt-4 pt-4">
            
            {/* Glowing Outputs LED Array */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#ffffff60] font-mono text-[9px] uppercase font-bold">
                RX_DATA LEDs [7:0]
              </span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 font-mono text-[9px] text-[#ffffff80] font-bold">
                  <span className={`w-2 h-2 rounded-full ${isBusy ? "bg-red-500 animate-pulse" : "bg-red-950"}`} style={isBusy ? { boxShadow: "0 0 6px #ef4444" } : {}} />
                  BUSY
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px] text-[#ffffff80] font-bold">
                  <span className={`w-2 h-2 rounded-full ${isDone ? "bg-green-500" : "bg-green-950"}`} style={isDone ? { boxShadow: "0 0 6px #22c55e" } : {}} />
                  DONE
                </span>
              </div>
            </div>

            {/* Glowing output LED dots representing rxPayload */}
            <div className="flex justify-between gap-2 bg-white/10 p-2.5 rounded border border-white/20 mb-4 px-4 shadow-inner">
              {Array.from({ length: 8 }).map((_, idx) => {
                const bitIdx = 7 - idx;
                const isActive = rxPayload[bitIdx] === "1";
                return (
                  <div key={`led-${bitIdx}`} className="flex flex-col items-center gap-1.5">
                    <div 
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        isActive 
                          ? "bg-green-400 border border-green-200" 
                          : "bg-green-950 border border-emerald-900/40"
                      }`}
                      style={isActive ? { boxShadow: "0 0 8px 3px rgba(34, 197, 94, 0.75)" } : {}}
                    />
                    <span className="text-[#ffffff50] text-[8px] font-mono font-bold">LD{bitIdx}</span>
                  </div>
                );
              })}
            </div>

            {/* Layout and Slide Switches mapping in horizontal rail */}
            <div className="flex justify-between items-center text-[#ffffff70] font-mono text-[9px] uppercase mb-2 font-bold">
              <span>TX_DATA Slide Switches [7:0]</span>
              <span className="text-[#ffffff90] font-bold">
                HEX Payload: 0x{parseInt(txPayload, 2).toString(16).toUpperCase().padStart(2, "0")}
              </span>
            </div>

            {/* Switches mapping */}
            <div className="flex justify-between gap-2 bg-white/10 p-3 rounded border border-white/20 px-4 shadow-inner">
              {Array.from({ length: 8 }).map((_, idx) => {
                const bitIdx = 7 - idx;
                const isSwitchedOn = txPayload[bitIdx] === "1";
                return (
                  <div key={`sw-${bitIdx}`} className="flex flex-col items-center gap-1.5">
                    {/* Visual Slide Switch Handle container */}
                    <button 
                      onClick={() => onToggleSwitch(bitIdx)}
                      type="button"
                      className="w-5 h-9 bg-zinc-800 rounded border border-zinc-750 border-zinc-700 relative p-0.5 cursor-pointer hover:border-zinc-500"
                    >
                      {/* Active switch sliding knob */}
                      <div 
                        className={`w-3.5 h-4.5 rounded shadow transition-all duration-200 ${
                          isSwitchedOn 
                            ? "bg-zinc-200 -translate-y-px" 
                            : "bg-zinc-950 translate-y-3 border border-zinc-850"
                        }`}
                      />
                    </button>
                    <span className="text-[#ffffff40] text-[8px] font-mono font-bold">SW{bitIdx}</span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Action Board Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
          <div className="flex items-center gap-3">
            <button
              onClick={onTriggerStart}
              disabled={isBusy}
              type="button"
              className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                isBusy
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 border-blue-600 hover:bg-blue-750 text-white hover:bg-blue-700"
              }`}
            >
              <Play className="h-4 w-4" />
              Pulse Start Button
            </button>
            <button
              onClick={onResetBoard}
              type="button"
              className="flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Power Reset Board
            </button>
          </div>
          <p className="text-[10px] font-mono text-gray-500 max-w-xs text-right leading-normal hidden md:block font-medium">
            Power resetting the board reloads the 100MHz master logic oscillator and pulls system asynchronous reset lines active-low.
          </p>
        </div>
      </div>

      {/* Constraints and Pinout constraint detailer sheet */}
      <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6 font-sans">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col flex-grow shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-1.5 text-gray-800">
              <Sliders className="text-blue-600 h-4 w-4" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold">
                Pin Constraint Map (.xdc)
              </span>
            </div>
            <button 
              onClick={handleCopyXDC}
              type="button"
              className="p-1 px-1.5 rounded bg-white border border-gray-300 hover:border-gray-400 text-[10px] font-mono text-gray-650 hover:text-gray-900 flex items-center gap-1 cursor-pointer transition-all shadow-sm font-bold"
            >
              {copied ? <Check className="h-3 w-3 text-green-650" /> : <Copy className="h-3 w-3 text-gray-500" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
            The Physical constraint file mappings bind synthesizable HDL ports to physical pins on the Artix-7 chip.
          </p>

          <pre className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-[10px] font-mono text-gray-750 overflow-x-auto leading-relaxed flex-grow shadow-inner">
{`## ========================================
## Master Clock Pin (W5)
## ========================================
set_property PACKAGE_PIN W5 [get_ports clk]
set_property IOSTANDARD LVCMOS33 [get_ports clk]

## ========================================
## Slide Switches mapped to Input Ports
## ========================================
set_property PACKAGE_PIN V17 [get_ports {tx_data[0]}]
set_property PACKAGE_PIN V16 [get_ports {tx_data[1]}]
set_property PACKAGE_PIN W16 [get_ports {tx_data[2]}]
set_property PACKAGE_PIN W17 [get_ports {tx_data[3]}]
set_property PACKAGE_PIN W15 [get_ports {tx_data[4]}]
set_property PACKAGE_PIN V15 [get_ports {tx_data[5]}]
set_property PACKAGE_PIN W14 [get_ports {tx_data[6]}]
set_property PACKAGE_PIN W13 [get_ports {tx_data[7]}]

## ========================================
## Physical Outputs representing LED banks
## ========================================
set_property PACKAGE_PIN U16 [get_ports {rx_data[0]}]
set_property PACKAGE_PIN E19 [get_ports {rx_data[1]}]
set_property PACKAGE_PIN U19 [get_ports {rx_data[2]}]
set_property PACKAGE_PIN V19 [get_ports {rx_data[3]}]`}
          </pre>

          <div className="mt-4 pt-4 border-t border-gray-200 text-[11px] font-sans text-gray-500 space-y-1.5">
            <span className="font-mono text-[9px] uppercase text-amber-600 font-bold tracking-widest block mb-1">
              Verification Self Check Report
            </span>
            <div className="flex justify-between font-medium">
              <span>Timing Constraints Met:</span>
              <span className="text-green-600 font-bold">100.0% Pass</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Voltage Standards Verified:</span>
              <span className="text-green-600 font-bold">Yes, LVCMOS33</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
