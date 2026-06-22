/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SPIMode = 0 | 1 | 2 | 3;
export type ClockDivider = 2 | 4 | 8 | 16;
export type DataWidth = 8 | 16 | 32 | 64;

export enum FsmState {
  IDLE = "IDLE",
  LOAD = "LOAD",
  TRANSFER = "TRANSFER",
  COMPLETE = "COMPLETE"
}

export type FaultType = "none" | "sclk_glitch" | "cs_timing" | "setup_hold";

export interface SPISettings {
  dataWidth: DataWidth;
  mode: SPIMode;
  clockDiv: ClockDivider;
  txData: string; // Hex representation
  misoBehavior: "all_zeros" | "all_ones" | "random" | "complement" | "loopback";
  misoCustomBits?: string; // Custom stream of binary characters '0' or '1'
  faultType?: FaultType;
}

export interface SimulationStep {
  cycle: number;
  sclk: number;
  cs_n: number;
  mosi: number;
  miso: number;
  tx_reg: string; // binary string representation
  rx_reg: string; // binary string representation
  fsm_state: FsmState;
  busy: number;
  done: number;
  bit_index: number;
  sclk_edge_desc: "" | "Posegde (Sample)" | "Negedge (Shift)" | "Posegde (Shift)" | "Negedge (Sample)";
  comment: string;
}

export interface TimingSegment {
  element: string;
  type: "Port" | "Register" | "Gate" | "Wire" | "Clock Edge";
  delay: number; // in ns
  total: number; // in ns
  increment: number; // index of change
  description: string;
}

export interface TimingPath {
  name: string;
  startPoint: string;
  endPoint: string;
  slack: number;
  type: "Setup" | "Hold";
  arrival: number;
  required: number;
  segments: TimingSegment[];
}

export interface ResourceSummary {
  lutUsed: number;
  lutTotal: number;
  ffUsed: number;
  ffTotal: number;
  ioUsed: number;
  ioTotal: number;
  bufgUsed: number;
  bufgTotal: number;
}
