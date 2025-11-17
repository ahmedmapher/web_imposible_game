const term = document.getElementById('terminal');
let username = '';
let currentLine = '';
const history = [];
let historyIndex = -1;

function createPrompt(promptText = '>') {
    const line = document.createElement('div');
    line.className = 'line';
    
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = promptText + ' ';
    line.appendChild(prompt);

    const input = document.createElement('span');
    input.className = 'input-line';
    line.appendChild(input);

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    line.appendChild(cursor);
    
    term.appendChild(line);
    scrollToBottom();
    return input;
}

function append(text, cls) {
    const el = document.createElement('div');
    el.textContent = text;
    el.className = `line ${cls || ''}`;
    term.appendChild(el);
    scrollToBottom();
}

function scrollToBottom() {
    term.scrollTop = term.scrollHeight;
}

let inputElement;

function startSession() {
    term.innerHTML = '';
    append("Welcome, agent. Standard user account provisioned.");
    append("Please provide your callsign to begin.");
    inputElement = createPrompt('Enter Callsign:');
}

async function callApi(path, body) {
    try {
        const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) {
            append('ERR: ' + (data.message || `Request failed with status ${res.status}`), 'err');
            return null;
        }
        return data;
    } catch (error) {
        append('ERR: Failed to connect to server or parse response.', 'err');
        return null;
    }
}

async function processCommand(cmd) {
    if (cmd === 'clear') {
        startSession();
        return;
    }
    
    history.push(cmd);
    historyIndex = history.length;
    
    const j = await callApi('/api/command', { cmd, name: username });
    if (j && j.status === 'ok') {
        if (j.balance !== undefined) append('Balance: ' + j.balance, 'out');
        if (j.price !== undefined) append('Price: ' + j.price, 'out');
        if (j.flag) append('FLAG: ' + j.flag, 'out');
        if (j.help) append('Commands: ' + j.help.join(', '), 'out');
        if (j.message) append(j.message, 'out');
    }
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === term) {
        e.preventDefault();
    }

    const key = e.key;

    if (key === 'Enter') {
        const currentCursor = term.querySelector('.cursor');
        if (currentCursor) currentCursor.remove();
        
        const cmd = currentLine.trim();
        append(`${inputElement.previousSibling.textContent}${cmd}`);
        
        if (username === '') {
            username = cmd || 'agent';
            currentLine = '';
            append(`Welcome, ${username}. Type 'help' for available commands.`);
            inputElement = createPrompt(`${username}@terminal:~$`);
        } else if (cmd) {
            processCommand(cmd).then(() => {
                currentLine = '';
                inputElement = createPrompt(`${username}@terminal:~$`);
            });
        } else {
            inputElement = createPrompt(`${username}@terminal:~$`);
        }
        
    } else if (key === 'Backspace') {
        currentLine = currentLine.slice(0, -1);
        inputElement.textContent = currentLine;
    } else if (key === 'ArrowUp') {
        if (history.length > 0 && historyIndex > 0) {
            historyIndex--;
            currentLine = history[historyIndex];
            inputElement.textContent = currentLine;
        }
    } else if (key === 'ArrowDown') {
        if (history.length > 0 && historyIndex < history.length - 1) {
            historyIndex++;
            currentLine = history[historyIndex];
            inputElement.textContent = currentLine;
        } else {
            historyIndex = history.length;
            currentLine = '';
            inputElement.textContent = currentLine;
        }
    } else if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
    } else if (key.length === 1) {
        currentLine += key;
        inputElement.textContent = currentLine;
    }
});

term.addEventListener('click', () => term.focus());
startSession();
term.focus();
