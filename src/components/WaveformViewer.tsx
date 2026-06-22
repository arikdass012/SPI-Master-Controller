/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from "react";
import { SimulationStep } from "../types";
import { Clock, Eye, Sliders, ChevronRight } from "lucide-react";

interface WaveformViewerProps {
  steps: SimulationStep[];
  currentStepIndex: number;
  onSelectStepIndex: (index: number) => void;
}

export default function WaveformViewer({ steps, currentStepIndex, onSelectStepIndex }: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll waveform container to keep the active cursor centered
  useEffect(() => {
    if (containerRef.current) {
      const activeElement = containerRef.current.querySelector("[data-active-cursor='true']");
      if (activeElement) {
        const rect = activeElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const offset = rect.left - containerRect.left - containerRect.width / 2;
        containerRef.current.scrollBy({ left: offset, behavior: "smooth" });
      }
    }
  }, [currentStepIndex]);

  if (steps.length === 0) {
    return (
      <div className="bg-white border border-gray-200 text-center p-8 rounded-xl text-gray-500 font-sans shadow-sm">
        No active simulation. Trigger a transaction to render waveforms.
      </div>
    );
  }

  // Waveform drawing dimensions
  const stepWidth = 36; // Width per clock cycle ticks
  const heightPerRow = 45; // Height of each signal line
  const paddingLeft = 110; // Left margin label gutter
  const paddingRight = 30; // Right margin offset
  const textOffset = 15; // Vertical label alignment

  const signals = [
    { label: "CS_N", key: "cs_n" as keyof SimulationStep, color: "#e11d48" }, // Red-600
    { label: "SCLK", key: "sclk" as keyof SimulationStep, color: "#0db7af" }, // Teal-600
    { label: "MOSI", key: "mosi" as keyof SimulationStep, color: "#2563eb" }, // Blue-600
    { label: "MISO", key: "miso" as keyof SimulationStep, color: "#db2777" }, // Pink-600
    { label: "BUSY", key: "busy" as keyof SimulationStep, color: "#d97706" }, // Amber-600
    { label: "DONE", key: "done" as keyof SimulationStep, color: "#16a34a" }  // Green-600
  ];

  const totalWidth = paddingLeft + (steps.length * stepWidth) + paddingRight;
  const svgHeight = (signals.length * heightPerRow) + 60; // Extra room for time axis & state registers

  // Construct binary waveforms
  const drawWavePath = (sigKey: keyof SimulationStep, rowIdx: number) => {
    const baseY = 50 + (rowIdx * heightPerRow) + 30; // base y coordinate for logic '0'
    const highY = baseY - heightPerRow + 16; // y coordinate for logic '1'
    let pathStr = "";

    steps.forEach((step, idx) => {
      const xStart = paddingLeft + (idx * stepWidth);
      const xEnd = xStart + stepWidth;
      const val = step[sigKey] as number;
      const yVal = val === 1 ? highY : baseY;

      if (idx === 0) {
        pathStr = `M ${xStart} ${yVal} L ${xEnd} ${yVal}`;
      } else {
        const prevVal = steps[idx - 1][sigKey] as number;
        if (prevVal !== val) {
          // If level changed, draw vertical transient line first
          pathStr += ` V ${yVal} L ${xEnd} ${yVal}`;
        } else {
          pathStr += ` L ${xEnd} ${yVal}`;
        }
      }
    });

    return pathStr;
  };

  return (
    <div id="waveform-viewer-wrapper" className="bg-white border border-gray-200 rounded-xl p-5 overflow-hidden flex flex-col shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-gray-150 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600 h-5 w-5" />
          <div>
            <h3 className="font-display font-medium text-lg text-gray-900">Live SVG wave trace (Timing Diagram)</h3>
            <p className="text-xs text-gray-500">Click anywhere inside the timeline to inspect individual cycles</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] font-mono select-none text-gray-600 font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#e11d48] rounded--sm" style={{ backgroundColor: "#e11d48" }} /> CS_N</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#0db7af] rounded--sm" style={{ backgroundColor: "#0db7af" }} /> SCLK</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#2563eb] rounded--sm" style={{ backgroundColor: "#2563eb" }} /> MOSI</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#db2777] rounded--sm" style={{ backgroundColor: "#db2777" }} /> MISO</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#d97706] rounded--sm" style={{ backgroundColor: "#d97706" }} /> BUSY</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#16a34a] rounded--sm" style={{ backgroundColor: "#16a34a" }} /> DONE</span>
        </div>
      </div>

      {/* Waveform Scroller Container */}
      <div 
        ref={containerRef}
        className="overflow-x-auto overflow-y-hidden border border-gray-200 bg-slate-50 rounded-xl scrollbar-gutter-stable cursor-crosshair select-none relative"
      >
        <svg 
          width={totalWidth} 
          height={svgHeight} 
          className="font-mono text-[10px]"
        >
          {/* Subtle horizontal signal guidelines */}
          {signals.map((sig, rIdx) => {
            const baseY = 50 + (rIdx * heightPerRow) + 30;
            return (
              <line 
                key={`grid-h-${sig.label}`}
                x1={paddingLeft} 
                y1={baseY} 
                x2={totalWidth - paddingRight} 
                y2={baseY} 
                stroke="#e2e8f0" 
                strokeWidth="1" 
                strokeDasharray="4,4" 
              />
            );
          })}

          {/* Draw Grid Ticks and Ticks label */}
          {steps.map((_, idx) => {
            const x = paddingLeft + (idx * stepWidth);
            const isLabelTick = idx % 5 === 0;
            return (
              <g key={`grid-v-${idx}`}>
                {/* Vertical tick line */}
                <line 
                  x1={x} 
                  y1={45} 
                  x2={x} 
                  y2={svgHeight - 15} 
                  stroke={isLabelTick ? "#cbd5e1" : "#e2e8f0"} 
                  strokeWidth="1" 
                />
                
                {/* Tick label at the top */}
                {isLabelTick && (
                  <text 
                    x={x} 
                    y={32} 
                    fill="#475569" 
                    textAnchor="middle" 
                    className="font-semibold text-[9px]"
                  >
                    T{idx}
                  </text>
                )}
              </g>
            );
          })}

          {/* Left Signal Labels Sidebar overlay */}
          <rect 
            x={0} 
            y={0} 
            width={paddingLeft - 5} 
            height={svgHeight} 
            fill="#ffffff" 
            opacity="0.95" 
          />
          <line 
            x1={paddingLeft - 5} 
            y1={0} 
            x2={paddingLeft - 5} 
            y2={svgHeight} 
            stroke="#cbd5e1" 
            strokeWidth="1.5" 
          />

          {/* Render Signal Labels and States */}
          {signals.map((sig, rIdx) => {
            const baseY = 50 + (rIdx * heightPerRow) + 30;
            const stepVal = steps[currentStepIndex]?.[sig.key];
            return (
              <g key={`label-${sig.label}`}>
                <text 
                  x={15} 
                  y={baseY - heightPerRow/2 + 6} 
                  fill="#475569" 
                  className="font-bold text-xs"
                >
                  {sig.label}
                </text>
                
                {/* Active digital bus level value status */}
                <text 
                  x={75} 
                  y={baseY - heightPerRow/2 + 6} 
                  fill={sig.color} 
                  className="font-bold font-mono text-xs"
                >
                  {stepVal}
                </text>
              </g>
            );
          })}

          {/* Render Vector Paths */}
          {signals.map((sig, rIdx) => (
            <path 
              key={`wave-${sig.label}`}
              d={drawWavePath(sig.key, rIdx)} 
              fill="none" 
              stroke={sig.color} 
              strokeWidth="2" 
              className="transition-all duration-300"
            />
          ))}

          {/* FSM State Trace indicator row at bottom of Waveform inside SVG */}
          <g transform={`translate(0, ${svgHeight - 20})`}>
            <text x={15} y={0} fill="#475569" className="font-bold text-[10px] uppercase">State Trace</text>
            {steps.map((step, idx) => {
              const xStart = paddingLeft + (idx * stepWidth);
              const xEnd = xStart + stepWidth;
              const isActive = idx === currentStepIndex;
              return (
                <rect 
                  key={`state-box-${idx}`}
                  x={xStart} 
                  y={-12} 
                  width={stepWidth} 
                  height={15} 
                  fill={isActive ? "#2563eb" : "#f1f5f9"} 
                  stroke="#cbd5e1" 
                  onClick={() => onSelectStepIndex(idx)}
                  className="cursor-pointer hover:opacity-80"
                />
              );
            })}
            
            {/* Overlay register text inside timeline */}
            {steps.map((step, idx) => {
              const xCenter = paddingLeft + (idx * stepWidth) + stepWidth / 2;
              const isFirstStateOfStretch = idx === 0 || steps[idx-1].fsm_state !== step.fsm_state;
              const isCurrent = idx === currentStepIndex;
              if (isFirstStateOfStretch || idx % 4 === 0) {
                return (
                  <text 
                    key={`state-text-${idx}`}
                    x={xCenter} 
                    y={-1} 
                    fill={isCurrent ? "#ffffff" : "#475569"} 
                    textAnchor="middle" 
                    className="text-[8px] select-none pointer-events-none font-bold"
                  >
                    {step.fsm_state.slice(0, 4)}
                  </text>
                );
              }
              return null;
            })}
          </g>

          {/* Interactive vertical timeline scrubber curtain and highlights */}
          {steps.map((_, idx) => {
            const x = paddingLeft + (idx * stepWidth);
            const isActive = idx === currentStepIndex;
            return (
              <rect 
                key={`scrub-${idx}`}
                x={x} 
                y={40} 
                width={stepWidth} 
                height={svgHeight - 55} 
                fill={isActive ? "rgba(37, 99, 235, 0.06)" : "transparent"} 
                stroke={isActive ? "rgba(37, 99, 235, 0.25)" : "none"} 
                onClick={() => onSelectStepIndex(idx)}
                className="cursor-pointer hover:bg-blue-100/30"
                {...(isActive ? { "data-active-cursor": "true" } : {})}
              />
            );
          })}

          {/* Active timeline vertical indicator cursor needle */}
          {(() => {
            const activeX = paddingLeft + (currentStepIndex * stepWidth) + (stepWidth / 2);
            return (
              <g className="pointer-events-none">
                <line 
                  x1={activeX} 
                  y1={40} 
                  x2={activeX} 
                  y2={svgHeight - 15} 
                  stroke="#ef4444" 
                  strokeWidth="1.5" 
                  strokeDasharray="2,2" 
                />
                <circle cx={activeX} cy={40} r="3" fill="#ef4444" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Narrative comments below waveform */}
      <div className="mt-4 bg-gray-50 p-4 border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-mono tracking-widest text-gray-500 font-bold flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-amber-500" />
            Active Step Narrative Log (Time: {currentStepIndex * 10} ns)
          </span>
          <span className="text-[10px] uppercase font-mono bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-bold">
            FSM State: {steps[currentStepIndex]?.fsm_state}
          </span>
        </div>
        <p className="text-sm font-sans text-gray-800 leading-relaxed bg-white p-3 rounded border border-gray-200 flex items-start gap-2">
          <ChevronRight className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <span>{steps[currentStepIndex]?.comment}</span>
        </p>

        {/* Diagnostic Register contents at current step */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="bg-white p-2.5 rounded border border-gray-200 flex justify-between items-center text-xs font-mono text-gray-700">
            <span className="text-gray-500">TX Shift Register [tx_reg]:</span>
            <span className="text-blue-600 font-semibold text-sm">{steps[currentStepIndex]?.tx_reg}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-gray-200 flex justify-between items-center text-xs font-mono text-gray-700">
            <span className="text-gray-500">RX Shift Register [rx_reg]:</span>
            <span className="text-pink-600 font-semibold text-sm">{steps[currentStepIndex]?.rx_reg}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
