// Audio Synthesizer Class using native Web Audio API
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    toggle(state) {
        this.enabled = state !== undefined ? state : !this.enabled;
        return this.enabled;
    }
    
    playClick() {
        if (!this.enabled) return;
        try {
            this.init();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(1600, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {
            console.error("Audio error", e);
        }
    }
    
    playChime() {
        if (!this.enabled) return;
        try {
            this.init();
            const now = this.ctx.currentTime;
            
            const playTone = (freq, delay, vol) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.frequency.setValueAtTime(freq, now + delay);
                gain.gain.setValueAtTime(0, now + delay);
                gain.gain.linearRampToValueAtTime(vol, now + delay + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);
                
                osc.start(now + delay);
                osc.stop(now + delay + 0.5);
            };
            
            playTone(523.25, 0, 0.12);     // C5
            playTone(659.25, 0.06, 0.09);  // E5
            playTone(783.99, 0.12, 0.07);  // G5
        } catch (e) {
            console.error("Audio error", e);
        }
    }
    
    playShutter() {
        if (!this.enabled) return;
        try {
            this.init();
            const now = this.ctx.currentTime;
            
            // Heavy mechanical sine release
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            osc.start();
            osc.stop(now + 0.1);
            
            // High frequency click scrape (synthesized noise)
            const bufferSize = this.ctx.sampleRate * 0.1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1500, now);
            noiseFilter.Q.setValueAtTime(4, now);
            
            const noiseGain = this.ctx.createGain();
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            
            noiseGain.gain.setValueAtTime(0.04, now);
            noiseGain.gain.setValueAtTime(0.08, now + 0.02); // dual click action
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            
            noise.start(now);
            noise.stop(now + 0.12);
        } catch (e) {
            console.error("Audio error", e);
        }
    }
}

// Flow Queue State Management
class FlowQueueSystem {
    constructor() {
        this.synth = new AudioSynth();
        
        // Configuration
        this.simSpeed = 1; // 0 (paused), 1, 5, 15, 30
        this.ticketIndex = 100;
        this.averageProcessTime = 8.5; // minutes
        this.targetWaitTime = 15; // minutes threshold
        
        // Initial Database / Datasets
        this.namesPool = [
            "Julian Thorne", "Elena Rostova", "Marcus Vance", "Aria Croft", "Kaelen Lin", 
            "Amara Sinclair", "Soren Mercer", "Liam Gallagher", "Clara Sterling", "David Zhao", 
            "Sophia Martinez", "Nico Finch", "Olivia Wilde", "Tariq Mahmood", "Emma Watson"
        ];
        
        this.services = ["Triage", "Consultation", "Billing", "Pharmacy"];
        
        this.counters = [
            { id: 1, name: "Counter 1", serviceType: "Triage", staffName: "Nurse Rachel Miller", activeClientId: null, status: "idle", idleDuration: 0, workCount: 12, speedModifier: 1.0 },
            { id: 2, name: "Counter 2", serviceType: "Consultation", staffName: "Dr. Adrian Vance", activeClientId: null, status: "idle", idleDuration: 0, workCount: 9, speedModifier: 0.95 },
            { id: 3, name: "Counter 3", serviceType: "Billing", staffName: "Clerk Liam Croft", activeClientId: null, status: "idle", idleDuration: 0, workCount: 15, speedModifier: 1.15 },
            { id: 4, name: "Counter 4", serviceType: "Pharmacy", staffName: "Pharmacist Sophia Lin", activeClientId: null, status: "idle", idleDuration: 0, workCount: 19, speedModifier: 1.18 }
        ];

        this.clients = [
            { id: "FL-101", name: "David Zhao", status: "completed", waitDuration: 8, serveDuration: 4, checkedInAt: 24, calledAt: 32, counterId: 1 },
            { id: "FL-102", name: "Sophia Martinez", status: "serving", waitDuration: 11, serveDuration: 3, checkedInAt: 15, calledAt: 26, counterId: 2 },
            { id: "FL-103", name: "Julian Thorne", status: "called", waitDuration: 14, serveDuration: 0, checkedInAt: 12, calledAt: 26, counterId: 3 },
            { id: "FL-104", name: "Elena Rostova", status: "waiting", waitDuration: 12, serveDuration: 0, checkedInAt: 14, calledAt: null, counterId: null },
            { id: "FL-105", name: "Marcus Vance", status: "waiting", waitDuration: 8, serveDuration: 0, checkedInAt: 18, calledAt: null, counterId: null },
            { id: "FL-106", name: "Aria Croft", status: "waiting", waitDuration: 4, serveDuration: 0, checkedInAt: 22, calledAt: null, counterId: null }
        ];

        // Active State Tracking
        this.selectedCounterId = 1;
        this.customerMobileTicketId = "FL-104";
        
        // Navigation states
        this.currentView = "operations"; // operations, staff, customer, insights
        this.paletteActive = false;
        this.paletteSelectedIndex = 0;
        
        // Timer simulation interval
        this.simTickDuration = 3000; // 3 seconds real-time represents 1 minute simulation time
        this.timerId = null;
        this.simulationTicks = 30; // initial ticks representation
    }

