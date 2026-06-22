/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TrendingUp, ShieldAlert, Cpu, Award, Zap, Grid, BookOpen, AlertCircle } from "lucide-react";

interface SynthesisReport {
  target: string;
  clockPeriod: number; // ns
  wns: number; // Worst Negative Slack in ns
  whs: number; // Worst Hold Slack in ns
  tns: number; // Total Negative Slack in ns
  fMax: number; // MHz
  lutsUsed: number;
  ffsUsed: number;
  cellsCount: number; // gates
  area: number; // um^2
  power: number; // mW
  criticalPath: {
    start: string;
    end: string;
    path: { node: string; type: string; delay: number; total: number; comment: string }[];
  };
}

const reports: { [key: string]: SynthesisReport } = {
  "artix_7": {
    target: "FPGA: Xilinx Artix-7 XC7A35T-1CPG236C (100 MHz)",
    clockPeriod: 10.0,
    wns: 4.85,
    whs: 0.12,
    tns: 0.0,
    fMax: 194.17, // 1 / (10 - 4.85) = 1 / 5.15 = 194 MHz
    lutsUsed: 64,
    ffsUsed: 52,
    cellsCount: 116,
    area: 0.0, // N/A for FPGA LUTs
    power: 14.5,
    criticalPath: {
      start: "u_clk_div/timer_cnt_reg[1]/C",
      end: "u_fsm_ctrl/current_state_reg[1]/D",
      path: [
        { node: "sys_clk_pin", type: "Constraint", delay: 0.0, total: 0.0, comment: "Main 100MHz clock rising edge" },
        { node: "u_clk_div/timer_cnt_reg[1]/CK", type: "Register", delay: 0.45, total: 0.45, comment: "Clock-to-Q delay of timer register step" },
        { node: "u_clk_div/timer_cnt_reg[1]/Q", type: "Net", delay: 0.52, total: 0.97, comment: "Routing delay on physical net" },
        { node: "u_clk_div/u_lut_div_limit/O", type: "LUT", delay: 0.12, total: 1.09, comment: "Decoding division rate parameters" },
        { node: "u_clk_div/sclk_pulse_i_2/O", type: "LUT", delay: 0.12, total: 1.21, comment: "FSM state check combinational gate" },
        { node: "u_fsm_ctrl/pulse_cnt[5]_i_4/O", type: "LUT", delay: 0.15, total: 1.36, comment: "Clock division pulse width comparator logic" },
        { node: "u_fsm_ctrl/current_state[1]_i_1/O", type: "LUT", delay: 0.12, total: 1.48, comment: "FSM state selection multiplexer routing" },
        { node: "u_fsm_ctrl/current_state_reg[1]/D", type: "Setup Setup time", delay: 0.05, total: 1.53, comment: "Synchronous storage register setup threshold" }
      ]
    }
  },
  "tsmc_45nm_std": {
    target: "ASIC: TSMC 45nm Standard CMOS Cell Library (500 MHz)",
    clockPeriod: 2.0,
    wns: 0.82,
    whs: 0.04,
    tns: 0.0,
    fMax: 847.45, // 1 / (2 - 0.82) = 1 / 1.18 = 847 MHz
    lutsUsed: 0,
    ffsUsed: 44,
    cellsCount: 184,
    area: 942.50, // sq micrometers
    power: 2.85, // mW
    criticalPath: {
      start: "u_shift_reg/tx_reg_reg[7]/CK",
      end: "u_shift_reg/rx_reg_reg[0]/D",
      path: [
        { node: "clk", type: "Clock Arrival", delay: 0.0, total: 0.0, comment: "ASIC CTS (Clock Tree Synthesis) network delay" },
        { node: "u_shift_reg/tx_reg_reg[7]/Q", type: "DFF_X1 (FF)", delay: 0.16, total: 0.16, comment: "TSMC flip-flop clock-to-Q standard output" },
        { node: "u_shift_reg/mosi_net", type: "Wire Delay", delay: 0.08, total: 0.24, comment: "ASIC metal layer resistance load skew" },
        { node: "u_shift_reg/mosi_pad_buffer_O", type: "BUF_X4 (Gate)", delay: 0.06, total: 0.30, comment: "Pad ring high-drive output driver gate" },
        { node: "u_shift_reg/rx_reg_mux_I4", type: "AOI21_X1 (Gate)", delay: 0.09, total: 0.39, comment: "Mux gate routing MISO serial streams" },
        { node: "u_shift_reg/rx_reg_reg[0]/D", type: "DFF_X1 Setup", delay: 0.03, total: 0.42, comment: "Standard storage gate setup limit met" }
      ]
    }
  },
  "tsmc_28nm_extreme": {
    target: "ASIC: TSMC 28nm High-Performance Cell Library (1.5 GHz)",
    clockPeriod: 0.66, // 1.5 GHz period = 0.66 ns
    wns: -0.14, // Worst Negative Slack is negative! Timing Violation Example!
    whs: 0.02,
    tns: -1.35,
    fMax: 1250.0, // Fmax is only 1.25GHz, so we have a violation at 1.5GHz
    lutsUsed: 0,
    ffsUsed: 52,
    cellsCount: 210,
    area: 620.40,
    power: 7.20,
    criticalPath: {
      start: "u_fsm_ctrl/bit_cnt_reg[0]/CK",
      end: "u_shift_reg/mosi_reg/D",
      path: [
        { node: "clk_cts_extreme", type: "CTS Arrival Clock", delay: 0.0, total: 0.0, comment: "Clock Tree jitter skew arrival" },
        { node: "u_fsm_ctrl/bit_cnt_reg[0]/Q", type: "DFF_X1", delay: 0.11, total: 0.11, comment: "Transition from bit counter state register" },
        { node: "u_fsm_ctrl/bit_cnt_logic_O", type: "NAND3_X1", delay: 0.14, total: 0.25, comment: "High fanout decoding routing delay" },
        { node: "u_fsm_ctrl/mux_bit_limit_O", type: "XOR2_X1", delay: 0.13, total: 0.38, comment: "Bit boundary count gating logic skew" },
        { node: "u_shift_reg/reg_load_sel_O", type: "MUX2_X1", delay: 0.24, total: 0.62, comment: "High density routing cell delay" },
        { node: "u_shift_reg/mosi_reg/D", type: "DFF_X1 Setup Required", delay: 0.18, total: 0.80, comment: "Setup time requirement violated by 0.14 ns! Limit is exceed." }
      ]
    }
  }
};

