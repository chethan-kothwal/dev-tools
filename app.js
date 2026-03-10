const inputJson = document.getElementById('inputJson');
const inputLineNumbers = document.getElementById('inputLineNumbers');
const outputContent = document.getElementById('outputContent');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const errorLocation = document.getElementById('errorLocation');
const inputErrorInline = document.getElementById('inputErrorInline');
const appTitle = document.getElementById('appTitle');
const appSubtitle = document.getElementById('appSubtitle');
const toolPicker = document.getElementById('toolPicker');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const jsonToolBtn = document.getElementById('jsonToolBtn');
const yamlToolBtn = document.getElementById('yamlToolBtn');
const jwtToolBtn = document.getElementById('jwtToolBtn');
const cronToolBtn = document.getElementById('cronToolBtn');
const timestampToolBtn = document.getElementById('timestampToolBtn');
const base64HexToolBtn = document.getElementById('base64HexToolBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const autoFixBtn = document.getElementById('autoFixBtn');
const primaryActionBtn = document.getElementById('primaryActionBtn');
const inputPanelTitle = document.getElementById('inputPanelTitle');
const outputPanelTitle = document.getElementById('outputPanelTitle');
const utilityControls = document.getElementById('utilityControls');
const utilModeSelect = document.getElementById('utilModeSelect');
const utilPickFileBtn = document.getElementById('utilPickFileBtn');
const utilClearFileBtn = document.getElementById('utilClearFileBtn');
const utilFileName = document.getElementById('utilFileName');
const utilDownloadBtn = document.getElementById('utilDownloadBtn');
const utilFileInput = document.getElementById('utilFileInput');
const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const resizer = document.getElementById('resizer');
const container = document.querySelector('.container');
const clearBtn = document.querySelector('#leftPanel .btn-group .btn-secondary');
const copyBtn = document.querySelector('#rightPanel .panel-header .btn-secondary');

const TOOL_STORAGE_KEY = 'selected_formatter_tool';
const THEME_STORAGE_KEY = 'selected_ui_theme';
const SIDEBAR_STORAGE_KEY = 'sidebar_visible';
const MAX_CACHED_OUTPUT_CHARS = 200000;
let currentTool = 'json';
let currentTheme = 'light';
let inputErrorState = null;
let utilityMode = 'base64-encode-text';
let utilityFile = null;
let utilityDecodedFile = null;
let inputLineCount = 1;
let renderedErrorLine = null;
const toolInputCache = {
    json: '',
    yaml: '',
    jwt: '',
    cron: '',
    timestamp: '',
    base64hex: ''
};
const toolOutputCache = {
    json: '',
    yaml: '',
    jwt: '',
    cron: '',
    timestamp: '',
    base64hex: ''
};
const toolErrorCache = {
    json: { show: false, text: '', location: '' },
    yaml: { show: false, text: '', location: '' },
    jwt: { show: false, text: '', location: '' },
    cron: { show: false, text: '', location: '' },
    timestamp: { show: false, text: '', location: '' },
    base64hex: { show: false, text: '', location: '' }
};
const toolButtons = {
    json: jsonToolBtn,
    yaml: yamlToolBtn,
    jwt: jwtToolBtn,
    cron: cronToolBtn,
    timestamp: timestampToolBtn,
    base64hex: base64HexToolBtn
};

const TOOL_CONFIG = {
    json: {
        title: 'JSON Formatter',
        subtitle: 'Format, validate, and auto-fix messy JSON instantly.',
        placeholder: 'Paste your messy JSON here...',
        actionLabel: 'Format',
        showAutoFix: true,
        inputTitle: 'JSON Input',
        outputTitle: 'JSON Output'
    },
    yaml: {
        title: 'YAML Formatter',
        subtitle: 'Format, validate, and auto-fix messy YAML instantly.',
        placeholder: 'Paste your messy YAML here...',
        actionLabel: 'Format',
        showAutoFix: true,
        inputTitle: 'YAML Input',
        outputTitle: 'YAML Output'
    },
    jwt: {
        title: 'JWT Token Decoder',
        subtitle: 'Decode and inspect JWT header, payload, and token expiry quickly.',
        placeholder: 'Paste JWT token here: eyJhbGciOi...',
        actionLabel: 'Decode',
        showAutoFix: false,
        inputTitle: 'Token Input',
        outputTitle: 'Decoded Output'
    },
    cron: {
        title: 'Cron Schedule Parser',
        subtitle: 'Validate cron expressions and preview the next execution times.',
        placeholder: 'Enter 5-field cron expression, e.g. */15 * * * *',
        actionLabel: 'Analyze',
        showAutoFix: false,
        inputTitle: 'Schedule Input',
        outputTitle: 'Schedule Preview'
    },
    timestamp: {
        title: 'Unix Timestamp Converter',
        subtitle: 'Convert Unix timestamps and date-time strings between formats.',
        placeholder: 'Enter Unix seconds/ms or ISO date, e.g. 1739606400',
        actionLabel: 'Convert',
        showAutoFix: false,
        inputTitle: 'Time Input',
        outputTitle: 'Conversion Output'
    },
    base64hex: {
        title: 'Base64/Hex Utilities',
        subtitle: 'Encode/decode text, files, and JWT header/payload parts.',
        placeholder: 'Enter text, Base64, Hex, or JWT token/part based on selected mode...',
        actionLabel: 'Run',
        showAutoFix: false,
        inputTitle: 'Utility Input',
        outputTitle: 'Utility Output'
    }
};

if (inputJson) {
    inputJson.addEventListener('input', handleInputChange);
    inputJson.addEventListener('scroll', syncScroll);
}
if (utilModeSelect && !utilModeSelect.value) {
    utilModeSelect.value = utilityMode;
}

function handleInputChange() {
    toolInputCache[currentTool] = inputJson.value;
    const nextLineCount = inputJson.value.split('\n').length;
    if (nextLineCount !== inputLineCount) {
        inputLineCount = nextLineCount;
        updateLineNumbers();
    }
    clearInputErrorMarker();
    errorMessage.classList.remove('show');
}

function updateLineNumbers() {
    const lines = inputLineCount;
    const errorLine = inputErrorState ? inputErrorState.line : null;
    if (renderedErrorLine === errorLine && inputLineNumbers.childElementCount === lines) {
        return;
    }

    const html = [];
    for (let i = 1; i <= lines; i++) {
        const isErrorLine = inputErrorState && inputErrorState.line === i;
        html.push(`<span class="line-number ${isErrorLine ? 'line-number-error' : ''}">${i}</span>`);
    }
    inputLineNumbers.innerHTML = html.join('');
    renderedErrorLine = errorLine;
}

function syncScroll() {
    inputLineNumbers.scrollTop = inputJson.scrollTop;
}

function highlightJson(text) {
    let json = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    json = json.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:');
    json = json.replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>');
    json = json.replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
    json = json.replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>');
    json = json.replace(/: (null)/g, ': <span class="json-null">$1</span>');
    json = json.replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>');
    return json;
}

function highlightYamlValue(valueText) {
    const leading = (valueText.match(/^\s*/) || [''])[0];
    const trailing = (valueText.match(/\s*$/) || [''])[0];
    const trimmed = valueText.trim();

    if (!trimmed) return valueText;

    let cssClass = 'yaml-value';
    if (/^["'][\s\S]*["']$/.test(trimmed)) cssClass = 'yaml-string';
    else if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) cssClass = 'yaml-number';
    else if (/^(true|false|yes|no|on|off)$/i.test(trimmed)) cssClass = 'yaml-boolean';
    else if (/^(null|~)$/i.test(trimmed)) cssClass = 'yaml-null';

    return `${leading}<span class="${cssClass}">${trimmed}</span>${trailing}`;
}

function highlightYaml(text) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (/^\s*#/.test(escaped)) {
        return `<span class="yaml-comment">${escaped}</span>`;
    }

    const keyValueMatch = escaped.match(/^(\s*(?:-\s+)?)((?:"[^"]+"|'[^']+'|[^\s:#][^:#]*?))(\s*:\s*)(.*)$/);
    if (keyValueMatch) {
        const prefix = keyValueMatch[1];
        const key = keyValueMatch[2];
        const separator = keyValueMatch[3];
        const rest = keyValueMatch[4];
        const commentMatch = rest.match(/^(.*?)(\s+#.*)$/);
        const value = commentMatch ? commentMatch[1] : rest;
        const comment = commentMatch ? `<span class="yaml-comment">${commentMatch[2]}</span>` : '';
        return `${prefix}<span class="yaml-key">${key}</span>${separator}${highlightYamlValue(value)}${comment}`;
    }

    const listItemMatch = escaped.match(/^(\s*-\s+)(.*)$/);
    if (listItemMatch) {
        const prefix = listItemMatch[1];
        const rest = listItemMatch[2];
        const commentMatch = rest.match(/^(.*?)(\s+#.*)$/);
        const value = commentMatch ? commentMatch[1] : rest;
        const comment = commentMatch ? `<span class="yaml-comment">${commentMatch[2]}</span>` : '';
        return `${prefix}${highlightYamlValue(value)}${comment}`;
    }

    return escaped;
}

function highlightLine(line) {
    if (currentTool === 'json') {
        return highlightJson(line);
    }
    if (currentTool === 'yaml') {
        return highlightYaml(line);
    }
    return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getToolConfig(tool) {
    return TOOL_CONFIG[tool] || TOOL_CONFIG.json;
}

function updateUtilityFileLabel() {
    if (!utilFileName) return;
    utilFileName.textContent = utilityFile ? `${utilityFile.name} (${utilityFile.bytes.length} bytes)` : 'No file selected';
}

function updateUtilityDownloadState() {
    if (!utilDownloadBtn) return;
    utilDownloadBtn.style.display = utilityDecodedFile ? 'inline-flex' : 'none';
}

function updateUtilityPlaceholder() {
    if (currentTool !== 'base64hex') return;
    const placeholders = {
        'base64-encode-text': 'Enter plain text to encode as Base64...',
        'base64-decode-text': 'Enter Base64 text to decode...',
        'hex-encode-text': 'Enter plain text to encode as hex...',
        'hex-decode-text': 'Enter hex string to decode as text...',
        'base64-encode-file': 'Select a file, then click Run to convert file bytes to Base64...',
        'base64-decode-file': 'Paste Base64 content to decode into a file, then click Download File...',
        'hex-encode-file': 'Select a file, then click Run to convert file bytes to hex...',
        'hex-decode-file': 'Paste hex content to decode into a file, then click Download File...',
        'jwt-decode-header': 'Paste a full JWT token or just a JWT header part...',
        'jwt-decode-payload': 'Paste a full JWT token or just a JWT payload part...',
        'jwt-encode-part': 'Paste JSON/text for a JWT part and encode as Base64URL...'
    };
    inputJson.placeholder = placeholders[utilityMode] || TOOL_CONFIG.base64hex.placeholder;
}

function updateUtilityControlsVisibility() {
    const isUtility = currentTool === 'base64hex';
    if (utilityControls) {
        utilityControls.classList.toggle('show', isUtility);
    }
    if (utilPickFileBtn) {
        const fileMode = utilityMode.includes('-file');
        utilPickFileBtn.style.display = isUtility && fileMode && utilityMode.includes('encode') ? 'inline-flex' : 'none';
    }
    if (utilClearFileBtn) {
        const fileMode = utilityMode.includes('-file');
        utilClearFileBtn.style.display = isUtility && fileMode && utilityMode.includes('encode') ? 'inline-flex' : 'none';
    }
    if (utilFileName) {
        const fileMode = utilityMode.includes('-file');
        utilFileName.style.display = isUtility && fileMode && utilityMode.includes('encode') ? 'inline' : 'none';
    }
    if (!isUtility) {
        utilityFile = null;
        utilityDecodedFile = null;
        if (utilFileInput) {
            utilFileInput.value = '';
        }
    }
    updateUtilityDownloadState();
    updateUtilityFileLabel();
    updateUtilityPlaceholder();
}

function cacheCurrentToolState() {
    if (!TOOL_CONFIG[currentTool]) return;
    toolInputCache[currentTool] = inputJson.value;
    toolErrorCache[currentTool] = {
        show: errorMessage.classList.contains('show'),
        text: errorText.textContent || '',
        location: errorLocation.textContent || ''
    };
}

function restoreToolOutput(tool) {
    const cached = toolOutputCache[tool] || '';
    if (!cached) {
        outputContent.innerHTML = '';
        return;
    }
    displayOutput(cached);
}

function restoreToolError(tool) {
    const cached = toolErrorCache[tool] || { show: false, text: '', location: '' };
    errorText.textContent = cached.text || '';
    errorLocation.textContent = cached.location || '';
    errorMessage.classList.toggle('show', Boolean(cached.show));
}

function setTool(tool, persist = true) {
    cacheCurrentToolState();

    currentTool = TOOL_CONFIG[tool] ? tool : 'json';

    if (persist) {
        localStorage.setItem(TOOL_STORAGE_KEY, currentTool);
    }

    const config = getToolConfig(currentTool);
    appTitle.textContent = config.title;
    appSubtitle.textContent = config.subtitle;
    inputJson.placeholder = config.placeholder;
    primaryActionBtn.textContent = config.actionLabel;
    autoFixBtn.style.display = config.showAutoFix ? 'inline-flex' : 'none';
    inputPanelTitle.textContent = config.inputTitle;
    outputPanelTitle.textContent = config.outputTitle;
    updateUtilityControlsVisibility();

    Object.keys(toolButtons).forEach((key) => {
        toolButtons[key].classList.toggle('active', key === currentTool);
    });

    inputJson.value = toolInputCache[currentTool] || '';
    inputLineCount = inputJson.value ? inputJson.value.split('\n').length : 1;
    inputJson.scrollTop = 0;
    syncScroll();
    clearInputErrorMarker();
    restoreToolOutput(currentTool);
    restoreToolError(currentTool);
    updateLineNumbers();
}

function chooseTool(tool) {
    setTool(tool, true);
    toolPicker.classList.remove('show');
    closeSidebar(true);
}

function selectSidebarTool(tool) {
    setTool(tool, true);
    closeSidebar(true);
}

function initToolChoice() {
    const savedTool = localStorage.getItem(TOOL_STORAGE_KEY);
    if (!savedTool) {
        toolPicker.classList.add('show');
        setTool('json', false);
        return;
    }
    setTool(savedTool, false);
}

function applyTheme(theme, persist = true) {
    currentTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggleBtn.textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

    if (persist) {
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    }
}

function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true);
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
        applyTheme(savedTheme, false);
        return;
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light', false);
}

function setSidebarOpen(isOpen, persist = true) {
    document.body.classList.toggle('sidebar-open', Boolean(isOpen));
    if (sidebarToggleBtn) {
        sidebarToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (sidebar) {
        sidebar.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
    if (sidebarBackdrop) {
        sidebarBackdrop.hidden = !isOpen;
    }

    try {
        if (persist) {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? '1' : '0');
        }
    } catch (e) {}
}

function openSidebar(persist = true) {
    setSidebarOpen(true, persist);
}

function closeSidebar(persist = true) {
    setSidebarOpen(false, persist);
}

function toggleSidebar() {
    const isOpen = !document.body.classList.contains('sidebar-open');
    setSidebarOpen(isOpen, true);
}

function initSidebar() {
    try {
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setSidebarOpen(stored === '1', false);
    } catch (e) {}
    if (sidebarBackdrop && sidebarBackdrop.hidden === false && !document.body.classList.contains('sidebar-open')) {
        sidebarBackdrop.hidden = true;
    }
}

function formatCurrent() {
    if (currentTool === 'yaml') return formatYaml();
    if (currentTool === 'jwt') return decodeJwt();
    if (currentTool === 'cron') return analyzeCron();
    if (currentTool === 'timestamp') return convertTimestamp();
    if (currentTool === 'base64hex') return runBase64HexUtility();
    return formatJson();
}

function formatJson() {
    const input = inputJson.value.trim();
    if (!input) {
        showSimpleError('Please enter some JSON');
        return;
    }

    try {
        const parsed = JSON.parse(input);
        const formatted = JSON.stringify(parsed, null, 2);
        displayOutput(formatted);
        errorMessage.classList.remove('show');
    } catch (e) {
        const errorInfo = parseJsonError(e.message, input);
        showError(errorInfo.message, errorInfo.line, errorInfo.column);
    }
}

function formatYaml() {
    if (typeof jsyaml === 'undefined') {
        showSimpleError('YAML parser failed to load. Please refresh the page.');
        return;
    }

    const input = inputJson.value.trim();
    if (!input) {
        showSimpleError('Please enter some YAML');
        return;
    }

    try {
        const parsed = jsyaml.load(input);
        const formatted = jsyaml.dump(parsed, { indent: 2, lineWidth: -1, noRefs: true });
        displayOutput(formatted.trimEnd());
        errorMessage.classList.remove('show');
    } catch (e) {
        const mark = e && e.mark ? e.mark : { line: 0, column: 0 };
        showError(e.reason || e.message || 'Invalid YAML', mark.line + 1, mark.column + 1);
    }
}

function decodeJwt() {
    const input = inputJson.value.trim();
    if (!input) {
        showSimpleError('Please enter a JWT token');
        return;
    }

    try {
        const output = decodeJwtToken(input);
        displayOutput(JSON.stringify(output, null, 2));
        errorMessage.classList.remove('show');
    } catch (e) {
        showSimpleError('Could not decode JWT: ' + e.message);
    }
}

function decodeJwtToken(input, nowSec = Math.floor(Date.now() / 1000)) {
    const token = String(input || '')
        .replace(/^Bearer\s+/i, '')
        .replace(/\s+/g, '')
        .trim();

    const parts = token.split('.');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
        throw new Error('Invalid JWT format. Expected header.payload.signature');
    }

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;

    return {
        header,
        payload,
        tokenInfo: {
            algorithm: header.alg || null,
            type: header.typ || null,
            signaturePresent: parts.length > 2 && parts[2].length > 0
        },
        timing: {
            nowUnix: nowSec,
            nowIso: new Date(nowSec * 1000).toISOString(),
            issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
            notBefore: nbf ? new Date(nbf * 1000).toISOString() : null,
            expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
            isExpired: exp ? nowSec >= exp : null,
            secondsUntilExpiry: exp ? exp - nowSec : null
        }
    };
}

function analyzeCron() {
    const input = inputJson.value.trim();
    if (!input) {
        showSimpleError('Please enter a cron expression');
        return;
    }

    try {
        const schedule = parseCronExpression(input);
        const now = new Date();
        const runs = getNextCronRuns(schedule, now, 10);
        const lines = [
            `Expression: ${input}`,
            `Now (Local): ${now.toString()}`,
            `Now (UTC): ${now.toISOString()}`,
            '',
            'Next 10 Runs:'
        ];

        runs.forEach((run, idx) => {
            lines.push(`${idx + 1}. ${run.toString()} | UTC ${run.toISOString()}`);
        });

        displayOutput(lines.join('\n'));
        errorMessage.classList.remove('show');
    } catch (e) {
        showSimpleError('Invalid cron expression: ' + e.message);
    }
}

function convertTimestamp() {
    const input = inputJson.value.trim();
    if (!input) {
        showSimpleError('Please enter a timestamp or date');
        return;
    }

    try {
        const converted = buildTimestampConversions(input);
        displayOutput(JSON.stringify(converted, null, 2));
        errorMessage.classList.remove('show');
    } catch (e) {
        showSimpleError('Could not convert timestamp: ' + e.message);
    }
}

function utf8ToBytes(text) {
    if (typeof TextEncoder !== 'undefined') {
        utf8ToBytes.encoder = utf8ToBytes.encoder || new TextEncoder();
        return utf8ToBytes.encoder.encode(text);
    }
    const encoded = unescape(encodeURIComponent(text));
    const out = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) out[i] = encoded.charCodeAt(i);
    return out;
}

function bytesToUtf8(bytes) {
    if (typeof TextDecoder !== 'undefined') {
        bytesToUtf8.decoder = bytesToUtf8.decoder || new TextDecoder();
        return bytesToUtf8.decoder.decode(bytes);
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    try {
        return decodeURIComponent(escape(binary));
    } catch (e) {
        return binary;
    }
}

function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    if (typeof btoa === 'function') {
        return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(binary, 'binary').toString('base64');
    }
    throw new Error('Base64 encode is not supported in this environment');
}

function normalizeBase64Input(input) {
    const trimmed = String(input || '').replace(/\s+/g, '');
    if (!trimmed) throw new Error('Base64 input is empty');
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = normalized.length % 4;
    if (remainder === 1) {
        throw new Error('Invalid Base64 length');
    }
    return normalized + '='.repeat((4 - remainder) % 4);
}

function base64ToBytes(input) {
    const padded = normalizeBase64Input(input);
    const binary = typeof atob === 'function'
        ? atob(padded)
        : (typeof Buffer !== 'undefined' ? Buffer.from(padded, 'base64').toString('binary') : '');
    if (binary === '') {
        throw new Error('Base64 decode is not supported in this environment');
    }
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

function bytesToHex(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
}

function hexToBytes(input) {
    const cleaned = String(input || '').replace(/\s+/g, '').replace(/^0x/i, '');
    if (!cleaned) throw new Error('Hex input is empty');
    if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
        throw new Error('Hex input contains non-hex characters');
    }
    if (cleaned.length % 2 !== 0) {
        throw new Error('Hex input must have an even number of characters');
    }
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
        out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    }
    return out;
}

function base64UrlEncode(text) {
    return bytesToBase64(utf8ToBytes(text)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function extractJwtPart(rawInput, mode) {
    const token = String(rawInput || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('JWT input is empty');
    const parts = token.split('.');
    if (parts.length >= 2) {
        const part = mode === 'jwt-decode-header' ? parts[0] : parts[1];
        if (!part) throw new Error('Requested JWT part is empty');
        return part;
    }
    return token;
}

function clearToolError() {
    errorMessage.classList.remove('show');
    toolErrorCache[currentTool] = { show: false, text: '', location: '' };
}

function runBase64HexUtility() {
    const rawInput = inputJson.value;
    const trimmed = rawInput.trim();
    utilityDecodedFile = null;

    try {
        if (utilityMode === 'base64-encode-text') {
            if (!trimmed) throw new Error('Please enter text to encode');
            displayOutput(bytesToBase64(utf8ToBytes(rawInput)));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'base64-decode-text') {
            if (!trimmed) throw new Error('Please enter Base64 text to decode');
            displayOutput(bytesToUtf8(base64ToBytes(trimmed)));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'hex-encode-text') {
            if (!trimmed) throw new Error('Please enter text to encode');
            displayOutput(bytesToHex(utf8ToBytes(rawInput)));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'hex-decode-text') {
            if (!trimmed) throw new Error('Please enter hex text to decode');
            displayOutput(bytesToUtf8(hexToBytes(trimmed)));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'base64-encode-file') {
            if (!utilityFile) throw new Error('Choose a file first');
            displayOutput(bytesToBase64(utilityFile.bytes));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'hex-encode-file') {
            if (!utilityFile) throw new Error('Choose a file first');
            displayOutput(bytesToHex(utilityFile.bytes));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'base64-decode-file') {
            if (!trimmed) throw new Error('Please enter Base64 content to decode');
            const bytes = base64ToBytes(trimmed);
            utilityDecodedFile = {
                name: 'decoded-base64.bin',
                bytes,
                type: 'application/octet-stream'
            };
            displayOutput(`Decoded ${bytes.length} bytes from Base64.\nClick "Download File" to save the result.`);
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'hex-decode-file') {
            if (!trimmed) throw new Error('Please enter hex content to decode');
            const bytes = hexToBytes(trimmed);
            utilityDecodedFile = {
                name: 'decoded-hex.bin',
                bytes,
                type: 'application/octet-stream'
            };
            displayOutput(`Decoded ${bytes.length} bytes from hex.\nClick "Download File" to save the result.`);
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'jwt-decode-header' || utilityMode === 'jwt-decode-payload') {
            const part = extractJwtPart(trimmed, utilityMode);
            const decoded = base64UrlDecode(part);
            try {
                const parsed = JSON.parse(decoded);
                displayOutput(JSON.stringify(parsed, null, 2));
            } catch (e) {
                displayOutput(decoded);
            }
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        if (utilityMode === 'jwt-encode-part') {
            if (!trimmed) throw new Error('Please enter JWT part content');
            let normalized = rawInput;
            try {
                normalized = JSON.stringify(JSON.parse(rawInput));
            } catch (e) {}
            displayOutput(base64UrlEncode(normalized));
            clearToolError();
            updateUtilityDownloadState();
            return;
        }

        throw new Error('Unsupported utility mode');
    } catch (e) {
        showSimpleError('Utility error: ' + e.message);
        updateUtilityDownloadState();
    }
}

function handleUtilityModeChange() {
    utilityMode = utilModeSelect && utilModeSelect.value ? utilModeSelect.value : 'base64-encode-text';
    utilityDecodedFile = null;
    clearToolError();
    updateUtilityControlsVisibility();
}

function clearUtilityFileSelection() {
    utilityFile = null;
    utilityDecodedFile = null;
    if (utilFileInput) {
        utilFileInput.value = '';
    }
    updateUtilityFileLabel();
    updateUtilityDownloadState();
}

function handleUtilityFileSelect(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) {
        clearUtilityFileSelection();
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const bytes = new Uint8Array(reader.result);
        utilityFile = {
            name: file.name,
            type: file.type || 'application/octet-stream',
            bytes
        };
        updateUtilityFileLabel();
    };
    reader.onerror = () => {
        utilityFile = null;
        updateUtilityFileLabel();
        showSimpleError('Could not read the selected file');
    };
    reader.readAsArrayBuffer(file);
}

function downloadUtilityFile() {
    if (!utilityDecodedFile) {
        showSimpleError('No decoded file available. Run a decode-to-file mode first.');
        return;
    }
    const blob = new Blob([utilityDecodedFile.bytes], { type: utilityDecodedFile.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = utilityDecodedFile.name || 'decoded.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    try {
        return decodeURIComponent(escape(atob(padded)));
    } catch (e) {
        return atob(padded);
    }
}

function parseCronExpression(expr) {
    const fields = expr.trim().split(/\s+/);
    if (fields.length !== 5) {
        throw new Error('Use 5 fields: minute hour day-of-month month day-of-week');
    }

    return {
        minute: parseCronField(fields[0], 0, 59),
        hour: parseCronField(fields[1], 0, 23),
        dayOfMonth: parseCronField(fields[2], 1, 31),
        month: parseCronField(fields[3], 1, 12),
        dayOfWeek: parseCronField(fields[4], 0, 6, true)
    };
}

function parseCronField(field, min, max, isDow = false) {
    const values = new Set();
    const parts = field.split(',');

    for (const partRaw of parts) {
        const part = partRaw.trim().toLowerCase();
        if (!part) throw new Error(`Invalid field: "${field}"`);

        const [base, stepRaw] = part.split('/');
        const step = stepRaw ? parseInt(stepRaw, 10) : 1;
        if (!Number.isInteger(step) || step <= 0) {
            throw new Error(`Invalid step "${part}"`);
        }

        let start = min;
        let end = max;

        if (base !== '*') {
            if (base.includes('-')) {
                const [s, e] = base.split('-');
                start = parseInt(s, 10);
                end = parseInt(e, 10);
            } else {
                start = parseInt(base, 10);
                end = start;
            }
        }

        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            throw new Error(`Invalid range "${part}"`);
        }

        if (isDow) {
            if (start === 7) start = 0;
            if (end === 7) end = 0;
        }

        if (start < min || end > max || (base !== '*' && start > end)) {
            throw new Error(`Out of range "${part}"`);
        }

        for (let i = start; i <= end; i += step) {
            values.add(i);
        }
    }

    return values;
}

function cronMatches(schedule, date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dow = date.getDay();

    return schedule.minute.has(minute)
        && schedule.hour.has(hour)
        && schedule.dayOfMonth.has(day)
        && schedule.month.has(month)
        && schedule.dayOfWeek.has(dow);
}

function getNextCronRuns(schedule, fromDate, count) {
    const runs = [];
    const cursor = new Date(fromDate.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    const maxIterations = 525600; // 1 year in minutes
    let iterations = 0;
    while (runs.length < count && iterations < maxIterations) {
        if (cronMatches(schedule, cursor)) {
            runs.push(new Date(cursor.getTime()));
        }
        cursor.setMinutes(cursor.getMinutes() + 1);
        iterations++;
    }
    return runs;
}

function buildTimestampConversions(input) {
    const trimmed = input.trim();
    const numberLike = /^-?\d+(\.\d+)?$/.test(trimmed);
    let date;
    let source = '';

    if (numberLike) {
        const value = Number(trimmed);
        const abs = Math.abs(value);
        const isMs = abs > 1e11;
        date = new Date(isMs ? value : value * 1000);
        source = isMs ? 'unix_milliseconds' : 'unix_seconds';
    } else {
        date = new Date(trimmed);
        source = 'date_string';
    }

    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid input date/time');
    }

    return {
        source,
        input: trimmed,
        unixSeconds: Math.floor(date.getTime() / 1000),
        unixMilliseconds: date.getTime(),
        isoUtc: date.toISOString(),
        localString: date.toString(),
        utcString: date.toUTCString()
    };
}

function parseJsonError(message, input) {
    let line = 1;
    let column = 1;

    const positionMatch = message.match(/position (\d+)/i);
    if (positionMatch) {
        const position = parseInt(positionMatch[1], 10);
        const beforeError = input.substring(0, position);
        line = (beforeError.match(/\n/g) || []).length + 1;
        const lastNewline = beforeError.lastIndexOf('\n');
        column = position - lastNewline;
    }

    let cleanMessage = message.replace(/^JSON\.parse: /, '');
    cleanMessage = cleanMessage.replace(/\s*at position \d+.*$/i, '').trim();
    cleanMessage = cleanMessage.replace(/at line \d+ column \d+/i, '').trim();
    if (!cleanMessage) {
        cleanMessage = message;
    }
    return { message: cleanMessage, line, column };
}

function showSimpleError(message) {
    clearInputErrorMarker();
    errorText.textContent = message;
    errorLocation.textContent = '';
    errorMessage.classList.add('show');
    toolErrorCache[currentTool] = { show: true, text: message, location: '' };
}

function showError(message, line, column, details = '') {
    errorText.textContent = message;
    errorLocation.textContent = `Line ${line}, Column ${column}`;
    errorMessage.classList.add('show');
    toolErrorCache[currentTool] = { show: true, text: message, location: `Line ${line}, Column ${column}` };
    setInputErrorMarker(line, column, details);
}

function setInputErrorMarker(line, column, details = '') {
    if (!Number.isInteger(line) || line < 1) {
        clearInputErrorMarker();
        return;
    }
    inputErrorState = { line, column: Number.isInteger(column) ? column : 1 };
    leftPanel?.classList.add('panel-has-input-error');
    updateLineNumbers();
    if (inputErrorInline) {
        const base = `Input error at line ${inputErrorState.line}, column ${inputErrorState.column}`;
        inputErrorInline.textContent = details ? `${base}\n${details}` : base;
        inputErrorInline.classList.add('show');
    }
    highlightInputErrorPosition(inputErrorState.line, inputErrorState.column);
}

function buildJsonErrorDetails(input, errorInfo) {
    const lines = input.split('\n');
    const lineText = lines[errorInfo.line - 1] || '';
    const colIndex = Math.max(0, (errorInfo.column || 1) - 1);
    const start = Math.max(0, colIndex - 28);
    const end = Math.min(lineText.length, colIndex + 28);
    const excerpt = lineText.slice(start, end);
    const pointer = `${' '.repeat(Math.max(0, colIndex - start))}^`;

    let hint = 'Check for a missing comma, colon, quote, or bracket near the pointer.';
    if (/expected ':' after property name in json/i.test(errorInfo.message)) {
        hint = 'Likely missing ":" between a JSON key and its value.';
    } else if (/unexpected token/i.test(errorInfo.message)) {
        hint = 'Unexpected character near the pointer. Check quoting and separators.';
    } else if (/unterminated string/i.test(errorInfo.message)) {
        hint = 'A string may be missing a closing quote.';
    }

    return `Hint: ${hint}\nNear: ${excerpt}\n      ${pointer}`;
}

function clearInputErrorMarker() {
    inputErrorState = null;
    leftPanel?.classList.remove('panel-has-input-error');
    updateLineNumbers();
    if (inputErrorInline) {
        inputErrorInline.textContent = '';
        inputErrorInline.classList.remove('show');
    }
}

function lineColumnToIndex(text, line, column) {
    const lines = text.split('\n');
    const safeLine = Math.min(Math.max(1, line), lines.length);
    const before = lines.slice(0, safeLine - 1).join('\n');
    const lineStart = before.length + (safeLine > 1 ? 1 : 0);
    const lineText = lines[safeLine - 1] || '';
    const safeColumn = Math.min(Math.max(1, column), lineText.length + 1);
    return lineStart + (safeColumn - 1);
}

function highlightInputErrorPosition(line, column) {
    const text = inputJson.value;
    if (!text) return;

    const index = lineColumnToIndex(text, line, column);
    const start = Math.max(0, index - 1);
    const end = Math.min(text.length, index + 1);

    // Bring the offending location into view and highlight nearby character(s).
    const lineHeight = parseFloat(window.getComputedStyle(inputJson).lineHeight) || 21;
    inputJson.scrollTop = Math.max(0, (line - 2) * lineHeight);
    inputJson.focus();
    inputJson.setSelectionRange(start, Math.max(start + 1, end));
}

function displayOutput(formatted) {
    const lines = formatted.split('\n');
    const html = [];
    for (let i = 0; i < lines.length; i++) {
        html.push(
            `<div class="output-line"><div class="output-line-numbers">${i + 1}</div><div class="output-content">${highlightLine(lines[i])}</div></div>`
        );
    }
    outputContent.innerHTML = html.join('');
    toolOutputCache[currentTool] = formatted.length <= MAX_CACHED_OUTPUT_CHARS ? formatted : '';
}

function clearAll() {
    inputJson.value = '';
    inputLineCount = 1;
    toolInputCache[currentTool] = '';
    toolOutputCache[currentTool] = '';
    toolErrorCache[currentTool] = { show: false, text: '', location: '' };
    if (currentTool === 'base64hex') {
        utilityDecodedFile = null;
        clearUtilityFileSelection();
        updateUtilityDownloadState();
    }
    clearInputErrorMarker();
    updateLineNumbers();
    outputContent.innerHTML = '';
    errorMessage.classList.remove('show');
}

function copyOutput() {
    const text = toolOutputCache[currentTool] || outputContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
}

function autoFix() {
    if (currentTool === 'yaml') return autoFixYaml();
    if (currentTool === 'json') return autoFixJson();
    return;
}

function autoFixJson() {
    const input = inputJson.value;
    if (!input.trim()) {
        showSimpleError('Please enter some JSON');
        return;
    }

    let inputErrorInfo = null;
    try {
        JSON.parse(input);
        clearInputErrorMarker();
    } catch (e) {
        inputErrorInfo = parseJsonError(e.message, input);
    }

    let fixed = normalizeJsonInput(input);
    let parsed = null;
    let lastError = null;

    for (let attempts = 0; attempts < 30; attempts++) {
        try {
            parsed = JSON.parse(fixed);
            break;
        } catch (e) {
            lastError = e;
            const stepped = fixJsonStep(fixed, e.message).fixed;
            const candidate = normalizeJsonInput(stepped);
            if (candidate === fixed) {
                break;
            }
            fixed = candidate;
        }
    }

    if (parsed === null) {
        try {
            parsed = parseLooseJsonFallback(fixed);
            fixed = JSON.stringify(parsed, null, 2);
        } catch (fallbackError) {
            const errorInfo = parseJsonError((lastError && lastError.message) || fallbackError.message, fixed);
            showError('Could not auto-fix. ' + ((lastError && lastError.message) || fallbackError.message), errorInfo.line, errorInfo.column);
            return;
        }
    } else {
        fixed = JSON.stringify(parsed, null, 2);
    }

    displayOutput(fixed);
    if (inputErrorInfo) {
        const details = buildJsonErrorDetails(input, inputErrorInfo);
        showError(`Auto-fix generated output. Original input issue: ${inputErrorInfo.message}`, inputErrorInfo.line, inputErrorInfo.column, details);
    } else {
        clearInputErrorMarker();
        errorMessage.classList.remove('show');
    }
}

function autoFixYaml() {
    if (typeof jsyaml === 'undefined') {
        showSimpleError('YAML parser failed to load. Please refresh the page.');
        return;
    }

    const input = inputJson.value;
    if (!input.trim()) {
        showSimpleError('Please enter some YAML');
        return;
    }

    let inputErrorInfo = null;
    try {
        jsyaml.load(input);
        clearInputErrorMarker();
    } catch (e) {
        const mark = e && e.mark ? e.mark : { line: 0, column: 0 };
        inputErrorInfo = {
            message: e.reason || e.message || 'Invalid YAML',
            line: mark.line + 1,
            column: mark.column + 1
        };
    }

    let fixed = input;

    // YAML can be valid JSON; if so convert directly to canonical YAML.
    try {
        const jsonParsed = JSON.parse(fixed);
        fixed = jsyaml.dump(jsonParsed, { indent: 2, lineWidth: -1, noRefs: true });
    } catch (e) {
        for (let i = 0; i < 5; i++) {
            const prev = fixed;
            fixed = fixYamlTabs(fixed);
            fixed = fixYamlListSpacing(fixed);
            fixed = fixYamlMissingColons(fixed);
            fixed = fixYamlColonSpacing(fixed);
            fixed = fixYamlTrailingCommas(fixed);
            fixed = fixYamlUnsafeValues(fixed);
            fixed = fixJavascriptComments(fixed);
            fixed = fixYamlIndentation(fixed);
            if (fixed === prev) {
                break;
            }
        }
    }

    try {
        let parsed;
        let attempts = 0;
        let working = fixed;

        while (attempts < 4) {
            try {
                parsed = jsyaml.load(working);
                fixed = working;
                break;
            } catch (err) {
                const reason = (err && err.reason ? err.reason : '').toLowerCase();
                if (!reason.includes('indentation') || !err.mark) {
                    throw err;
                }
                const next = fixYamlIndentByError(working, err.mark.line);
                if (next === working) {
                    throw err;
                }
                working = next;
                attempts++;
            }
        }

        if (typeof parsed === 'undefined') {
            parsed = jsyaml.load(fixed);
        }

        const formatted = jsyaml.dump(parsed, { indent: 2, lineWidth: -1, noRefs: true }).trimEnd();
        displayOutput(formatted);
        if (inputErrorInfo) {
            showError(`Input error retained: ${inputErrorInfo.message}`, inputErrorInfo.line, inputErrorInfo.column);
        } else {
            clearInputErrorMarker();
            errorMessage.classList.remove('show');
        }
    } catch (e) {
        try {
            const looseParsed = parseLooseYamlToObject(fixed);
            const formatted = jsyaml.dump(looseParsed, { indent: 2, lineWidth: -1, noRefs: true }).trimEnd();
            displayOutput(formatted);
            if (inputErrorInfo) {
                showError(`Input error retained: ${inputErrorInfo.message}`, inputErrorInfo.line, inputErrorInfo.column);
            } else {
                clearInputErrorMarker();
                errorMessage.classList.remove('show');
            }
        } catch (fallbackError) {
            const mark = fallbackError && fallbackError.mark ? fallbackError.mark : (e && e.mark ? e.mark : { line: 0, column: 0 });
            showError('Could not auto-fix YAML: ' + ((fallbackError && (fallbackError.reason || fallbackError.message)) || e.reason || e.message), mark.line + 1, mark.column + 1);
        }
    }
}

function fixYamlTabs(text) {
    return text.replace(/\t/g, '  ');
}

function fixYamlListSpacing(text) {
    return text.replace(/^(\s*)-(\S)/gm, '$1- $2');
}

function fixYamlColonSpacing(text) {
    return text.replace(/^(\s*[^#\n"'][^:\n]*):(\S.*)$/gm, '$1: $2');
}

function fixYamlMissingColons(text) {
    const lines = text.split('\n');
    const fixedLines = lines.map((line) => {
        // Keep empty/comment lines unchanged.
        if (!line.trim() || line.trim().startsWith('#')) {
            return line;
        }

        // Skip explicit sequence bullets and lines that already contain ":".
        if (/^\s*-\s+/.test(line) || line.includes(':')) {
            return line;
        }

        // Heuristic: "key value" -> "key: value"
        // key must be a simple identifier to avoid mangling free text.
        const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s+)(.+)$/);
        if (!match) {
            return line;
        }

        const indent = match[1];
        const key = match[2];
        const value = match[4].trim();

        // Don't force-colon on standalone words.
        if (!value) {
            return line;
        }

        return `${indent}${key}: ${value}`;
    });

    return fixedLines.join('\n');
}

function fixYamlTrailingCommas(text) {
    let result = text.replace(/,\s*$/gm, '');
    result = result.replace(/,\s*]/g, ']');
    result = result.replace(/,\s*}/g, '}');
    return result;
}

function fixYamlUnsafeValues(text) {
    const lines = text.split('\n');
    const fixedLines = lines.map((line) => {
        const match = line.match(/^(\s*[A-Za-z_][A-Za-z0-9_-]*\s*:\s*)(.+)$/);
        if (!match) {
            return line;
        }

        const prefix = match[1];
        const rawValue = match[2].trim();

        // Skip empty values or already-safe structured/quoted values.
        if (
            !rawValue ||
            rawValue.startsWith('"') ||
            rawValue.startsWith("'") ||
            rawValue.startsWith('[') ||
            rawValue.startsWith('{') ||
            rawValue.startsWith('|') ||
            rawValue.startsWith('>')
        ) {
            return line;
        }

        // Quote values that commonly break YAML parsing in loose input.
        if (
            rawValue.includes('://') ||
            rawValue.includes('${') ||
            /^#[0-9a-fA-F]{3,8}$/.test(rawValue)
        ) {
            const escaped = rawValue.replace(/"/g, '\\"');
            return `${prefix}"${escaped}"`;
        }

        return line;
    });

    return fixedLines.join('\n');
}

function fixYamlIndentation(text) {
    const lines = text.split('\n');
    let prevIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        let indent = (line.match(/^\s*/) || [''])[0].length;
        indent = indent - (indent % 2);

        if (prevIndex >= 0) {
            const prevLine = lines[prevIndex];
            const prevTrimmed = prevLine.trim();
            const prevIndent = (prevLine.match(/^\s*/) || [''])[0].length;

            if (prevTrimmed.endsWith(':') && indent <= prevIndent) {
                indent = prevIndent + 2;
            }
        }

        lines[i] = `${' '.repeat(Math.max(0, indent))}${line.trimStart()}`;
        prevIndex = i;
    }

    return lines.join('\n');
}

function fixYamlIndentByError(text, lineIndex) {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) {
        return text;
    }

    const current = lines[lineIndex];
    const currentTrimmed = current.trim();
    if (!currentTrimmed) {
        return text;
    }

    let prev = lineIndex - 1;
    while (prev >= 0 && !lines[prev].trim()) {
        prev--;
    }
    if (prev < 0) {
        return text;
    }

    const prevLine = lines[prev];
    const prevIndent = (prevLine.match(/^\s*/) || [''])[0].length;
    const prevTrimmed = prevLine.trim();
    const targetIndent = prevTrimmed.endsWith(':') ? prevIndent + 2 : prevIndent;

    const rebuilt = `${' '.repeat(Math.max(0, targetIndent))}${current.trimStart()}`;
    if (rebuilt === current) {
        return text;
    }

    lines[lineIndex] = rebuilt;
    return lines.join('\n');
}

function normalizeJsonInput(text) {
    let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    result = fixSmartQuotes(result);
    result = fixJavascriptComments(result);
    result = fixJsonControlCharsInStrings(result);
    return result;
}

function fixSmartQuotes(text) {
    return text
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u0060]/g, "'");
}

function fixJsonControlCharsInStrings(text) {
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (!inString) {
            out += ch;
            if (ch === '"') {
                inString = true;
            }
            continue;
        }

        if (escaped) {
            out += ch;
            escaped = false;
            continue;
        }

        if (ch === '\\') {
            out += ch;
            escaped = true;
            continue;
        }

        if (ch === '"') {
            out += ch;
            inString = false;
            continue;
        }

        const code = ch.charCodeAt(0);
        if (code < 0x20 || code === 0x2028 || code === 0x2029) {
            if (ch === '\n') {
                out += '\\n';
            } else if (ch === '\r') {
                out += '\\r';
            } else if (ch === '\t') {
                out += '\\t';
            } else if (ch === '\b') {
                out += '\\b';
            } else if (ch === '\f') {
                out += '\\f';
            } else {
                out += `\\u${code.toString(16).padStart(4, '0')}`;
            }
            continue;
        }

        out += ch;
    }

    return out;
}

function parseLooseJsonFallback(text) {
    if (typeof jsyaml === 'undefined') {
        throw new Error('Fallback parser unavailable');
    }

    let candidate = text;
    for (let i = 0; i < 6; i++) {
        const prev = candidate;
        candidate = runJsonRepairPasses(candidate);
        if (candidate === prev) {
            break;
        }
    }

    const parsed = jsyaml.load(candidate);
    if (parsed === null || typeof parsed !== 'object') {
        throw new Error('Could not recover JSON structure');
    }
    return parsed;
}

function runJsonRepairPasses(text) {
    let fixed = text;
    fixed = fixSingleQuotes(fixed);
    fixed = fixTrailingCommas(fixed);
    fixed = fixUnquotedKeys(fixed);
    fixed = fixInlineValueBeforeNextKey(fixed);
    fixed = fixUnquotedValues(fixed);
    fixed = fixMissingCommas(fixed);
    fixed = fixJavascriptComments(fixed);
    fixed = fixJsonControlCharsInStrings(fixed);
    return fixed;
}

function parseLooseYamlToObject(text) {
    const lines = text.split('\n');
    const root = {};
    const stack = [{ type: 'object', value: root, indent: -1, pendingKey: null }];

    function finalizePending(ctx) {
        if (ctx && ctx.type === 'object' && ctx.pendingKey) {
            ctx.value[ctx.pendingKey] = null;
            ctx.pendingKey = null;
        }
    }

    function resolvePending(ctx, indent, trimmed) {
        if (!ctx || ctx.type !== 'object' || !ctx.pendingKey) {
            return ctx;
        }
        if (indent <= ctx.indent) {
            finalizePending(ctx);
            return ctx;
        }

        const nextIsArray = trimmed.startsWith('- ');
        const container = nextIsArray ? [] : {};
        ctx.value[ctx.pendingKey] = container;
        ctx.pendingKey = null;

        const nextCtx = {
            type: nextIsArray ? 'array' : 'object',
            value: container,
            indent,
            pendingKey: null
        };
        stack.push(nextCtx);
        return nextCtx;
    }

    function parseScalar(value) {
        const v = value.trim().replace(/,$/, '');
        if (!v) return '';

        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            return v.slice(1, -1);
        }

        if (/^(true|false)$/i.test(v)) {
            return /^true$/i.test(v);
        }
        if (/^(null|~)$/i.test(v)) {
            return null;
        }
        if (/^-?\d+(\.\d+)?$/.test(v)) {
            return Number(v);
        }

        if (v.startsWith('[') || v.startsWith('{')) {
            try {
                return jsyaml.load(v.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'));
            } catch (e) {
            }
        }

        return v;
    }

    function parseKeyValue(trimmed) {
        const colon = trimmed.match(/^([^:]+):(?:\s*(.*))?$/);
        if (colon) {
            return {
                key: colon[1].trim(),
                hasValue: typeof colon[2] !== 'undefined' && colon[2] !== '',
                value: (colon[2] || '').trim()
            };
        }

        const loose = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s+(.+)$/);
        if (loose) {
            return { key: loose[1], hasValue: true, value: loose[2].trim() };
        }

        return null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const indent = ((line.match(/^\s*/) || [''])[0].length);

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            finalizePending(stack.pop());
        }

        let ctx = stack[stack.length - 1];
        ctx = resolvePending(ctx, indent, trimmed);

        if (trimmed.startsWith('- ')) {
            if (ctx.type !== 'array') {
                if (ctx.type === 'object' && ctx.pendingKey) {
                    ctx = resolvePending(ctx, indent, trimmed);
                }
            }

            if (ctx.type !== 'array') {
                // Create a synthetic array slot under object when list appears unexpectedly.
                if (ctx.type === 'object') {
                    const syntheticKey = `_items_${i}`;
                    ctx.value[syntheticKey] = [];
                    const syntheticArrayCtx = { type: 'array', value: ctx.value[syntheticKey], indent, pendingKey: null };
                    stack.push(syntheticArrayCtx);
                    ctx = syntheticArrayCtx;
                } else {
                    continue;
                }
            }

            const item = trimmed.slice(2).trim();
            if (!item) {
                const obj = {};
                ctx.value.push(obj);
                stack.push({ type: 'object', value: obj, indent, pendingKey: null });
                continue;
            }

            const kv = parseKeyValue(item);
            if (kv) {
                const obj = {};
                ctx.value.push(obj);
                if (kv.hasValue) {
                    obj[kv.key] = parseScalar(kv.value);
                } else {
                    obj[kv.key] = {};
                }
                stack.push({ type: 'object', value: obj, indent, pendingKey: kv.hasValue ? null : kv.key });
                continue;
            }

            ctx.value.push(parseScalar(item));
            continue;
        }

        const kv = parseKeyValue(trimmed);
        if (!kv) {
            continue;
        }

        if (ctx.type === 'array') {
            let last = ctx.value[ctx.value.length - 1];
            if (!last || typeof last !== 'object' || Array.isArray(last)) {
                last = {};
                ctx.value.push(last);
            }
            const objCtx = { type: 'object', value: last, indent: ctx.indent + 1, pendingKey: null };
            stack.push(objCtx);
            ctx = objCtx;
        }

        if (kv.hasValue) {
            ctx.value[kv.key] = parseScalar(kv.value);
        } else {
            ctx.pendingKey = kv.key;
        }
    }

    while (stack.length > 0) {
        finalizePending(stack.pop());
    }

    return root;
}

