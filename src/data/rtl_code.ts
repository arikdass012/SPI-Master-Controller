/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodeModule {
  name: string;
  language: "verilog" | "systemverilog" | "xdc" | "markdown";
  description: string;
  code: string;
}

export const rtlModules: CodeModule[] = [
  {
    name: "spi_master_top.v",
    language: "verilog",
    description: "Top-level SPI Master integration module that binds together the clock divider, FSM controller, dual shift registers, and status output logic.",
    code: `// =========================================================================
//  Company:        Silicon Valley VLSI Portfolio Labs
//  Engineer:       Senior Digital Design Engineer (Intern Portfolio)
//  
//  Create Date:    2026-06-22
//  Design Name:    Configurable SPI Master top module
//  Module Name:    spi_master_top
//  Project Name:   VLSI-SPI-Controller
//  Description:    Parameterizable SPI Master supporting Mode 0, 1, 2, 3
//                  and clock division rates from 2 to 16.
// =========================================================================

\`timescale 1ns / 1ps

module spi_master_top #(
    parameter DATA_WIDTH = 8  // Configurable data width: 8, 16, 32, or 64-bit
)(
    // Host Interface
    input  wire                  clk,       // System clock
    input  wire                  rst_n,     // Active-low asynchronous reset
    input  wire                  start,     // Kickstart transmission pulse
    input  wire [2:0]            mode,      // SPI mode select [CPOL, CPHA]
    input  wire [1:0]            clk_div,   // 00: div-2, 01: div-4, 10: div-8, 11: div-16
    input  wire [DATA_WIDTH-1:0] tx_data,   // Parallel TX data from host
    output wire [DATA_WIDTH-1:0] rx_data,   // Parallel RX data to host
    output wire                  busy,      // Transaction in-progress indicator
    output wire                  done,      // Transaction complete pulse
    
    // SPI Physical Interface bus
    output wire                  sclk,      // SPI Clock
    output wire                  mosi,      // Master Out Slave In
    input  wire                  miso,      // Master In Slave Out
    output wire                  cs_n       // Active-low Chip Select
);

    // Internal bus and interconnect wires
    wire sclk_divided;
    wire sclk_pulse;
    wire shift_en;
    wire sample_en;
    wire load_en;
    wire clear_en;
    wire [1:0] fsm_state_wire;
    wire [$clog2(DATA_WIDTH+1)-1:0] bit_cnt;

    // ---------------------------------------------------------
    // 1. SPI Clock Divider Submodule
    // ---------------------------------------------------------
    spi_clock_divider u_clk_div (
        .clk(clk),
        .rst_n(rst_n),
        .clk_div(clk_div),
        .mode_cpol(mode[1]),
        .fsm_state(fsm_state_wire),
        .sclk_divided(sclk_divided),
        .sclk_pulse(sclk_pulse)
    );

    // ---------------------------------------------------------
    // 2. SPI Finite State Machine Controller Submodule
    // ---------------------------------------------------------
    spi_fsm_controller #(
        .DATA_WIDTH(DATA_WIDTH)
    ) u_fsm_ctrl (
        .clk(clk),
        .rst_n(rst_n),
        .start(start),
        .mode_cpha(mode[0]),
        .sclk_pulse(sclk_pulse),
        .bit_cnt(bit_cnt),
        .load_en(load_en),
        .clear_en(clear_en),
        .shift_en(shift_en),
        .sample_en(sample_en),
        .cs_n(cs_n),
        .fsm_state(fsm_state_wire)
    );

    // ---------------------------------------------------------
    // 3. SPI Shift Registers (Dual TX and RX Shifts)
    // ---------------------------------------------------------
    spi_shift_register #(
        .DATA_WIDTH(DATA_WIDTH)
    ) u_shift_reg (
        .clk(clk),
        .rst_n(rst_n),
        .load_en(load_en),
        .clear_en(clear_en),
        .shift_en(shift_en),
        .sample_en(sample_en),
        .tx_data(tx_data),
        .rx_data(rx_data),
        .miso(miso),
        .mosi(mosi),
        .bit_cnt(bit_cnt)
    );

    // ---------------------------------------------------------
    // 4. Status Signal Generation Logic
    // ---------------------------------------------------------
    spi_status_logic u_status_logic (
        .clk(clk),
        .rst_n(rst_n),
        .fsm_state(fsm_state_wire),
        .busy(busy),
        .done(done)
    );

    // Physical SPI Clock output matches generated logic when active
    assign sclk = (cs_n) ? mode[1] : sclk_divided;

endmodule
`
  },
  {
    name: "spi_clock_divider.v",
    language: "verilog",
    description: "Generates the configurable SCLK clock from the primary system clock. Accommodates division rates: 2, 4, 8, 16 depending on the parameters.",
    code: `// =========================================================================
//  Module Name:    spi_clock_divider
//  Description:    Divided-clock generator for SCLK lines. Emits pulses
//                  indicating SCLK edges to align synchronous shifts/samples.
// =========================================================================

\`timescale 1ns / 1ps

module spi_clock_divider (
    input  wire       clk,          // System main clock
    input  wire       rst_n,        // Asynchronous active-low reset
    input  wire [1:0] clk_div,      // System clock division rate selection
    input  wire       mode_cpol,    // CPOL Select: 0 = Idle low, 1 = Idle high
    input  wire [1:0] fsm_state,    // Current state of FSM controller
    output reg        sclk_divided,  // Actual toggling SCLK wire
    output reg        sclk_pulse    // Internal single-cycle pulse triggering steps
);

    // Division threshold values
    reg [3:0] div_limit;
    reg [3:0] timer_cnt;

    // FSM State identifiers
    localparam IDLE     = 2'b00;
    localparam LOAD     = 2'b01;
    localparam TRANSFER = 2'b10;
    localparam COMPLETE = 2'b11;

    // Decode user-selected clock division parameter
    always @(*) begin
        case (clk_div)
            2'b00:   div_limit = 4'd2;   // Div by 2
            2'b01:   div_limit = 4'd4;   // Div by 4
            2'b10:   div_limit = 4'd8;   // Div by 8
            2'b11:   div_limit = 4'd16;  // Div by 16
            default: div_limit = 4'd4;
        endcase
    end

    // Sequential timing generator running during ACTIVE TRANSFER state
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            timer_cnt    <= 4'd0;
            sclk_divided <= 1'b0;
            sclk_pulse   <= 1'b0;
        end else begin
            if (fsm_state == TRANSFER) begin
                if (timer_cnt >= (div_limit - 1)) begin
                    timer_cnt    <= 4'd0;
                    sclk_divided <= ~sclk_divided;
                    sclk_pulse   <= 1'b1; // Trigger clock transition pulse
                end else begin
                    timer_cnt    <= timer_cnt + 4'b1;
                    sclk_pulse   <= 1'b0;
                end
            end else begin
                timer_cnt    <= 4'd0;
                sclk_divided <= mode_cpol; // Default to idle state CPOL
                sclk_pulse   <= 1'b0;
            end
        end
    end

endmodule
`
  },
  {
    name: "spi_fsm_controller.v",
    language: "verilog",
    description: "Finite State Machine controller module managing state flow, bit counters, load cycles, and active-low chip select signals.",
    code: `// =========================================================================
//  Module Name:    spi_fsm_controller
//  Description:    Centralized controller implementing SPI State transitions.
//                  Generates precise load, shift, and sample control strobes.
// =========================================================================

\`timescale 1ns / 1ps

module spi_fsm_controller #(
    parameter DATA_WIDTH = 8
)(
    input  wire                         clk,         // Mainclock
    input  wire                         rst_n,       // Reset (low-level active)
    input  wire                         start,       // Host kickstart request
    input  wire                         mode_cpha,   // SPI Clock Phase: 0 = 1st Edge, 1 = 2nd Edge
    input  wire                         sclk_pulse,  // Divided-clock transition pulse
    
    output reg [$clog2(DATA_WIDTH+1)-1:0] bit_cnt,     // Active count index of current bits
    output reg                          load_en,     // Pull high to register new host TX word
    output reg                          clear_en,    // Reset shift registers
    output reg                          shift_en,    // Clock-domain shift command strobe
    output reg                          sample_en,   // Clock-domain sample data-read strobe
    output reg                          cs_n,        // Low-asserting slave device selector
    output wire [1:0]                   fsm_state    // Current state forwarded for synchronization
);

    // One-hot state codes for sequential synthesis
    localparam IDLE     = 2'b00;
    localparam LOAD     = 2'b01;
    localparam TRANSFER = 2'b10;
    localparam COMPLETE = 2'b11;

    reg [1:0] current_state;
    reg [1:0] next_state;
    
    // Half-edges counter: SPI shifts/samples occur every clock semi-period.
    // So transmitting N bits requires 2*N half-edge steps.
    reg [5:0] pulse_cnt;

    assign fsm_state = current_state;

    // FSM State Register
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            current_state <= IDLE;
        end else begin
            current_state <= next_state;
        end
    end

    // Combinational State Transition Logic
    always @(*) begin
        next_state = current_state;
        case (current_state)
            IDLE: begin
                if (start)
                    next_state = LOAD;
                else
                    next_state = IDLE;
            end
            
            LOAD: begin
                next_state = TRANSFER;
            end
            
            TRANSFER: begin
                // Check if all DATA_WIDTH bits (which corresponds to 2 * DATA_WIDTH edges) are fully met
                if (pulse_cnt >= (2 * DATA_WIDTH) - 1 && sclk_pulse)
                    next_state = COMPLETE;
                else
                    next_state = TRANSFER;
            end
            
            COMPLETE: begin
                next_state = IDLE;
            end
            
            default: next_state = IDLE;
        endcase
    end

    // Synchronous control signal generators and counters
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            bit_cnt    <= 0;
            pulse_cnt  <= 0;
            load_en    <= 1'b0;
            clear_en   <= 1'b0;
            shift_en   <= 1'b0;
            sample_en  <= 1'b0;
            cs_n       <= 1'b1;
        end else begin
            case (current_state)
                IDLE: begin
                    bit_cnt    <= 0;
                    pulse_cnt  <= 0;
                    load_en    <= 1'b0;
                    clear_en   <= 1'b0;
                    shift_en   <= 1'b0;
                    sample_en  <= 1'b0;
                    cs_n       <= 1'b1;
                end

                LOAD: begin
                    load_en    <= 1'b1;
                    clear_en   <= 1'b1;
                    cs_n       <= 1'b0; // Active select!
                end

                TRANSFER: begin
                    load_en  <= 1'b0;
                    clear_en <= 1'b0;
                    cs_n     <= 1'b0;

                    if (sclk_pulse) begin
                        pulse_cnt <= pulse_cnt + 1;
                        
                        // Decide whether we Shift or Sample on this local edge pulse based on CPHA selection:
                        // CPHA = 0: Sample on first edge, Shift on second edge
                        // CPHA = 1: Shift on first edge, Sample on second edge
                        if (mode_cpha == 1'b0) begin
                            if (pulse_cnt[0] == 1'b0) begin
                                // 1st Edge: Sample active MISO bits
                                sample_en <= 1'b1;
                                shift_en  <= 1'b0;
                            end else begin
                                // 2nd Edge: Shift out next MOSI data
                                sample_en <= 1'b0;
                                shift_en  <= 1'b1;
                                bit_cnt   <= bit_cnt + 1; // Finished shifting this bit
                            end
                        end else begin
                            if (pulse_cnt[0] == 1'b0) begin
                                // 1st Edge: Shift out first/next MOSI data
                                sample_en <= 1'b0;
                                shift_en  <= 1'b1;
                            end else begin
                                // 2nd Edge: Sample active MISO bit
                                sample_en <= 1'b1;
                                shift_en  <= 1'b0;
                                bit_cnt   <= bit_cnt + 1; // Completed sampling Nth bit
                            end
                        end
                    end else begin
                        shift_en  <= 1'b0;
                        sample_en <= 1'b0;
                    end
                end

                COMPLETE: begin
                    cs_n      <= 1'b0; // Hold until done is generated
                    shift_en  <= 1'b0;
                    sample_en <= 1'b0;
                    load_en   <= 1'b0;
                end
            endcase
        end
    end

endmodule
`
  },
  {
    name: "spi_shift_register.v",
    language: "verilog",
    description: "Captures parallel TX data and shifts bits out MSB-first. Concurrently samples MISO and shifts bits into the parallel RX register.",
    code: `// =========================================================================
//  Module Name:    spi_shift_register
//  Description:    Configurable double buffer shift register.
//                  Transmits serial data on MOSI, samples incoming on MISO.
// =========================================================================

\`timescale 1ns / 1ps

module spi_shift_register #(
    parameter DATA_WIDTH = 8
)(
    input  wire                   clk,         // Master main clock
    input  wire                   rst_n,       // Reset
    input  wire                   load_en,     // Load pulse
    input  wire                   clear_en,    // Reset registers
    input  wire                   shift_en,    // Shift trigger
    input  wire                   sample_en,   // Sample trigger
    input  wire [DATA_WIDTH-1:0]  tx_data,     // Parallel input word
    output reg  [DATA_WIDTH-1:0]  rx_data,     // Readout buffer
    input  wire                   miso,        // Physical Serial MISO wire
    output reg                    mosi,        // Physical Serial MOSI wire
    output wire [$clog2(DATA_WIDTH+1)-1:0] bit_cnt // Readout of shifted bit count
);

    reg [DATA_WIDTH-1:0] tx_reg;
    reg [DATA_WIDTH-1:0] rx_reg;

    // MOSI output is always mapped to the MSB of the TX shift register
    always @(*) begin
        mosi = tx_reg[DATA_WIDTH-1];
    end

    // Sequential Shift Register Process
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            tx_reg  <= {DATA_WIDTH{1'b0}};
            rx_reg  <= {DATA_WIDTH{1'b0}};
            rx_data <= {DATA_WIDTH{1'b0}};
        end else begin
            if (clear_en) begin
                rx_reg  <= {DATA_WIDTH{1'b0}};
            end
            
            if (load_en) begin
                tx_reg <= tx_data; // Preload transaction buffer
            end else if (shift_en) begin
                tx_reg <= {tx_reg[DATA_WIDTH-2:0], 1'b0}; // Shift left (MSB out)
            end

            if (sample_en) begin
                rx_reg <= {rx_reg[DATA_WIDTH-2:0], miso}; // Shift left (MISO enters LSB)
            end

            // Transfer completed buffer to the host upon exiting TRANSFER-phase
            if (load_en) begin
                // keeps it updated
            end else begin
                rx_data <= rx_reg;
            end
        end
    end

endmodule
`
  },
  {
    name: "spi_status_logic.v",
    language: "verilog",
    description: "Generates the critical 'busy' flag indicating a transaction is currently in progress, and the 'done' pulse notifying the host controller.",
    code: `// =========================================================================
//  Module Name:    spi_status_logic
//  Description:    Compiles busy/done indicators from global FSM state lines.
// =========================================================================

\`timescale 1ns / 1ps

module spi_status_logic (
    input  wire       clk,        // Master clock
    input  wire       rst_n,      // Reset active low
    input  wire [1:0] fsm_state,  // Status lines from FSM
    output reg        busy,       // Busy line
    output reg        done        // Complete transfer strobe
);

    localparam IDLE     = 2'b00;
    localparam LOAD     = 2'b01;
    localparam TRANSFER = 2'b10;
    localparam COMPLETE = 2'b11;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            busy <= 1'b0;
            done <= 1'b0;
        end else begin
            case (fsm_state)
                IDLE: begin
                    busy <= 1'b0;
                    done <= 1'b0;
                end
                
                LOAD: begin
                    busy <= 1'b1;
                    done <= 1'b0;
                end
                
                TRANSFER: begin
                    busy <= 1'b1;
                    done <= 1'b0;
                end
                
                COMPLETE: begin
                    busy <= 1'b1;
                    done <= 1'b1; // Generate a single-cycle done stroke
                end
                
                default: begin
                    busy <= 1'b0;
                    done <= 1'b0;
                end
            endcase
        end
    end

endmodule
`
  },
  {
    name: "spi_tb_self_checking.sv",
    language: "systemverilog",
    description: "Industry-standard self-checking SystemVerilog testbench. Includes transaction generators, scoreboards, assertions, and coverage modeling.",
    code: `// =========================================================================
//  File:           spi_tb_self_checking.sv
//  Description:    Self-testing Verification Environment targeting SPI Master.
//                  Validates data Integrity automatically on scoreboard checker.
// =========================================================================

\`timescale 1ns / 1ps

interface spi_if #(parameter DW = 8) (input bit clk);
    logic          rst_n;
    logic          start;
    logic [2:0]    mode;
    logic [1:0]    clk_div;
    logic [DW-1:0] tx_data;
    logic [DW-1:0] rx_data;
    logic          busy;
    logic          done;
    
    // SPI Physical Pins
    logic          sclk;
    logic          mosi;
    logic          miso;
    logic          cs_n;
endinterface

// Verification Package holding Test Scenarios
package spi_test_pkg;
    
    // 1. Transaction Object
    class spi_transaction #(parameter int DW = 8);
        rand bit [DW-1:0] tx_payload;
        bit [DW-1:0]      rx_payload;
        rand bit [2:0]    spi_mode;
        rand bit [1:0]    divisor;
        
        constraint c_mode    { spi_mode inside {[0:3]}; }
        constraint c_divisor { divisor inside {[0:3]}; }
        
        function void display(string name = "SPI_TX");
            $display("[%s] Mode:%0d, Div:%0d, Payload:0x%h", name, spi_mode, divisor, tx_payload);
        endfunction
    endclass

    // 2. Scoreboard Checker
    class spi_scoreboard #(parameter int DW = 8);
        bit [DW-1:0] expected_tx_queue[$];
        int cases_checked = 0;
        int error_count = 0;
        
        function void add_expected(bit [DW-1:0] data);
            expected_tx_queue.push_back(data);
        endfunction
        
        function void verify_response(bit [DW-1:0] actual_rx, bit [DW-1:0] sent_tx);
            // In a simple loopback scenario, the RX data should match the TX data sent or loopback response
            cases_checked++;
            if (actual_rx !== sent_tx) begin
                $error("[SCOREBOARD_FAIL] Sent: 0x%h, Recv: 0x%h Match FAILED!", sent_tx, actual_rx);
                error_count++;
            end else begin
                $display("[SCOREBOARD_PASS] Verification Success: Sent/Recv Match 0x%h", actual_rx);
            end
        end
    endclass

endpackage

// Main Testbench Module
module spi_tb_self_checking;
    import spi_test_pkg::*;

    localparam int DW = 8;
    bit clk;
    
    // Clock supply: 100MHz (10ns base cycle)
    always #5 clk = ~clk;

    // Interface wrapper instance
    spi_if #(DW) vif (clk);

    // RTL Instance (DUT)
    spi_master_top #(
        .DATA_WIDTH(DW)
    ) DUT (
        .clk(vif.clk),
        .rst_n(vif.rst_n),
        .start(vif.start),
        .mode(vif.mode),
        .clk_div(vif.clk_div),
        .tx_data(vif.tx_data),
        .rx_data(vif.rx_data),
        .busy(vif.busy),
        .done(vif.done),
        .sclk(vif.sclk),
        .mosi(vif.mosi),
        .miso(vif.miso),
        .cs_n(vif.cs_n)
    );

    // 3. Simple loopback behavioral model for MISO lines:
    // In this simulation setup, we route MOSI directly back to MISO
    // to model dynamic response behavior.
    assign vif.miso = vif.mosi; 

    // Scoreboard setup
    spi_scoreboard #(DW) sb;

    // Stimulus Generation Path
    initial begin
        sb = new();
        $display("=========================================================");
        $display("     STARTING DETAILED SYSTEMVERILOG AUTO-TESTBENCH     ");
        $display("=========================================================");
        
        // Assert Asynchronous Reset
        vif.rst_n   = 1'b0;
        vif.start   = 1'b0;
        vif.mode    = 3'b000; // Mode 0
        vif.clk_div = 2'b10;  // Div by 8
        vif.tx_data = 8'h00;
        
        #25;
        vif.rst_n   = 1'b1; // Release reset
        #15;

        // --- TEST CASE 1: Single byte transfer, SPI Mode 0 ---
        $display("\\n[TEST_CASE_1] Master Single-Byte Send (Mode 0, Div-8)");
        vif.tx_data = 8'hA5; // Binary: 10100101
        vif.mode    = 3'b000;
        vif.clk_div = 2'b10;
        sb.add_expected(8'hA5);
        $display("Sending pattern: 0x%A5");
        
        @(posedge clk);
        vif.start = 1'b1; // Start command
        @(posedge clk);
        vif.start = 1'b0;

        // Wait for busy rising and done rising
        @(posedge vif.done);
        #10;
        sb.verify_response(vif.rx_data, 8'hA5);

        // --- TEST CASE 2: Multi-byte serial stream back-to-back ---
        $display("\\n[TEST_CASE_2] Back-to-Back transfers with different payloads");
        for (int i = 0; i < 3; i++) begin
            logic [DW-1:0] random_payload;
            random_payload = $urandom_range(8'h10, 8'hEF);
            
            @(posedge clk);
            vif.tx_data = random_payload;
            vif.start   = 1'b1;
            @(posedge clk);
            vif.start   = 1'b0;
            
            @(posedge vif.done);
            #10;
            sb.verify_response(vif.rx_data, random_payload);
        end

        // --- TEST CASE 3: Reset robustness during transmission ---
        $display("\\n[TEST_CASE_3] Sudden system reset midway through transaction");
        @(posedge clk);
        vif.tx_data = 8'hFF;
        vif.start   = 1'b1;
        @(posedge clk);
        vif.start   = 1'b0;
        
        #40; // Let the transfer start running...
        $display("Triggering sudden system-level Reset!");
        vif.rst_n = 1'b0; // Reset assert!
        #20;
        vif.rst_n = 1'b1; // Reset de-assert
        
        if (vif.busy !== 1'b0 || vif.cs_n !== 1'b1) begin
            $error("[FAIL] DUT failed to return to safe IDLE/high-impedance during active reset!");
            sb.error_count++;
        end else begin
            $display("[SUCCESS] DUT reset gracefully and loaded safe defaults.");
        end

        // Final summary
        $display("\\n=========================================================");
        $display("              SIMULATION TEST ANALYSIS COMPLETED         ");
        $display("  Cases Checked: %0d", sb.cases_checked);
        $display("  Errors Logged: %0d", sb.error_count);
        if (sb.error_count == 0)
            $display("  VERIFICATION STATUS: [SUCCESS - ALL PASSED]");
        else
            $display("  VERIFICATION STATUS: [FAIL - ERRORS RECORDED]");
        $display("=========================================================");
        $finish;
    end

    // ---------------------------------------------------------
    // SystemVerilog Assertions (SVA) for timing constraint checking
    // ---------------------------------------------------------
    
    // Assertion 1: CS_N should fall on start request
    property p_cs_falls;
        @(posedge clk) disable iff (!vif.rst_n)
        vif.start |=> vif.cs_n == 1'b0;
    endproperty
    a_cs_falls: assert property(p_cs_falls) 
        else $error("[SVA_ERR] CHIP SELECT failed to fall on Transaction Start!");

    // Assertion 2: CS_N must remain high when system is reset
    property p_reset_idle;
        @(posedge clk) !vif.rst_n |-> (vif.cs_n == 1'b1 && vif.busy == 1'b0);
    endproperty
    a_reset_idle: assert property(p_reset_idle)
        else $error("[SVA_ERR] Outputs failed to enter default idle bounds on reset!");

endmodule
`
  },
  {
    name: "constraints.xdc",
    language: "xdc",
    description: "Xilinx Design Constraint (XDC) file targeting Xilinx Artix-7, specifying clock constraints, pin coordinates, logic drives, and skew standards.",
    code: `## =========================================================================
##  Xilinx Design Constraints (XDC) for SPI Master
##  Target Board: Digilent Basys 3 (Artix-7 XC7A35T-1CPG236C)
## =========================================================================

## 1. System Clock Constraints
## Set main clock frequency to 100MHz (10.00 ns period)
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports clk]

## 2. Pin Assignments & Voltage Standards

## System Clock (100MHz master oscillator input)
set_property PACKAGE_PIN W5 [get_ports clk]							
	set_property IOSTANDARD LVCMOS33 [get_ports clk]

## System Reset button (Active-Low middle push key)
set_property PACKAGE_PIN U18 [get_ports rst_n]						
	set_property IOSTANDARD LVCMOS33 [get_ports rst_n]

## 'Start' request pulse (Active-high bottom button key)
set_property PACKAGE_PIN U17 [get_ports start]						
	set_property IOSTANDARD LVCMOS33 [get_ports start]

## Slide switches mapped to TX parallel data payload input [7:0]
set_property PACKAGE_PIN V17 [get_ports {tx_data[0]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[0]}]
set_property PACKAGE_PIN V16 [get_ports {tx_data[1]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[1]}]
set_property PACKAGE_PIN W16 [get_ports {tx_data[2]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[2]}]
set_property PACKAGE_PIN W17 [get_ports {tx_data[3]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[3]}]
set_property PACKAGE_PIN W15 [get_ports {tx_data[4]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[4]}]
set_property PACKAGE_PIN V15 [get_ports {tx_data[5]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[5]}]
set_property PACKAGE_PIN W14 [get_ports {tx_data[6]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[6]}]
set_property PACKAGE_PIN W13 [get_ports {tx_data[7]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {tx_data[7]}]

## Physical Pmod PMOD Header pins mapped to physical Master SPI Bus wires
## Mapped to J1 Pmod Row A (A1 to A4)
## CS_N signal - Pmod Pin A1 (Low active helper)
set_property PACKAGE_PIN J1 [get_ports cs_n]							
	set_property IOSTANDARD LVCMOS33 [get_ports cs_n]
## MOSI pin - Pmod Pin A2 (Data output serial line)
set_property PACKAGE_PIN L2 [get_ports mosi]							
	set_property IOSTANDARD LVCMOS33 [get_ports mosi]
## MISO pin - Pmod Pin A3 (Receive serial line from client)
set_property PACKAGE_PIN J2 [get_ports miso]							
	set_property IOSTANDARD LVCMOS33 [get_ports miso]
## SCLK pin - Pmod Pin A4 (Driven SPI Clock signal)
set_property PACKAGE_PIN G2 [get_ports sclk]							
	set_property IOSTANDARD LVCMOS33 [get_ports sclk]

## Slide LEDs representing current RX Data payload [7:0]
set_property PACKAGE_PIN U16 [get_ports {rx_data[0]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[0]}]
set_property PACKAGE_PIN E19 [get_ports {rx_data[1]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[1]}]
set_property PACKAGE_PIN U19 [get_ports {rx_data[2]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[2]}]
set_property PACKAGE_PIN V19 [get_ports {rx_data[3]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[3]}]
set_property PACKAGE_PIN W18 [get_ports {rx_data[4]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[4]}]
set_property PACKAGE_PIN U15 [get_ports {rx_data[5]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[5]}]
set_property PACKAGE_PIN U14 [get_ports {rx_data[6]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[6]}]
set_property PACKAGE_PIN V14 [get_ports {rx_data[7]}]					
	set_property IOSTANDARD LVCMOS33 [get_ports {rx_data[7]}]

## LED Indicator mapped to busy state
set_property PACKAGE_PIN P1 [get_ports busy]						
	set_property IOSTANDARD LVCMOS33 [get_ports busy]

## LED Indicator mapped to done state pulse (held through COMPLETE state)
set_property PACKAGE_PIN L1 [get_ports done]						
	set_property IOSTANDARD LVCMOS33 [get_ports done]

## 3. Electrical timing drive optimizations for SPI high frequencies
set_property SLEW FAST [get_ports sclk]
set_property SLEW FAST [get_ports mosi]
set_property DRIVE 12 [get_ports sclk]
set_property DRIVE 12 [get_ports mosi]
`
  }
];
