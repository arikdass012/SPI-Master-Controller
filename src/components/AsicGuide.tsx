/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, Zap, Info, Play, ToggleLeft, Layers, VolumeX, Eye } from "lucide-react";

export default function AsicGuide() {
  const [asyncReset, setAsyncReset] = useState<boolean>(true); // Asymmetric reset button state
  const [clockStep, setClockStep] = useState<number>(0); // Clock pulses step

  // Reset synchronizer stages
  const rst_n_raw = asyncReset ? 0 : 1;
  const sync_stage_1 = rst_n_raw;
  const sync_stage_2 = clockStep >= 1 ? sync_stage_1 : 0;
  
  const handleClkTick = () => {
    setClockStep(prev => (prev + 1) % 3);
  };

  return (
    <div id="asic-guide-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Structural ASIC Considerations Card */}
      <div className="lg:col-span-12 xl:col-span-7 bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <Layers className="text-blue-600 h-5 w-5" />
            <h3 className="font-display font-semibold text-gray-900 text-lg">
              ASIC Production Tape-Out Enhancements
            </h3>
          </div>

          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Transitioning RTL from FPGA target prototypes to true nanometer silicon wafers requires meeting rigorous manufacturing and layout paradigms. Here is how our SPI Master controller integrates ASIC readiness:
          </p>

          <div className="space-y-5">
            {/* 1. CDC and Reset Synchronizers */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 leading-relaxed text-gray-600 text-xs">
              <h4 className="font-display text-sm font-bold text-gray-950 text-gray-900 mb-2 flex items-center justify-between">
                <span>1. Clock Domain Crossing & Reset Recovery</span>
                <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">Recovery Margins</span>
              </h4>
              <p className="mb-2">
                Asynchronous resets crossing randomly outside clock boundaries trigger fatal setup/hold logic violations inside state flip-flops, collapsing registers into metastable, half-voltage oscillations.
              </p>
              <p>
                <strong>The Solution:</strong> Deploy a <strong>Dual-Rank Recovery Synchronizer</strong>. Reset is asserted asynchronously to dump logic states instantly under emergencies, but is deasserted (released) on standard rising clock edges across two serial flip-flops, ensuring predictable recovery.
              </p>
            </div>

            {/* 2. Low-Power Clock Gating */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 leading-relaxed text-gray-600 text-xs">
              <h4 className="font-display text-sm font-bold text-gray-950 text-gray-900 mb-2 flex items-center justify-between">
                <span>2. Integrated Clock Gating (ICG) Cells</span>
                <span className="text-[10px] text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">Save up to 60% dynamic power</span>
              </h4>
              <p className="mb-2">
                Standard clock trees represent the highest source of dynamic power consumption, charging node parasitics continuously even when registers (like our SPI TX Buffers) are idle in safe states.
              </p>
              <p>
                <strong>The Solution:</strong> Synthesis tools insert <strong>Integrated Clock Gating (ICG)</strong> cells containing a negative-edge latch paired with an AND gate. This shuts down clock toggles directly at the trunk when FSM is in <code>IDLE</code>.
              </p>
            </div>

            {/* 3. DFT & Scan Chains */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 leading-relaxed text-gray-600 text-xs">
              <h4 className="font-display text-sm font-bold text-gray-950 text-gray-900 mb-2 flex items-center justify-between">
                <span>3. Design for Testability (DFT) Scan Chains</span>
                <span className="text-[10px] text-pink-700 font-mono bg-pink-50 px-2 py-0.5 rounded border border-pink-200 font-bold">99.8% Test Coverage</span>
              </h4>
              <p className="mb-2">
                Physical defects (like bridges or open vias) occur in deep manufacturing. Millions of sub-micron gates inside wafers are untestable without dedicated design patterns.
              </p>
              <p>
                <strong>The Solution:</strong> Design flip-flops with a multiplexed <code>Scan-Enable (SE)</code> selector. In Test Mode, all registers connect in serial pipelines forming <strong>Scan Chains</strong> to shift test patterns directly for structural validation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Reset Synchronizer Simulator */}
      <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between h-full shadow-sm">
          
          <div>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 text-gray-800">
              <ShieldCheck className="text-green-600 h-4.5 w-4.5" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold">
                Interactive Dual-Rank Synchronizer Circuit
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Toggle the Raw Asynchronous Reset line below or tap the Clock step button to see how metastability-safe deassertion propagation matches clock limits.
            </p>

            {/* Circuit Vector Schematics */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4 text-center select-none shadow-inner">
              
              <div className="flex justify-around items-center py-6 min-h-[140px] relative">
                
                {/* Asynchronous Reset lines */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-gray-400 mb-1.5 font-bold">Async Input</span>
                  <button 
                    onClick={() => {
                      setAsyncReset(!asyncReset);
                      if (asyncReset) setClockStep(0);
                    }}
                    type="button"
                    className={`p-2 rounded font-mono text-xs font-bold border cursor-pointer select-none px-3 transition-all ${
                      asyncReset 
                        ? "bg-red-50 border-red-500 text-red-650" 
                        : "bg-white border-gray-300 text-gray-500"
                    }`}
                  >
                    RST_N_RAW = {rst_n_raw}
                  </button>
                </div>

                <div className="text-gray-400 font-bold">➔</div>

                {/* Flip Flop Rank 1 */}
                <div className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded relative shadow-sm">
                  <span className="absolute -top-3 bg-gray-50 text-[8px] font-mono text-gray-400 px-1 border border-gray-100 rounded">DFF RANK 1</span>
                  <span className="text-xs text-gray-800 font-mono font-bold">Q1 = {sync_stage_1}</span>
                  <span className="text-[8px] text-gray-400 font-mono mt-1 font-bold">Clock Deassert Rank</span>
                </div>

                <div className="text-gray-400 font-bold">➔</div>

                {/* Flip Flop Rank 2 */}
                <div className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded relative shadow-sm">
                  <span className="absolute -top-3 bg-gray-50 text-[8px] font-mono text-gray-400 px-1 border border-gray-100 rounded">DFF RANK 2</span>
                  <span className="text-xs text-gray-800 font-mono font-bold">Q2 (Sync) = {sync_stage_2}</span>
                  <span className="text-[8px] text-gray-400 font-mono mt-1 font-bold">Synchronized Reset</span>
                </div>

              </div>

              {/* Status block */}
              <div className="border-t border-gray-200 pt-3 flex justify-between text-xs font-mono">
                <span className="text-gray-400 font-bold">System clock transitions:</span>
                <span className="text-gray-700 font-bold">{clockStep} cycles</span>
              </div>
            </div>

            {/* Instruction Panel */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-[11px] font-sans text-gray-500 leading-normal space-y-2">
              <span className="font-mono text-[9px] uppercase text-amber-700 font-bold tracking-widest block flex items-center gap-1">
                <Info className="h-3 w-3" />
                Step-by-Step Recovery Logic
              </span>
              <p>
                1. Click <strong>RST_N_RAW</strong> to set it to 1 (releasing reset). Note that the synchronized reset <strong>Q2</strong> does not immediately clear.
              </p>
              <p>
                2. Click the <strong>Pulse System Clock</strong> button below sequentially. Note how the high input level propagates through Rank 1, then Rank 2, releasing safe synchronization!
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-200">
            <button
              onClick={handleClkTick}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Play className="h-3.5 w-3.5 text-white" />
              Pulse System Clock
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