function fixJsonStep(json, errorMsg) {
    let fixed = json;
    const positionMatch = errorMsg.match(/position (\d+)/i);
    const pos = positionMatch ? parseInt(positionMatch[1], 10) : 0;

    if (pos > 0 && pos <= json.length) {
        const beforeError = json.substring(0, pos);
        const afterError = json.substring(pos);
        const charAtPos = json[pos] || '';
        const charBeforePos = json[pos - 1] || '';

        if (errorMsg.includes('Expected property name') || errorMsg.includes("expected '")) {
            const beforeTrimmed = beforeError.replace(/\s+$/, '');
            if (beforeTrimmed.endsWith(',')) {
                fixed = beforeTrimmed.slice(0, -1) + afterError;
            }
        }

        if (errorMsg.includes('Unexpected token') && (charAtPos === '"' || charAtPos === '{' || charAtPos === '[')) {
            fixed = beforeError + ',' + afterError;
        }

        if (errorMsg.includes('Expected property name') || errorMsg.includes('Unexpected token')) {
            const match = afterError.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
            if (match) {
                fixed = beforeError + afterError.replace(match[1], '"' + match[1] + '"');
            } else {
                const beforeMatch = beforeError.match(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*$/);
                if (beforeMatch) {
                    const key = beforeMatch[2];
                    const newBefore = beforeError.replace(new RegExp(key + '\\s*:\\s*$'), '"' + key + '": ');
                    fixed = newBefore + afterError;
                }
            }
        }

        if (charAtPos === "'" || charBeforePos === "'") {
            fixed = fixSingleQuotes(fixed);
        }
    }

    fixed = runJsonRepairPasses(fixed);
    for (let i = 0; i < 8; i++) {
        const prev = fixed;
        fixed = runJsonRepairPasses(fixed);
        if (fixed === prev) {
            break;
        }
    }

    try {
        JSON.parse(fixed);
        return { fixed, success: true };
    } catch (e) {
        return { fixed, success: false };
    }
}