export default function TimingReports() {
  const [selectedLib, setSelectedLib] = useState<string>("artix_7");
  const rep = reports[selectedLib];

  const wnsViolated = rep.wns < 0;

  return (
    <div id="timing-reports-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Sidebar: Library and target selectors */}
      <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 text-gray-800">
            <Cpu className="text-blue-600 h-4.5 w-4.5" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-gray-650">Synthesis Target</span>
          </div>

          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Interrogating synthesizers across different targets changes available physical logic cells, wire models, and clock constraints.
          </p>

          <div className="space-y-3 flex-grow">
            {Object.entries(reports).map(([key, data]) => {
              const active = selectedLib === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedLib(key)}
                  type="button"
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    active
                      ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-350 hover:bg-gray-50/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                    <Grid className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className={`font-display font-semibold text-sm mb-0.5 ${active ? "text-blue-900" : "text-gray-800"}`}>
                      {key === "artix_7" ? "Artix-7 FPGA" : key === "tsmc_45nm_std" ? "TSMC 45nm standard" : "TSMC 28nm extreme"}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono font-medium">{key === "artix_7" ? "HDL LUT Fabric Mapping" : "Cell Gate Library Mapping"}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Design Warning */}
          <div className="mt-5 p-3 rounded-lg bg-gray-50 border border-gray-150 text-[11px] text-gray-600 font-sans leading-normal flex items-start gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>ASIC Setup Tip:</strong> In standard cells, Worst Negative Slack (WNS) indicates the absolute margin before setup timing failures spark meta-stability errors.
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Panels */}
      <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
        
        {/* Timing Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-2 font-bold">Max Operating Freq</span>
            <div>
              <span className="text-2xl font-display font-bold text-gray-900">{rep.fMax.toFixed(2)}</span>
              <span className="text-xs text-gray-550 text-gray-550 ml-1 font-semibold">MHz</span>
            </div>
            <div className="mt-3 text-[10px] font-mono text-gray-500 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              Est. Peak Limit Fmax
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-2 font-bold">Worst Neg Slack (WNS)</span>
            <div>
              <span className={`text-2xl font-display font-bold ${wnsViolated ? "text-red-600" : "text-green-600"} `}>
                {rep.wns >= 0 ? "+" : ""}{rep.wns}
              </span>
              <span className="text-xs text-gray-550 text-gray-500 ml-1 font-semibold">ns</span>
            </div>
            <div className="mt-3 text-[10px] font-mono text-gray-500 flex items-center gap-1 font-bold">
              {wnsViolated ? <ShieldAlert className="h-3.5 w-3.5 text-red-600" /> : <Award className="h-3.5 w-3.5 text-green-600" />}
              {wnsViolated ? "Timing Failed!" : "Setup Timing Met"}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-2 font-bold">Standard Cell count</span>
            <div>
              <span className="text-2xl font-display font-bold text-gray-900">{rep.cellsCount}</span>
              <span className="text-xs text-gray-550 text-gray-500 ml-1 font-semibold">elements</span>
            </div>
            <div className="mt-3 text-[10px] font-mono text-gray-400 font-medium">
              {selectedLib === "artix_7" ? `64 LUTs + 52 FFs` : `${rep.area.toFixed(1)} um² silicon area`}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-2 font-bold">Power Consumption</span>
            <div>
              <span className="text-2xl font-display font-bold text-gray-900">{rep.power.toFixed(2)}</span>
              <span className="text-xs text-gray-550 text-gray-550 ml-1 font-semibold">mW</span>
            </div>
            <div className="mt-3 text-[10px] font-mono text-gray-400 font-medium font-bold">
              {selectedLib === "artix_7" ? "Estimated on FPGA rail" : "Leakage + Dynamic power"}
            </div>
          </div>

        </div>

        {/* Detailed Timing Path Analysis */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 relative shadow-sm">
          
          <div className="flex items-center justify-between gap-4 mb-4 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600 h-5 w-5" />
              <h3 className="font-display font-bold text-base text-gray-900">Critical Path Timing Delay Report</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400 uppercase">
              Start: <span className="text-gray-700 font-bold">{rep.criticalPath.start}</span> ➔ End: <span className="text-gray-700 font-bold">{rep.criticalPath.end}</span>
            </span>
          </div>

          {/* Setup / Hold Analysis detailer */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-inner">
            <div className="grid grid-cols-12 bg-gray-100/75 p-3 text-[10px] font-mono uppercase text-gray-505 text-gray-500 tracking-wider font-bold border-b border-gray-200">
              <div className="col-span-5">Digital Net node / Circuit element</div>
              <div className="col-span-2 text-right">Gate type</div>
              <div className="col-span-2 text-right">Incr Delay</div>
              <div className="col-span-3 text-right">Accumulated delay</div>
            </div>

            <div className="divide-y divide-gray-200 bg-white">
              {rep.criticalPath.path.map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 p-3 text-xs font-mono items-center hover:bg-slate-50">
                  <div className="col-span-5 flex flex-col">
                    <span className="text-gray-800 font-bold truncate">{p.node}</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">{p.comment}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="bg-gray-50 border border-gray-200 text-[9px] text-gray-600 px-1.5 py-0.5 rounded font-bold font-mono">
                      {p.type}
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-gray-500">+{p.delay.toFixed(2)} ns</div>
                  <div className="col-span-3 text-right text-gray-900 font-bold">{p.total.toFixed(2)} ns</div>
                </div>
              ))}
            </div>

            {/* Path calculations summary row */}
            <div className="bg-gray-50/75 p-4 font-mono text-xs border-t border-gray-200 text-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1.5 font-medium">
                    <span>Data Path Delay (Arrival):</span>
                    <span className="text-gray-900 font-bold">{rep.criticalPath.path[rep.criticalPath.path.length-1].total.toFixed(2)} ns</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Target Period (T_cycle limit):</span>
                    <span className="text-gray-900 font-bold">{rep.clockPeriod.toFixed(2)} ns</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5 font-medium">
                    <span>Setup Required Arrival limit:</span>
                    <span className="text-gray-900 font-bold">{(rep.clockPeriod - (rep.criticalPath.path[rep.criticalPath.path.length-1].type.includes("Required") ? 0.05 : 0.05)).toFixed(2)} ns</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Slack calculated:</span>
                    <span className={`font-bold ${wnsViolated ? "text-red-650 text-red-650" : "text-green-700"}`}>
                      {rep.wns} ns {wnsViolated ? "(TIMING VIOLATION)" : "(SLACK MET)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explanatory text for timing fixing */}
          <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-inner">
            <BookOpen className="text-blue-600 h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700 space-y-2 leading-relaxed font-sans">
              <span className="font-display font-bold text-sm text-gray-900 block mb-1">
                Senior VLSI Engineer Analysis: Fixing Timing Violations
              </span>
              {wnsViolated ? (
                <>
                  <p>
                    <strong>The Problem:</strong> The critical path from the FSM state registers to the shift register setup input is too long for the TSMC 28nm Extreme clock frequency of 1.5 GHz (0.66 ns target clock period), generating a <strong>Worst Negative Slack (WNS) of {rep.wns} ns</strong>. Registers are capturing state while their input pins are still settling, risking metastability.
                  </p>
                  <p>
                    <strong>The Fix:</strong> To fix this timing block in ASIC design, we would:
                  </p>
                  <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-gray-600 font-medium">
                    <li>Use <strong>gate sizing</strong> by replacing standard drive buffer gates (e.g. <code>BUF_X1</code>) with high-drive versions (e.g. <code>BUF_X4</code>) to discharge cell skews faster.</li>
                    <li>Introduce <strong>retiming/pipelining</strong> by dividing the long combination logic block into two pipeline stages, shortening the critical path.</li>
                    <li>Refine <strong>Physical Placement layout</strong> to shorten wires and decrease parasitics, driving down wire resistance layers.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    <strong>Timing Verified:</strong> The timing analysis represents positive slack on all corners. Under <strong>{rep.target}</strong>, the design achieves safe synchronous transfers. Setup checks have a healthy slack of <strong>{rep.wns} ns</strong>, and hold checks have <strong>{rep.whs} ns</strong> of headroom.
                  </p>
                  <p>
                    <strong>Hold Margin Warning:</strong> Hold violations cannot be repaired with lower frequencies (clock scaling) because they represent race conditions where data changes too fast before a register finishes sampling. Hold timing must be resolved by introducing <strong>delay buffer pipelines</strong> directly on fast data nets.
                  </p>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
