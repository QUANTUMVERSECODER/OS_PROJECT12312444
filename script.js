// Process Class Definition
class Process {
    constructor(id, name, priority = 'medium') {
        this.id = id;
        this.name = name;
        this.status = 'ready';
        this.priority = priority;
        this.cpuUsage = 0;
        this.memory = Math.floor(Math.random() * 100) + 50; // Random memory between 50-150MB
        this.burstTime = Math.floor(Math.random() * 10) + 5; // Random burst time between 5-15 seconds
        this.arrivalTime = Date.now();
    }
}

// Memory Management Class
class MemoryManager {
    constructor(totalMemory = 1024) {
        this.totalMemory = totalMemory;
        this.usedMemory = 0;
        this.memoryBlocks = Array(32).fill(null); // 32 memory blocks
    }

    allocate(process) {
        const blocksNeeded = Math.ceil(process.memory / (this.totalMemory / this.memoryBlocks.length));
        let consecutiveBlocks = 0;
        let startBlock = -1;

        // First-fit memory allocation
        for (let i = 0; i < this.memoryBlocks.length; i++) {
            if (this.memoryBlocks[i] === null) {
                if (consecutiveBlocks === 0) startBlock = i;
                consecutiveBlocks++;
                if (consecutiveBlocks === blocksNeeded) {
                    // Allocate memory blocks
                    for (let j = startBlock; j < startBlock + blocksNeeded; j++) {
                        this.memoryBlocks[j] = process.id;
                    }
                    this.usedMemory += process.memory;
                    return true;
                }
            } else {
                consecutiveBlocks = 0;
            }
        }
        return false;
    }

    deallocate(processId) {
        for (let i = 0; i < this.memoryBlocks.length; i++) {
            if (this.memoryBlocks[i] === processId) {
                this.memoryBlocks[i] = null;
            }
        }
        this.updateMemoryUsage();
    }

    updateMemoryUsage() {
        const allocatedBlocks = this.memoryBlocks.filter(block => block !== null).length;
        this.usedMemory = Math.floor((allocatedBlocks / this.memoryBlocks.length) * this.totalMemory);
    }
}

// Process Scheduler Class
class ProcessScheduler {
    constructor() {
        this.processes = [];
        this.currentProcess = null;
        this.algorithm = 'fcfs';
        this.quantum = 2000; // 2 seconds for Round Robin
        this.isRunning = false;
    }

    addProcess(process) {
        this.processes.push(process);
        this.updateProcessTable();
    }

    removeProcess(processId) {
        const index = this.processes.findIndex(p => p.id === processId);
        if (index !== -1) {
            this.processes.splice(index, 1);
            memoryManager.deallocate(processId);
            this.updateProcessTable();
        }
    }

    setAlgorithm(algorithm) {
        this.algorithm = algorithm;
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }

    start() {
        this.isRunning = true;
        this.scheduleNext();
    }

    stop() {
        this.isRunning = false;
        if (this.currentProcess) {
            this.currentProcess.status = 'ready';
            this.currentProcess = null;
        }
        clearTimeout(this.timeoutId);
    }

    scheduleNext() {
        if (!this.isRunning) return;

        if (this.currentProcess) {
            this.currentProcess.status = 'ready';
        }

        let nextProcess;
        switch (this.algorithm) {
            case 'fcfs':
                nextProcess = this.processes.find(p => p.status === 'ready');
                break;
            case 'sjf':
                nextProcess = this.processes
                    .filter(p => p.status === 'ready')
                    .sort((a, b) => a.burstTime - b.burstTime)[0];
                break;
            case 'priority':
                nextProcess = this.processes
                    .filter(p => p.status === 'ready')
                    .sort((a, b) => {
                        const priorityMap = { high: 3, medium: 2, low: 1 };
                        return priorityMap[b.priority] - priorityMap[a.priority];
                    })[0];
                break;
        }

        if (nextProcess) {
            this.currentProcess = nextProcess;
            this.currentProcess.status = 'running';
            this.currentProcess.cpuUsage = Math.min(100, this.currentProcess.cpuUsage + 20);

            this.timeoutId = setTimeout(() => {
                this.currentProcess.burstTime--;
                if (this.currentProcess.burstTime <= 0) {
                    this.currentProcess.status = 'terminated';
                    this.removeProcess(this.currentProcess.id);
                }
                this.scheduleNext();
            }, 1000);
        }

        this.updateProcessTable();
    }