    init() {
        this.setupEventListeners();
        this.startSimulation();
        this.renderAll();
    }

    // Main Simulation Tick Loop
    startSimulation() {
        if (this.timerId) clearInterval(this.timerId);
        if (this.simSpeed === 0) return;

        const interval = this.simTickDuration / this.simSpeed;
        this.timerId = setInterval(() => {
            this.tick();
        }, interval);
    }

    setSimSpeed(speed) {
        this.simSpeed = speed;
        const valEl = document.getElementById("sim-value-lbl");
        if (valEl) valEl.innerText = speed === 0 ? "PAUSED" : `${speed}x`;
        this.startSimulation();
    }

    tick() {
        this.simulationTicks++;
        
        // 1. Advance waiting client time metrics
        this.clients.forEach(c => {
            if (c.status === "waiting") {
                c.waitDuration++;
            } else if (c.status === "serving") {
                c.serveDuration++;
            }
        });

        // 2. Increment idle times for counters
        this.counters.forEach(cntr => {
            if (cntr.status === "idle") {
                cntr.idleDuration++;
            } else {
                cntr.idleDuration = 0;
            }
        });

        // 3. Random check-ins (18% chance per simulated minute)
        if (Math.random() < 0.18) {
            this.generateRandomCheckin();
        }

        // 4. Random counter serve completion (simulation of other staff working)
        this.counters.forEach(cntr => {
            if (cntr.id !== this.selectedCounterId && cntr.status === "serving" && cntr.activeClientId) {
                const client = this.clients.find(c => c.id === cntr.activeClientId);
                if (client) {
                    // Average serve duration is 6 mins, modified by counter staff efficiency
                    const completeProb = 0.15 * cntr.speedModifier;
                    if (client.serveDuration >= 3 && Math.random() < completeProb) {
                        this.completeCounterClient(cntr.id);
                    }
                }
            }
        });

        this.renderAll();
    }

    generateRandomCheckin() {
        this.ticketIndex++;
        const nextId = `FL-${this.ticketIndex}`;
        const name = this.namesPool[Math.floor(Math.random() * this.namesPool.length)];
        
        const newClient = {
            id: nextId,
            name: name,
            status: "waiting",
            waitDuration: 0,
            serveDuration: 0,
            checkedInAt: this.simulationTicks,
            calledAt: null,
            counterId: null
        };
        
        this.clients.push(newClient);
        
        // Update customer selector if it was empty or just default
        if (!this.clients.find(c => c.id === this.customerMobileTicketId)) {
            this.customerMobileTicketId = nextId;
        }

        // If active customer is this, simulate dynamic island expansion
        this.triggerDynamicIslandNotification("Checked In", name);
        this.synth.playClick();
    }

    // Trigger visual notification in Dynamic Island
    triggerDynamicIslandNotification(title, subtitle) {
        const island = document.getElementById("mobile-island");
        const islandText = document.getElementById("island-text-lbl");
        
        if (island && islandText) {
            islandText.innerText = `${title}: ${subtitle}`;
            island.classList.add("expanded");
            
            setTimeout(() => {
                island.classList.remove("expanded");
            }, 3000);
        }
    }

    // Core Interaction Methods (Staff Actions)
    callNextClient(counterId) {
        const counter = this.counters.find(c => c.id === counterId);
        if (!counter) return;

        // If counter already has someone active, complete them first
        if (counter.status === "serving" || counter.activeClientId) {
            this.completeCounterClient(counterId);
        }

        // Find next waiting client
        const nextClient = this.clients.find(c => c.status === "waiting");
        if (nextClient) {
            nextClient.status = "called";
            nextClient.calledAt = this.simulationTicks;
            nextClient.counterId = counterId;

            counter.status = "serving";
            counter.activeClientId = nextClient.id;
            counter.idleDuration = 0;
            counter.workCount++;

            this.synth.playShutter();
            this.synth.playChime();
            
            this.triggerDynamicIslandNotification("PROCEED", `Go to ${counter.name}`);
            
            // Automatically switch customer display if they scan/check
            if (nextClient.id === this.customerMobileTicketId) {
                this.updateCustomerView();
            }
        } else {
            // No clients in queue
            this.synth.playClick();
            this.triggerDynamicIslandNotification("QUEUE EMPTY", "No clients waiting");
        }
        
        this.renderAll();
    }

    startServingActiveClient(counterId) {
        const counter = this.counters.find(c => c.id === counterId);
        if (!counter || !counter.activeClientId) return;

        const client = this.clients.find(c => c.id === counter.activeClientId);
        if (client && client.status === "called") {
            client.status = "serving";
            this.synth.playClick();
        }
        this.renderAll();
    }