function fixTrailingCommas(json) {
    return json.replace(/,\s*([}\]])/g, '$1');
}

function fixMissingCommas(json) {
    let result = json;

    // Missing comma between adjacent objects/arrays
    result = result.replace(/}\s*{/g, '}, {');
    result = result.replace(/]\s*\[/g, '], [');
    result = result.replace(/}\s*\[/g, '}, [');
    result = result.replace(/]\s*{/g, '], {');

    // Missing comma between a completed property value and next property.
    result = result.replace(/(:\s*"(?:\\.|[^"])*"|\])\s*((?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g, '$1, $2');

    // Missing comma before next key on a new line (common case)
    result = result.replace(
        /(\b(?:true|false|null)\b|[}\]"0-9])(\s*\n\s*)(?=(?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g,
        '$1,$2'
    );

    // Missing comma before next key on the same line
    result = result.replace(
        /(\b(?:true|false|null)\b|[}\]"0-9])(\s+)(?=(?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g,
        '$1, '
    );

    // Missing comma after bareword/string/number before next key on same line.
    result = result.replace(
        /(\b(?:true|false|null)\b|-?\d+(?:\.\d+)?|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[A-Za-z_][A-Za-z0-9_\-./@]*)(\s+)(?=(?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g,
        '$1, '
    );

    return result;
}

function fixInlineValueBeforeNextKey(json) {
    let result = json;

    // Example: type: linkedin url: "..."
    result = result.replace(
        /(:\s*)([A-Za-z_][A-Za-z0-9_\-./@]*)(\s+)(?=(?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g,
        function(match, p1, p2) {
            if (isJsonPrimitiveLiteral(p2)) {
                return `${p1}${p2}, `;
            }
            return `${p1}"${p2}", `;
        }
    );

    // Example with spaces in bareword value before next key.
    result = result.replace(
        /(:\s*)([A-Za-z_][A-Za-z0-9_\-./@]*(?:\s+[A-Za-z_][A-Za-z0-9_\-./@]*)+)(\s+)(?=(?:"[^"\\]+"|[A-Za-z_][A-Za-z0-9_]*)\s*:)/g,
        function(match, p1, p2) {
            const value = p2.trim();
            if (/^(true|false|null)$/i.test(value) || /^-?\d+(\.\d+)?$/.test(value)) {
                return `${p1}${value}, `;
            }
            return `${p1}"${value}", `;
        }
    );

    return result;
}

function isJsonPrimitiveLiteral(value) {
    const v = String(value).trim();
    return /^(true|false|null)$/i.test(v) || /^-?\d+(\.\d+)?$/.test(v);
}

function formatLooseJsonScalar(value) {
    const v = String(value).trim();
    if (isJsonPrimitiveLiteral(v)) {
        if (/^(true|false|null)$/i.test(v)) {
            return v.toLowerCase();
        }
        return v;
    }
    return `"${v.replace(/"/g, '\\"')}"`;
}

function fixUnquotedKeys(json) {
    let result = json;
    result = result.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    result = result.replace(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, '"$1":');
    return result;
}

function fixSingleQuotes(json) {
    let result = json;
    result = result.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, p1) => {
        return '"' + p1.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"';
    });
    return result;
}

function fixJavascriptComments(data) {
    let out = '';
    let inString = false;
    let quoteChar = '';
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        const next = data[i + 1] || '';

        if (inLineComment) {
            if (ch === '\n') {
                inLineComment = false;
                out += ch;
            }
            continue;
        }

        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            out += ch;
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quoteChar) {
                inString = false;
                quoteChar = '';
            }
            continue;
        }

        if (ch === '"' || ch === "'") {
            inString = true;
            quoteChar = ch;
            out += ch;
            continue;
        }

        if (ch === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }

        if (ch === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }

        out += ch;
    }

    return out;
}