    updateProcessTable() {
        const tableBody = document.getElementById('process-table-body');
        tableBody.innerHTML = '';

        this.processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.name}</td>
                <td><span class="status-badge ${process.status}">${process.status}</span></td>
                <td><span class="priority-badge ${process.priority}">${process.priority}</span></td>
                <td>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${process.cpuUsage}%"></div>
                    </div>
                    ${process.cpuUsage}%
                </td>
                <td>${process.memory} MB</td>
                <td>
                    <button onclick="scheduler.removeProcess(${process.id})" class="btn-terminate">
                        Terminate
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update system stats
        const runningProcess = this.processes.find(p => p.status === 'running');
        document.getElementById('cpu-usage').textContent = `CPU: ${runningProcess ? runningProcess.cpuUsage : 0}%`;
    }
}

// Terminal Class
class Terminal {
    constructor() {
        this.history = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const input = document.getElementById('terminal-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = input.value;
                this.executeCommand(command);
                input.value = '';
            }
        });
    }

    executeCommand(command) {
        const parts = command.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        let output = '';

        switch (cmd) {
            case 'help':
                output = `
Available commands:
  ps          - List all processes
  kill <pid>  - Terminate a process
  clear       - Clear terminal
  help        - Show this help message
`;
                break;

            case 'ps':
                output = 'PID\tNAME\t\tSTATUS\t\tCPU\tMEMORY\n';
                scheduler.processes.forEach(p => {
                    output += `${p.id}\t${p.name}\t\t${p.status}\t\t${p.cpuUsage}%\t${p.memory}MB\n`;
                });
                break;

            case 'kill':
                const pid = parseInt(args[0]);
                if (pid) {
                    scheduler.removeProcess(pid);
                    output = `Process ${pid} terminated`;
                } else {
                    output = 'Usage: kill <pid>';
                }
                break;

            case 'clear':
                document.getElementById('terminal-output').innerHTML = '';
                return;

            default:
                output = `Command not found: ${cmd}. Type 'help' for available commands.`;
        }

        this.appendOutput(`$ ${command}\n${output}\n`);
    }

    appendOutput(text) {
        const terminal = document.getElementById('terminal-output');
        terminal.innerHTML += text;
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Initialize system components
const memoryManager = new MemoryManager();
const scheduler = new ProcessScheduler();
const terminal = new Terminal();

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show active tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Process control buttons
    document.getElementById('new-process').addEventListener('click', () => {
        const process = new Process(
            Date.now(),
            `Process_${Math.floor(Math.random() * 1000)}`,
            ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
        );
        
        if (memoryManager.allocate(process)) {
            scheduler.addProcess(process);
        } else {
            alert('Not enough memory to create new process');
        }
    });

    document.getElementById('start-simulation').addEventListener('click', () => {
        scheduler.start();
        document.getElementById('status-messages').textContent = 'Simulation running';
    });

    document.getElementById('pause-simulation').addEventListener('click', () => {
        scheduler.stop();
        document.getElementById('status-messages').textContent = 'Simulation paused';
    });

    document.getElementById('scheduling-algorithm').addEventListener('change', (e) => {
        scheduler.setAlgorithm(e.target.value);
    });

    // Update clock
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString();
    }, 1000);

    // Initialize memory blocks UI
    const memoryBlocksContainer = document.getElementById('memory-blocks');
    for (let i = 0; i < memoryManager.memoryBlocks.length; i++) {
        const block = document.createElement('div');
        block.className = 'memory-block';
        memoryBlocksContainer.appendChild(block);
    }

    // Update memory visualization
    setInterval(() => {
        const blocks = document.querySelectorAll('.memory-block');
        memoryManager.memoryBlocks.forEach((processId, index) => {
            blocks[index].className = `memory-block ${processId ? 'allocated' : ''}`;
        });

        document.getElementById('used-memory').textContent = `${memoryManager.usedMemory} MB`;
        document.getElementById('free-memory').textContent = 
            `${memoryManager.totalMemory - memoryManager.usedMemory} MB`;
        document.getElementById('memory-usage').textContent = 
            `Memory: ${Math.round((memoryManager.usedMemory / memoryManager.totalMemory) * 100)}%`;
    }, 1000);
});