    completeCounterClient(counterId) {
        const counter = this.counters.find(c => c.id === counterId);
        if (!counter || !counter.activeClientId) return;

        const client = this.clients.find(c => c.id === counter.activeClientId);
        if (client) {
            client.status = "completed";
            
            // If completed and it was pharmacy or final step, done. Otherwise reset.
            counter.status = "idle";
            counter.activeClientId = null;
            counter.idleDuration = 0;
            
            this.synth.playClick();
        }
        this.renderAll();
    }

    recallClient(counterId) {
        const counter = this.counters.find(c => c.id === counterId);
        if (!counter || !counter.activeClientId) return;

        const client = this.clients.find(c => c.id === counter.activeClientId);
        if (client) {
            this.synth.playChime();
            this.triggerDynamicIslandNotification("RECALLED", `Proceed to ${counter.name}`);
        }
    }

    // Toggle sound
    toggleSound() {
        const active = this.synth.toggle();
        const btn = document.getElementById("sound-toggle");
        if (btn) {
            btn.innerHTML = active ? 
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/><path d="M9.707 12.243a5.48 5.48 0 0 0 1.618-3.898 5.48 5.48 0 0 0-1.618-3.898l-.708.708A4.48 4.48 0 0 1 10.325 8c0 1.24-.504 2.366-1.325 3.19z"/><path d="M4 4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .854.354L7.146 9.5H9.5a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5H7.146L4.354 3.146A.5.5 0 0 0 4 4"/></svg>` : 
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/></svg>`;
        }
        this.synth.playClick();
    }

    // View Switching Navigation
    switchView(viewName) {
        if (this.currentView === viewName) return;
        
        this.synth.playClick();
        
        // Remove active class from old view, add to new
        const prevViewEl = document.getElementById(`view-${this.currentView}`);
        const nextViewEl = document.getElementById(`view-${viewName}`);
        
        if (prevViewEl) prevViewEl.classList.remove("active");
        if (nextViewEl) nextViewEl.classList.add("active");
        
        // Update dock items
        const prevDockItem = document.querySelector(`.dock-item[data-view="${this.currentView}"]`);
        const nextDockItem = document.querySelector(`.dock-item[data-view="${viewName}"]`);
        
        if (prevDockItem) prevDockItem.classList.remove("active");
        if (nextDockItem) nextDockItem.classList.add("active");
        
        this.currentView = viewName;
        this.renderAll();
    }

    // Command Palette UI Functions
    openPalette() {
        this.paletteActive = true;
        const overlay = document.getElementById("command-palette");
        const input = document.getElementById("palette-input-field");
        
        if (overlay && input) {
            overlay.classList.add("active");
            input.value = "";
            input.focus();
            this.paletteSelectedIndex = 0;
            this.filterPaletteResults();
            this.synth.playClick();
        }
    }

    closePalette() {
        this.paletteActive = false;
        const overlay = document.getElementById("command-palette");
        if (overlay) {
            overlay.classList.remove("active");
        }
    }

