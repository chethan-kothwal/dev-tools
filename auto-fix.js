(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
    } else {
        root.DevToolsAutoFix = factory(root);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
function getJsYaml() {
    if (typeof jsyaml !== 'undefined') return jsyaml;
    if (root && typeof root.jsyaml !== 'undefined') return root.jsyaml;
    if (typeof require === 'function') {
        try {
            return require('js-yaml');
        } catch (e) {
            return undefined;
        }
    }
    return undefined;
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
        .replace(/[\u2018\u2019\u0060]/g, "'");
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
    const yaml = getJsYaml();
    if (!yaml) {
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

    const parsed = yaml.load(candidate);
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
                const yaml = getJsYaml();
                if (yaml) {
                    return yaml.load(v.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'));
                }
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

    return {
        normalizeJsonInput: normalizeJsonInput,
        fixJsonControlCharsInStrings: fixJsonControlCharsInStrings,
        runJsonRepairPasses: runJsonRepairPasses,
        parseLooseJsonFallback: parseLooseJsonFallback,
        fixJsonStep: fixJsonStep,
        fixJavascriptComments: fixJavascriptComments,
        parseLooseYamlToObject: parseLooseYamlToObject,
        fixYamlTabs: fixYamlTabs,
        fixYamlListSpacing: fixYamlListSpacing,
        fixYamlColonSpacing: fixYamlColonSpacing,
        fixYamlMissingColons: fixYamlMissingColons,
        fixYamlTrailingCommas: fixYamlTrailingCommas,
        fixYamlUnsafeValues: fixYamlUnsafeValues,
        fixYamlIndentation: fixYamlIndentation,
        fixYamlIndentByError: fixYamlIndentByError
    };
});