function fixUnquotedValues(json) {
    let result = json;

    // Fix unquoted values after ":" and split accidental "value nextKey: nextValue" patterns.
    result = result.replace(/(:\s*)([a-zA-Z0-9_\s\-\/\.\@]+?)\s*(,|\n|}|])/g, function(match, p1, p2, p3) {
        const trimmed = p2.trim();
        if (!trimmed) {
            return match;
        }

        const inlineKeyMatch = trimmed.match(/^(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
        if (inlineKeyMatch) {
            const left = formatLooseJsonScalar(inlineKeyMatch[1]);
            const rightKey = inlineKeyMatch[2];
            const rightValue = formatLooseJsonScalar(inlineKeyMatch[3]);
            return `${p1}${left}, "${rightKey}": ${rightValue}${p3}`;
        }

        if (isJsonPrimitiveLiteral(trimmed)) {
            return `${p1}${formatLooseJsonScalar(trimmed)}${p3}`;
        }

        return p1 + '"' + trimmed + '"' + p3;
    });

    result = result.replace(/(:\s*)([a-zA-Z0-9_\s\-\/\.\@]+?)\s*$/gm, function(match, p1, p2) {
        const trimmed = p2.trim();
        if (!trimmed) {
            return match;
        }
        if (isJsonPrimitiveLiteral(trimmed)) {
            return `${p1}${formatLooseJsonScalar(trimmed)}`;
        }
        return p1 + '"' + trimmed + '"';
    });

    for (let i = 0; i < 10; i++) {
        const prevResult = result;
        result = result.replace(/(\[\s*)([a-zA-Z0-9_\-\/\.\@]+?)(\s*[\],])/g, function(match, p1, p2, p3) {
            const trimmed = p2.trim();
            if (/^-?\d+\.?\d*$/.test(trimmed) || /^(true|false|null)$/i.test(trimmed)) {
                return match;
            }
            return p1 + '"' + trimmed + '"' + p3;
        });

        result = result.replace(/,\s*([a-zA-Z0-9_\-\/\.\@]+?)\s*(,|\]|\],)/g, function(match, p1, p2) {
            const trimmed = p1.trim();
            if (/^-?\d+\.?\d*$/.test(trimmed) || /^(true|false|null)$/i.test(trimmed)) {
                return match;
            }
            if (p2 === '],') {
                return ', "' + trimmed + '"],';
            }
            return ', "' + trimmed + '"' + p2;
        });
        if (result === prevResult) {
            break;
        }
    }
    return result;
}