    filterPaletteResults() {
        const input = document.getElementById("palette-input-field");
        const query = input ? input.value.toLowerCase() : "";
        const resultsContainer = document.getElementById("palette-results-list");
        if (!resultsContainer) return;

        resultsContainer.innerHTML = "";

        const actions = [
            { name: "Go to Operations Workspace", action: () => this.switchView("operations"), type: "Navigation", shortcut: "⌥1" },
            { name: "Go to Staff Console", action: () => this.switchView("staff"), type: "Navigation", shortcut: "⌥2" },
            { name: "Go to Customer Mobile View", action: () => this.switchView("customer"), type: "Navigation", shortcut: "⌥3" },
            { name: "Go to Storytelling Insights", action: () => this.switchView("insights"), type: "Navigation", shortcut: "⌥4" },
            { name: "Add New Client / Check-in", action: () => this.generateRandomCheckin(), type: "System", shortcut: "↵" },
            { name: "Call Next Client (Current Counter)", action: () => this.callNextClient(this.selectedCounterId), type: "Action", shortcut: "Space" },
            { name: "Toggle Notification Sounds", action: () => this.toggleSound(), type: "System", shortcut: "⌥S" },
            { name: "Toggle Light/Dark Theme", action: () => {
                const isLight = document.body.classList.toggle("light-mode");
                localStorage.setItem("flow-theme", isLight ? "light" : "dark");
                this.synth.playClick();
            }, type: "System", shortcut: "⌥T" }
        ];

        const filteredActions = actions.filter(a => a.name.toLowerCase().includes(query) || a.type.toLowerCase().includes(query));

        // Group Results
        let html = "";
        if (filteredActions.length > 0) {
            html += `<div class="palette-group-title">Commands</div>`;
            filteredActions.forEach((act, idx) => {
                const isSelected = idx === this.paletteSelectedIndex;
                html += `
                    <div class="palette-item ${isSelected ? 'selected' : ''}" data-idx="${idx}">
                        <div class="palette-item-left">
                            <svg class="palette-item-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            <span class="palette-item-name">${act.name}</span>
                        </div>
                        <span class="palette-item-shortcut">${act.shortcut}</span>
                    </div>
                `;
            });
        }

        // Show active waiting list in Palette
        const waitingClients = this.clients.filter(c => c.status === "waiting" || c.status === "called");
        const filteredClients = waitingClients.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query));
        
        if (filteredClients.length > 0) {
            html += `<div class="palette-group-title">Clients In Queue</div>`;
            filteredClients.forEach((client, idx) => {
                const globalIndex = filteredActions.length + idx;
                const isSelected = globalIndex === this.paletteSelectedIndex;
                html += `
                    <div class="palette-item ${isSelected ? 'selected' : ''}" data-idx="${globalIndex}">
                        <div class="palette-item-left">
                            <svg class="palette-item-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg>
                            <span class="palette-item-name">${client.name} (${client.id})</span>
                        </div>
                        <span class="palette-item-shortcut">${client.status.toUpperCase()}</span>
                    </div>
                `;
            });
        }

        if (html === "") {
            html = `<div style="padding: 16px; font-size:12px; color:var(--text-secondary); text-align:center;">No results found</div>`;
        }

        resultsContainer.innerHTML = html;

        // Bind clicks to items
        const items = resultsContainer.querySelectorAll(".palette-item");
        items.forEach(item => {
            item.addEventListener("click", () => {
                const idx = parseInt(item.getAttribute("data-idx"));
                this.executePaletteIndex(idx, filteredActions, filteredClients);
            });
        });

        this.paletteMaxIndex = filteredActions.length + filteredClients.length - 1;
    }

    executePaletteIndex(idx, actions, clients) {
        if (idx <= actions.length - 1) {
            actions[idx].action();
        } else {
            const clientIdx = idx - actions.length;
            const client = clients[clientIdx];
            if (client) {
                // Focus customer view on this client
                this.customerMobileTicketId = client.id;
                this.switchView("customer");
            }
        }
        this.closePalette();
    }

    // Render Engines
    renderAll() {
        this.renderOperationsWorkspace();
        this.renderStaffWorkspace();
        this.renderCustomerView();
        this.renderInsightsWorkspace();
    }

    // 1. Render Operations Workspace
    renderOperationsWorkspace() {
        if (this.currentView !== "operations") return;

        // Render Attention Cards (Dynamic warnings)
        const attentionDeck = document.getElementById("ops-attention-deck");
        if (attentionDeck) {
            attentionDeck.innerHTML = "";
            let warnings = [];

            // A: Congested clients (waiting > target time)
            this.clients.forEach(c => {
                if (c.status === "waiting" && c.waitDuration >= this.targetWaitTime) {
                    warnings.push({
                        text: `Client ${c.name} (${c.id}) waiting ${c.waitDuration}m for service.`,
                        meta: "Exceeds Flow service targets",
                        type: "warning",
                        actionLabel: "Direct Call",
                        action: () => {
                            // Assign this client immediately to staff counter
                            this.assignDirectlyToCounter(c.id, this.selectedCounterId);
                        }
                    });
                }
            });

            // B: Idle counters
            this.counters.forEach(cntr => {
                const waitCount = this.clients.filter(c => c.status === "waiting").length;
                if (cntr.status === "idle" && waitCount > 0 && cntr.idleDuration >= 5) {
                    warnings.push({
                        text: `${cntr.name} is currently idle while ${waitCount} client(s) wait.`,
                        meta: `Staff member ${cntr.staffName} is waiting for next instruction`,
                        type: "warning",
                        actionLabel: "Call Next",
                        action: () => {
                            this.callNextClient(cntr.id);
                        }
                    });
                }
            });

            if (warnings.length === 0) {
                // Normal calm reassurance state
                attentionDeck.innerHTML = `
                    <div class="attention-card success-alert">
                        <div class="attention-info">
                            <div class="attention-indicator"></div>
                            <div class="attention-text-wrapper">
                                <div class="attention-text">Congestion free. Service flow operations are optimal.</div>
                                <div class="attention-meta">All active counters are running within target response metrics.</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                warnings.forEach(w => {
                    const card = document.createElement("div");
                    card.className = "attention-card";
                    card.innerHTML = `
                        <div class="attention-info">
                            <div class="attention-indicator"></div>
                            <div class="attention-text-wrapper">
                                <div class="attention-text">${w.text}</div>
                                <div class="attention-meta">${w.meta}</div>
                            </div>
                        </div>
                    `;
                    const btn = document.createElement("button");
                    btn.className = "attention-action-btn";
                    btn.innerText = w.actionLabel;
                    btn.onclick = () => {
                        w.action();
                    };
                    card.appendChild(btn);
                    attentionDeck.appendChild(card);
                });
            }
        }

        // Render Counters Grid
        const countersGrid = document.getElementById("ops-counters-grid");
        if (countersGrid) {
            countersGrid.innerHTML = "";
            this.counters.forEach(cntr => {
                const activeClient = cntr.activeClientId ? this.clients.find(c => c.id === cntr.activeClientId) : null;
                const statusClass = cntr.status === "idle" ? "idle" : "active";
                
                countersGrid.innerHTML += `
                    <div class="counter-card ${statusClass}" onclick="flowSys.selectCounter(${cntr.id})">
                        <div class="counter-header">
                            <span class="counter-name">${cntr.name}</span>
                            <span class="counter-status-pill">${cntr.status}</span>
                        </div>
                        <div class="counter-patient-name">
                            ${activeClient ? activeClient.name : "None (Idle)"}
                        </div>
                        <div class="counter-patient-id">
                            ${activeClient ? activeClient.id : cntr.staffName}
                        </div>
                        <div class="counter-stats">
                            <span class="counter-stat-item">Done: <strong>${cntr.workCount}</strong></span>
                            <span class="counter-stat-item">Speed: <strong>+${Math.round((cntr.speedModifier - 1) * 100)}%</strong></span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Pulse Live Timeline
        const timelineList = document.getElementById("ops-timeline-list");
        const timelineBadge = document.getElementById("ops-timeline-badge");
        const waitingClients = this.clients.filter(c => c.status === "waiting" || c.status === "called");
        
        if (timelineBadge) {
            timelineBadge.innerText = `${waitingClients.length} clients`;
        }

        if (timelineList) {
            timelineList.innerHTML = "";
            if (waitingClients.length === 0) {
                timelineList.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; height:100%; color:var(--text-tertiary);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"/></svg>
                        <span style="font-size:13px; font-weight:500;">Workspace Empty</span>
                    </div>
                `;
            } else {
                waitingClients.forEach(c => {
                    const initials = c.name.split(" ").map(n => n[0]).join("");
                    let waitClass = "";
                    if (c.waitDuration >= 15) waitClass = "danger";
                    else if (c.waitDuration >= 10) waitClass = "warning";
                    
                    timelineList.innerHTML += `
                        <div class="timeline-item">
                            <div class="timeline-patient-details">
                                <div class="timeline-avatar">${initials}</div>
                                <div class="timeline-patient-info">
                                    <span class="timeline-patient-name">${c.name}</span>
                                    <span class="timeline-patient-meta">${c.id} • Checked-in ${c.waitDuration}m ago</span>
                                </div>
                            </div>
                            <div class="timeline-wait">
                                <span class="timeline-wait-time ${waitClass}">${c.waitDuration}m</span>
                                <span class="timeline-wait-label">Wait Time</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    assignDirectlyToCounter(clientId, counterId) {
        const client = this.clients.find(c => c.id === clientId);
        const counter = this.counters.find(c => c.id === counterId);
        
        if (client && counter) {
            // Cancel counter active first if exists
            if (counter.activeClientId) {
                this.completeCounterClient(counterId);
            }
            client.status = "called";
            client.calledAt = this.simulationTicks;
            client.counterId = counterId;

            counter.status = "serving";
            counter.activeClientId = clientId;
            
            this.synth.playShutter();
            this.triggerDynamicIslandNotification("DIRECT ROUTE", `${client.name} to ${counter.name}`);
        }
        this.renderAll();
    }

    selectCounter(id) {
        this.selectedCounterId = id;
        this.synth.playClick();
        this.renderAll();
    }

    // 2. Render Staff Workspace
    renderStaffWorkspace() {
        if (this.currentView !== "staff") return;

        const counter = this.counters.find(c => c.id === this.selectedCounterId);
        if (!counter) return;

        // Active Picker button
        document.querySelectorAll(".counter-picker-btn").forEach(btn => {
            const cid = parseInt(btn.getAttribute("data-counter-id"));
            if (cid === this.selectedCounterId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update active staff stats
        const staffTitle = document.getElementById("staff-console-title");
        const staffSub = document.getElementById("staff-console-sub");
        if (staffTitle && staffSub) {
            staffTitle.innerText = counter.name;
            staffSub.innerText = `${counter.serviceType} • ${counter.staffName}`;
        }

        // Active client details
        const detailsContainer = document.getElementById("staff-active-client-details");
        if (detailsContainer) {
            detailsContainer.innerHTML = "";
            const activeClient = counter.activeClientId ? this.clients.find(c => c.id === counter.activeClientId) : null;

            if (activeClient) {
                const durationLabel = activeClient.status === "called" ? "Called" : "Serving";
                detailsContainer.innerHTML = `
                    <div class="staff-active-meta">
                        <span class="sim-label">${activeClient.id} • Status: ${activeClient.status.toUpperCase()}</span>
                        <span class="active-duration-badge" id="active-duration-counter">
                            ${activeClient.serveDuration}m ${durationLabel}
                        </span>
                    </div>
                    <div class="staff-active-name">${activeClient.name}</div>
                    <div class="staff-action-row">
                        <button class="staff-btn btn-primary" onclick="flowSys.startServingActiveClient(${counter.id})" ${activeClient.status === 'serving' ? 'disabled' : ''}>
                            Start Serve
                        </button>
                        <button class="staff-btn" onclick="flowSys.completeCounterClient(${counter.id})">
                            Done
                        </button>
                        <button class="staff-btn" onclick="flowSys.recallClient(${counter.id})" ${activeClient.status === 'serving' ? 'disabled' : ''}>
                            Recall
                        </button>
                    </div>
                `;
            } else {
                // Idle state
                detailsContainer.innerHTML = `
                    <div class="staff-active-meta">
                        <span class="sim-label">COUNTER STATE</span>
                        <span class="active-duration-badge idle">
                            ${counter.idleDuration}m Idle
                        </span>
                    </div>
                    <div class="staff-active-name" style="color:var(--text-tertiary);">No Active Client</div>
                    <div class="staff-action-row">
                        <button class="staff-btn btn-primary" style="flex:1" onclick="flowSys.callNextClient(${counter.id})">
                            Call Next (Space)
                        </button>
                    </div>
                `;
            }
        }
    }

    // 3. Render Customer View (Mobile iPhone Simulation)
    renderCustomerView() {
        // Render Ticket Dropdown Selector
        const select = document.getElementById("mobile-ticket-select");
        if (select) {
            const currentSelected = select.value;
            select.innerHTML = "";
            
            // Show waiting, called and serving clients
            const activeClients = this.clients.filter(c => c.status !== "completed");
            activeClients.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.innerText = `${c.name} (${c.id}) - ${c.status}`;
                select.appendChild(opt);
            });

            // Set visual option
            if (activeClients.find(c => c.id === this.customerMobileTicketId)) {
                select.value = this.customerMobileTicketId;
            } else if (activeClients.length > 0) {
                this.customerMobileTicketId = activeClients[0].id;
                select.value = this.customerMobileTicketId;
            }
        }

        this.updateCustomerView();
    }

    updateCustomerView() {
        const client = this.clients.find(c => c.id === this.customerMobileTicketId);
        const cardArea = document.getElementById("mobile-interaction-card");
        if (!cardArea) return;

        cardArea.innerHTML = "";

        if (!client) {
            // Empty view
            cardArea.innerHTML = `
                <div style="padding:48px 16px; text-align:center; color:var(--text-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3m-3-6h10.5m-15 2.25h15m-15 4.5h15M2.25 12a9.75 9.75 0 1 1 19.5 0 9.75 9.75 0 0 1-19.5 0Z"/></svg>
                    <div style="font-size:12px; font-weight:500;">No active ticket scanned</div>
                </div>
            `;
            return;
        }

        // Calculate queue metrics
        const queuePosition = this.clients.filter(c => c.status === "waiting" && c.checkedInAt <= client.checkedInAt).length;
        const estWait = queuePosition * 3; // 3 mins per person

        // SVG progress ring calculation
        const strokeMax = 314; // Circle Circumference
        let progressPercent = 0;
        
        const waitingPool = this.clients.filter(c => c.status === "waiting");
        const totalWaiting = waitingPool.length + 1; // plus serving/current
        
        if (client.status === "waiting") {
            // Less wait = higher progress
            progressPercent = Math.max(0.05, 1 - (queuePosition / totalWaiting));
        } else if (client.status === "called") {
            progressPercent = 0.95;
        } else if (client.status === "serving" || client.status === "completed") {
            progressPercent = 1.0;
        }
        
        const strokeOffset = strokeMax - (progressPercent * strokeMax);

        // Core status rendering
        if (client.status === "waiting") {
            cardArea.innerHTML = `
                <div class="progress-card">
                    <div class="radial-progress-container">
                        <svg class="radial-svg">
                            <circle class="radial-bg" cx="60" cy="60" r="50"></circle>
                            <circle class="radial-bar" cx="60" cy="60" r="50" style="stroke-dashoffset:${strokeOffset}"></circle>
                        </svg>
                        <div class="radial-label-container">
                            <span class="radial-number">${queuePosition === 0 ? "1st" : queuePosition + 1}</span>
                            <span class="radial-sub">In Line</span>
                        </div>
                    </div>
                    <div class="mobile-wait-time-row">
                        <div class="mobile-wait-metric">
                            <div class="mobile-wait-metric-val">${estWait}m</div>
                            <div class="mobile-wait-metric-lbl">Est. Wait</div>
                        </div>
                        <div class="mobile-wait-metric">
                            <div class="mobile-wait-metric-val">${client.id}</div>
                            <div class="mobile-wait-metric-lbl">Ticket</div>
                        </div>
                    </div>
                </div>
                
                <div class="mobile-next-steps-card">
                    <div class="mobile-card-title">Next Steps</div>
                    
                    <div class="mobile-step-item active">
                        <div class="mobile-step-bullet"></div>
                        <div class="mobile-step-content">
                            <span class="mobile-step-title">Wait in Comfort</span>
                            <span class="mobile-step-desc">We will notify you immediately here when your turn is ready.</span>
                        </div>
                    </div>
                    
                    <div class="mobile-step-item">
                        <div class="mobile-step-bullet"></div>
                        <div class="mobile-step-content">
                            <span class="mobile-step-title">Proceed to Consultation</span>
                            <span class="mobile-step-desc">Your designated service station will appear on screen.</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (client.status === "called" || client.status === "serving") {
            const counter = this.counters.find(c => c.id === client.counterId);
            const station = counter ? counter.name : "Counter 1";
            const doctor = counter ? counter.staffName : "Staff Member";
            const service = counter ? counter.serviceType : "Consultation";
            
            cardArea.innerHTML = `
                <div class="client-call-alert">
                    <div class="call-alert-title">${client.status.toUpperCase()}</div>
                    <div class="call-alert-counter">Go to ${station}</div>
                    <div class="call-alert-desc">Staff: ${doctor}</div>
                    <div class="call-alert-desc" style="margin-top:4px; font-weight:600; color:var(--text-primary);">${service}</div>
                </div>
                
                <div class="mobile-next-steps-card">
                    <div class="mobile-card-title">Your Progress</div>
                    
                    <div class="mobile-step-item completed">
                        <div class="mobile-step-bullet"></div>
                        <div class="mobile-step-content">
                            <span class="mobile-step-title">Checked In</span>
                            <span class="mobile-step-desc">Completed</span>
                        </div>
                    </div>
                    
                    <div class="mobile-step-item active">
                        <div class="mobile-step-bullet"></div>
                        <div class="mobile-step-content">
                            <span class="mobile-step-title">Report to ${station}</span>
                            <span class="mobile-step-desc">Currently in progress. Please present yourself to the station.</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 4. Render Insights Workspace (Actionable insights storytelling)
    renderInsightsWorkspace() {
        if (this.currentView !== "insights") return;

        const mainLayout = document.getElementById("insights-cards-grid");
        if (!mainLayout) return;

        // Compute simulated statistics for dynamic insights
        const totalCompleted = this.clients.filter(c => c.status === "completed").length + 55; // baseline added
        const avgWait = Math.round(this.clients.reduce((acc, c) => acc + c.waitDuration, 0) / this.clients.length) || 6;
        
        // Find fastest counter
        let fastestCounter = this.counters[3]; // baseline Pharmacy
        this.counters.forEach(c => {
            if (c.speedModifier > fastestCounter.speedModifier) {
                fastestCounter = c;
            }
        });
        
        mainLayout.innerHTML = `
            <!-- Insight Card 1 -->
            <div class="insight-card success-insight">
                <div class="insight-icon-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"/></svg>
                </div>
                <div class="insight-card-title">Congestion peaks during lunchtime hours</div>
                <div class="insight-card-text">
                    Mondays between 11:30 and 13:00 consistently encounter a 40% check-in surge. System historical data recommends shifting Counter 3 staff resources 15 minutes earlier to offset queue backlogs.
                </div>
                <span class="insight-action-link" onclick="flowSys.simulatePeakHour()">
                    Test peak check-in surge
                </span>
            </div>

            <!-- Insight Card 2 -->
            <div class="insight-card">
                <div class="insight-icon-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/></svg>
                </div>
                <div class="insight-card-title">${fastestCounter.name} processes clients ${Math.round((fastestCounter.speedModifier - 1) * 100)}% faster</div>
                <div class="insight-card-text">
                    Under staffing lead <strong>${fastestCounter.staffName}</strong>, service turnaround time averages 5.2 minutes per patient, making it the most optimized node in the building.
                </div>
                <span class="insight-action-link" onclick="flowSys.switchView('staff')">
                    Go to workspace controls
                </span>
            </div>

            <!-- Insight Card 3 -->
            <div class="insight-card warning-insight">
                <div class="insight-icon-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.3c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>
                </div>
                <div class="insight-card-title">Average waiting duration dropped to ${avgWait}m</div>
                <div class="insight-card-text">
                    Wait times have successfully lowered after opening Counter 4. Retaining this setup ensures client retention scores remain within normal operational safety parameters.
                </div>
                <span class="insight-action-link" onclick="flowSys.simulateAddCounter()">
                    Open another mock counter
                </span>
            </div>
        `;
    }

    simulatePeakHour() {
        this.synth.playChime();
        this.generateRandomCheckin();
        this.generateRandomCheckin();
        this.generateRandomCheckin();
        this.renderAll();
    }

    simulateAddCounter() {
        this.synth.playChime();
        const nextId = this.counters.length + 1;
        const newCntr = {
            id: nextId,
            name: `Counter ${nextId}`,
            serviceType: "Specialist Consultation",
            staffName: "Dr. Elena Rostova",
            activeClientId: null,
            status: "idle",
            idleDuration: 0,
            workCount: 0,
            speedModifier: 1.1
        };
        this.counters.push(newCntr);
        
        // Add to picker in HTML staff console
        const picker = document.getElementById("staff-counter-picker");
        if (picker) {
            picker.innerHTML += `
                <button class="counter-picker-btn" data-counter-id="${nextId}" onclick="flowSys.selectCounter(${nextId})">
                    C${nextId}
                </button>
            `;
        }
        
        this.renderAll();
    }

    // Set up UI Event listeners
    setupEventListeners() {
        // Floating Dock view trigger bindings
        document.querySelectorAll(".dock-item").forEach(item => {
            item.addEventListener("click", () => {
                const targetView = item.getAttribute("data-view");
                this.switchView(targetView);
            });
        });

        // Command Palette bindings
        const overlay = document.getElementById("command-palette");
        const input = document.getElementById("palette-input-field");

        if (input) {
            input.addEventListener("input", () => {
                this.paletteSelectedIndex = 0;
                this.filterPaletteResults();
            });

            input.addEventListener("keydown", (e) => {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (this.paletteSelectedIndex < this.paletteMaxIndex) {
                        this.paletteSelectedIndex++;
                        this.filterPaletteResults();
                        this.synth.playClick();
                    }
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (this.paletteSelectedIndex > 0) {
                        this.paletteSelectedIndex--;
                        this.filterPaletteResults();
                        this.synth.playClick();
                    }
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    const resultsContainer = document.getElementById("palette-results-list");
                    const selectedEl = resultsContainer ? resultsContainer.querySelector(".palette-item.selected") : null;
                    if (selectedEl) {
                        selectedEl.click();
                    }
                } else if (e.key === "Escape") {
                    this.closePalette();
                }
            });
        }

        // Close palette click outer
        if (overlay) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    this.closePalette();
                }
            });
        }

        // Customer mobile ticket select handler
        const select = document.getElementById("mobile-ticket-select");
        if (select) {
            select.addEventListener("change", (e) => {
                this.customerMobileTicketId = e.target.value;
                this.updateCustomerView();
                this.synth.playClick();
            });
        }

        // Audio toggle button handler
        const soundBtn = document.getElementById("sound-toggle");
        if (soundBtn) {
            soundBtn.addEventListener("click", () => this.toggleSound());
        }

        // Theme toggle button handler
        const themeBtn = document.getElementById("theme-toggle");
        if (themeBtn) {
            // Apply loaded theme if saved
            if (localStorage.getItem("flow-theme") === "light") {
                document.body.classList.add("light-mode");
            }
            themeBtn.addEventListener("click", () => {
                const isLight = document.body.classList.toggle("light-mode");
                localStorage.setItem("flow-theme", isLight ? "light" : "dark");
                this.synth.playClick();
            });
        }

        // Global hotkeys (Muscle memory)
        window.addEventListener("keydown", (e) => {
            // Ctrl+K or Cmd+K toggles palette
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                if (this.paletteActive) this.closePalette();
                else this.openPalette();
            }

            // Keyboard shortcut navigation when palette is closed
            if (!this.paletteActive) {
                // Space: Call Next Client for active counter (Staff console focus)
                if (e.key === " " && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT" && this.currentView === "staff") {
                    e.preventDefault();
                    this.callNextClient(this.selectedCounterId);
                }

                // Return: Start serving client
                if (e.key === "Enter" && e.target.tagName !== "INPUT" && this.currentView === "staff") {
                    e.preventDefault();
                    this.startServingActiveClient(this.selectedCounterId);
                }

                // D: Done
                if (e.key.toLowerCase() === "d" && e.target.tagName !== "INPUT" && this.currentView === "staff") {
                    e.preventDefault();
                    this.completeCounterClient(this.selectedCounterId);
                }

                // R: Recall
                if (e.key.toLowerCase() === "r" && e.target.tagName !== "INPUT" && this.currentView === "staff") {
                    e.preventDefault();
                    this.recallClient(this.selectedCounterId);
                }

                // Alt + 1,2,3,4 View switches
                if (e.altKey && e.key === "1") { e.preventDefault(); this.switchView("operations"); }
                if (e.altKey && e.key === "2") { e.preventDefault(); this.switchView("staff"); }
                if (e.altKey && e.key === "3") { e.preventDefault(); this.switchView("customer"); }
                if (e.altKey && e.key === "4") { e.preventDefault(); this.switchView("insights"); }
                
                // Alt + T Theme toggle
                if (e.altKey && e.key.toLowerCase() === "t") {
                    e.preventDefault();
                    const isLight = document.body.classList.toggle("light-mode");
                    localStorage.setItem("flow-theme", isLight ? "light" : "dark");
                    this.synth.playClick();
                }
            }
        });

        // Simulation Slider speed change
        const slider = document.getElementById("sim-speed-slider");
        if (slider) {
            slider.addEventListener("input", (e) => {
                const val = parseInt(e.target.value);
                this.setSimSpeed(val);
            });
        }
    }
}

// Initializer
let flowSys;
window.addEventListener("DOMContentLoaded", () => {
    flowSys = new FlowQueueSystem();
    flowSys.init();
    // Expose globally for HTML event handlers
    window.flowSys = flowSys;
});
