/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SPISettings, SimulationStep, FsmState, DataWidth } from "../types";

export function parseHexToBin(hex: string, width: DataWidth): string {
  const cleaned = hex.trim().replace(/^0x/i, "");
  if (!cleaned) return "0".repeat(width);
  try {
    const numVal = BigInt("0x" + cleaned);
    const binStr = numVal.toString(2).padStart(width, "0");
    return binStr.slice(-width);
  } catch (e) {
    let bin = "";
    for (let i = 0; i < cleaned.length; i++) {
      const parsed = parseInt(cleaned[i], 16);
      if (!isNaN(parsed)) {
        bin += parsed.toString(2).padStart(4, "0");
      }
    }
    return bin.padStart(width, "0").slice(-width);
  }
}

export function parseBinToHex(bin: string): string {
  if (!bin) return "00";
  try {
    const numVal = BigInt("0b" + bin);
    const hexStr = numVal.toString(16).toUpperCase();
    const hexLen = Math.ceil(bin.length / 4);
    return hexStr.padStart(hexLen, "0");
  } catch (e) {
    return "00";
  }
}

export function generateSpiSimulation(settings: SPISettings): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const width = settings.dataWidth;
  const cpol = (settings.mode & 2) >> 1; // CPOL is bit 1
  const cpha = settings.mode & 1;        // CPHA is bit 0
  const clkDiv = settings.clockDiv;

  const txBin = parseHexToBin(settings.txData, width);
  
  // Setup baseline states
  let current_state = FsmState.IDLE;
  let tx_reg = txBin;
  let rx_reg = "0".repeat(width);
  let cs_n = 1;
  let sclk = cpol;
  let busy = 0;
  let done = 0;
  let bit_index = 0;
  
  let cycle = 0;
  
  const addStep = (edgeDesc: string = "", comment: string = "", overrides?: Partial<SimulationStep>) => {
    const baseMosi = tx_reg.length > 0 ? parseInt(tx_reg[0], 10) : 0;
    const baseMiso = getMisoBit(cycle, baseMosi);
    steps.push({
      cycle,
      sclk,
      cs_n,
      mosi: baseMosi,
      miso: baseMiso,
      tx_reg,
      rx_reg,
      fsm_state: current_state,
      busy,
      done,
      bit_index,
      sclk_edge_desc: edgeDesc as any,
      comment,
      ...overrides
    });
    cycle++;
  };

  const getMisoBit = (currCycle: number, currentMosi: number): number => {
    switch (settings.misoBehavior) {
      case "all_ones":
        return 1;
      case "all_zeros":
        return 0;
      case "complement":
        return currentMosi === 1 ? 0 : 1;
      case "loopback":
        return currentMosi;
      case "random":
        // Pseudo-random based on cycle number for repeatability
        return (currCycle * 17 + 5) % 3 === 0 ? 1 : 0;
      default:
        return 0;
    }
  };

  // --- 1. IDLE State (3 cycles) ---
  for (let i = 0; i < 3; i++) {
    if (settings.faultType === "sclk_glitch" && i === 1) {
      addStep("", "[FAULT DETECTED: SCLK_GLITCH] Unexpected clock toggle occurred while Chip Select CS_n was de-asserted (high)!", {
        sclk: cpol === 1 ? 0 : 1
      });
    } else {
      addStep("", `SPI Master is inactive in IDLE. CS_n is high, SCLK is at CPOL idle level (${cpol}). Waiting for start pulse.`);
    }
  }

  // --- 2. LOAD State (1 cycle) ---
  current_state = FsmState.LOAD;
  cs_n = settings.faultType === "cs_timing" ? 1 : 0;
  busy = 1;
  tx_reg = txBin; // Load tx_reg
  rx_reg = "0".repeat(width); // Clear rx_reg
  if (settings.faultType === "cs_timing") {
    addStep("", `[FAULT DETECTED: CS_TIMING_VIOLATION] FSM entered LOAD state on START pulse, but Chip Select driver failed to draw CS_n low!`);
  } else {
    addStep("", `Host asserted START. FSM moves to LOAD, drawing Chip Select (CS_n) low. Preloading tx_data (0x${settings.txData.toUpperCase()}) into TX shift register.`);
  }

  // --- 3. TRANSFER State ---
  current_state = FsmState.TRANSFER;
  
  // There are (2 * width) SCLK edge transitions in total
  const total_sclk_transitions = 2 * width;
  const half_div = clkDiv / 2;
  
  let pulse_cnt = 0;
  
  while (pulse_cnt < total_sclk_transitions) {
    // SCLK remains at its current value for 'half_div' system clock cycles
    for (let h = 0; h < half_div; h++) {
      // Dynamic CS_n state based on fault injection
      cs_n = (settings.faultType === "cs_timing" && pulse_cnt < 3) ? 1 : 0;

      // Determine if SCLK is about to toggle at the end of this half-cycle
      const is_last_cycle_of_half = h === half_div - 1;
      
      let edgeDesc: string = "";
      let actionComment = "";
      
      if (is_last_cycle_of_half) {
        // Toggle clock & trigger Shift/Sample logic
        const next_sclk = sclk === 1 ? 0 : 1;
        const is_rising = sclk === 0 && next_sclk === 1;
        const is_falling = sclk === 1 && next_sclk === 0;
        
        // Active edge configurations
        // Mode 0: Sample on rise, Shift on fall
        // Mode 1: Shift on rise, Sample on fall
        // Mode 2: Sample on fall, Shift on rise
        // Mode 3: Shift on fall, Sample on rise
        let is_sample_edge = false;
        let is_shift_edge = false;

        if (settings.mode === 0) {
          is_sample_edge = is_rising;
          is_shift_edge = is_falling;
          edgeDesc = is_rising ? "Posegde (Sample)" : "Negedge (Shift)";
        } else if (settings.mode === 1) {
          is_sample_edge = is_falling;
          is_shift_edge = is_rising;
          edgeDesc = is_rising ? "Posegde (Shift)" : "Negedge (Sample)";
        } else if (settings.mode === 2) {
          is_sample_edge = is_falling;
          is_shift_edge = is_rising;
          edgeDesc = is_falling ? "Negedge (Sample)" : "Posegde (Shift)";
        } else if (settings.mode === 3) {
          is_sample_edge = is_rising;
          is_shift_edge = is_falling;
          edgeDesc = is_falling ? "Negedge (Shift)" : "Posegde (Sample)";
        }

        const mosi_curr = tx_reg.length > 0 ? parseInt(tx_reg[0], 10) : 0;
        const miso_val = getMisoBit(cycle, mosi_curr);

        if (is_sample_edge) {
          actionComment = `Active edge detected! Sampling MISO digital line (${miso_val}) into RX capture register.`;
          // Shift sample in
          rx_reg = rx_reg.slice(1) + miso_val.toString();
        } else if (is_shift_edge) {
          actionComment = `Shifting next bit out. Sending TX MSB bit onto MOSI data line.`;
          // Shift next out
          tx_reg = tx_reg.slice(1) + "0";
          bit_index++;
        } else {
          actionComment = `Clock edge toggling. SCLK transitions.`;
        }

        const edgeComment = (settings.faultType === "cs_timing" && pulse_cnt < 3) 
          ? `[TRANSFER Cyc ${pulse_cnt}] ${actionComment} CS_n remains invalid (high). MOSI is driving state (${tx_reg[0] || '0'}).`
          : `[TRANSFER Cyc ${pulse_cnt}] ${actionComment} MOSI is now driving bit [${width - 1 - bit_index}] state (${tx_reg[0] || '0'}).`;

        addStep(edgeDesc, edgeComment);
        
        // Apply actual register toggle for the NEXT simulation step
        sclk = next_sclk;
        pulse_cnt++;
      } else {
        let overrides: any = {};
        if (settings.faultType === "setup_hold" && pulse_cnt === 3 && h === 0) {
          overrides = {
            mosi: (tx_reg.length > 0 ? parseInt(tx_reg[0], 10) : 0) ^ 1,
            comment: "[FAULT DETECTED: SETUP_HOLD_VIOLATION] Jitter on MOSI dataline detected during active setup window of SCLK!"
          };
        }
        addStep("", overrides.comment || `Holding current SCLK state (${sclk}) for clock division rate stabilization.`, overrides);
      }
    }
  }

  // --- 4. COMPLETE State (2 cycles) ---
  current_state = FsmState.COMPLETE;
  done = 1;
  addStep("", `Transaction finished. CS_n remains held low, done flag is assert-pulsed to notify host processor. Received parallel rx_data = 0x${parseBinToHex(rx_reg)}.`);
  
  done = 0;
  addStep("", `Done pulse de-asserted. FSM prepare-sequence reset back to clean conditions.`);

  // --- 5. Return to IDLE (3 cycles) ---
  current_state = FsmState.IDLE;
  busy = 0;
  cs_n = 1;
  sclk = cpol;
  for (let i = 0; i < 3; i++) {
    addStep("", `Returned to IDLE state. CS_n released to high impedance (1). SCLK stable at CPOL rest level (${cpol}). Ready for next transaction.`);
  }

  return steps;
}