// Attach button handlers in JS so buttons work without relying on inline onclick
if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleSidebar);
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (primaryActionBtn) primaryActionBtn.addEventListener('click', formatCurrent);
if (autoFixBtn) autoFixBtn.addEventListener('click', autoFix);
if (jsonToolBtn) jsonToolBtn.addEventListener('click', () => selectSidebarTool('json'));
if (yamlToolBtn) yamlToolBtn.addEventListener('click', () => selectSidebarTool('yaml'));
if (jwtToolBtn) jwtToolBtn.addEventListener('click', () => selectSidebarTool('jwt'));
if (cronToolBtn) cronToolBtn.addEventListener('click', () => selectSidebarTool('cron'));
if (timestampToolBtn) timestampToolBtn.addEventListener('click', () => selectSidebarTool('timestamp'));
if (base64HexToolBtn) base64HexToolBtn.addEventListener('click', () => selectSidebarTool('base64hex'));
if (utilModeSelect) utilModeSelect.addEventListener('change', handleUtilityModeChange);
if (utilPickFileBtn && utilFileInput) utilPickFileBtn.addEventListener('click', () => utilFileInput.click());
if (utilClearFileBtn) utilClearFileBtn.addEventListener('click', clearUtilityFileSelection);
if (utilFileInput) utilFileInput.addEventListener('change', handleUtilityFileSelect);
if (utilDownloadBtn) utilDownloadBtn.addEventListener('click', downloadUtilityFile);
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => closeSidebar(true));
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', () => closeSidebar(true));
clearBtn?.addEventListener('click', clearAll);
copyBtn?.addEventListener('click', copyOutput);
document.querySelectorAll('.tool-choice').forEach((el) => {
    const key = el.getAttribute('data-tool');
    if (key) el.addEventListener('click', () => chooseTool(key));
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (toolPicker?.classList.contains('show')) {
            toolPicker.classList.remove('show');
        }
        if (document.body.classList.contains('sidebar-open')) {
            closeSidebar(true);
        }
    }
});

