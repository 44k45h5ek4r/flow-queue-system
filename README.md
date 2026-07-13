# Flow — A Premium Queue System

Flow is an Apple-inspired queue management application designed to feel calm, elegant, and effortless.

## Key Features

1.  **Operations Workspace**: Displays active stations, urgent warnings, and real-time waiting lists in a clean grid.
2.  **Staff Console**: A keyboard-driven control panel containing a satisfying tactile next-client button.
3.  **Customer Mobile Simulator**: Displays the interface a client scans via QR code inside a mockup mobile chassis with an interactive progress ring and Dynamic Island alerts.
4.  **Storytelling Insights**: Summarizes bottlenecks and operational successes in natural, descriptive language cards rather than standard pie charts.
5.  **Apple-style Web Audio Synthesizer**: Produces custom hardware-like audio effects (clicks, chimes, camera shutter releases) directly from browser code without external dependencies.
6.  **Command Palette**: Press `Cmd + K` or `Ctrl + K` to search commands, swap workspaces, or query active customer tickets.

---

## Keyboard Hotkey Layouts

### Workspace Navigation (Global)
*   `Alt + 1` — Go to Operations Workspace
*   `Alt + 2` — Go to Staff Console Workspace
*   `Alt + 3` — Go to Customer Mobile Simulator
*   `Alt + 4` — Go to Storytelling Insights
*   `Ctrl + K` / `Cmd + K` — Toggle Command Palette

### Staff Console Operations
*(Make sure you are focused on the Staff Workspace)*
*   `Space` — Call Next Client in line (triggers satisfying shutter sound)
*   `Enter` — Start serving the called client
*   `D` — Mark the serving client as Complete / Done
*   `R` — Recall the called client (re-announces with micro-audio chime)

---

## Launch Instructions

1.  Open the workspace directory: [flow-queue-system](file:///C:/Users/admin/.gemini/antigravity/scratch/flow-queue-system/)
2.  Simply double-click the [index.html](file:///C:/Users/admin/.gemini/antigravity/scratch/flow-queue-system/index.html) file to launch the application directly in your default browser.
3.  Alternatively, serve it locally using a simple Python script from your terminal:
    ```powershell
    python -m http.server 8000
    ```
    Then visit: `http://localhost:8000`