initTheme();
initSidebar();
initToolChoice();
if (inputLineNumbers) updateLineNumbers();

let isResizing = false;

if (resizer) resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    const resizerWidth = resizer.offsetWidth;

    // Calculate percentage for responsive sizing
    const leftPercent = (newLeftWidth / containerWidth) * 100;
    const rightPercent = 100 - leftPercent - (resizerWidth / containerWidth) * 100;

    // Ensure minimum widths (200px minimum)
    const minPercent = (200 / containerWidth) * 100;

    if (leftPercent > minPercent && rightPercent > minPercent) {
        leftPanel.style.flex = `0 0 ${leftPercent}%`;
        rightPanel.style.flex = `0 0 ${rightPercent}%`;
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
    }
});

// Touch support for mobile
if (resizer) resizer.addEventListener('touchstart', (e) => {
    isResizing = true;
    resizer.classList.add('resizing');
    e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;

    const touch = e.touches[0];
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = touch.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    const resizerWidth = resizer.offsetWidth;

    const leftPercent = (newLeftWidth / containerWidth) * 100;
    const rightPercent = 100 - leftPercent - (resizerWidth / containerWidth) * 100;

    const minPercent = (200 / containerWidth) * 100;

    if (leftPercent > minPercent && rightPercent > minPercent) {
        leftPanel.style.flex = `0 0 ${leftPercent}%`;
        rightPanel.style.flex = `0 0 ${rightPercent}%`;
    }
});

document.addEventListener('touchend', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resizing');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseJsonError,
        normalizeJsonInput,
        fixJsonControlCharsInStrings,
        runJsonRepairPasses,
        parseLooseJsonFallback,
        fixJsonStep,
        fixTrailingCommas,
        fixMissingCommas,
        fixInlineValueBeforeNextKey,
        fixUnquotedKeys,
        fixSingleQuotes,
        fixJavascriptComments,
        fixUnquotedValues,
        parseLooseYamlToObject,
        fixYamlTabs,
        fixYamlListSpacing,
        fixYamlColonSpacing,
        fixYamlMissingColons,
        fixYamlTrailingCommas,
        fixYamlUnsafeValues,
        fixYamlIndentation,
        fixYamlIndentByError,
        utf8ToBytes,
        bytesToUtf8,
        bytesToBase64,
        base64ToBytes,
        bytesToHex,
        hexToBytes,
        base64UrlEncode,
        extractJwtPart,
        base64UrlDecode,
        decodeJwtToken,
        parseCronField,
        parseCronExpression,
        cronMatches,
        getNextCronRuns,
        buildTimestampConversions,
        lineColumnToIndex,
        buildJsonErrorDetails
    };
}
