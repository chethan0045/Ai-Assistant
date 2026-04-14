import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SyntaxHighlightService {

  highlight(code: string, ext: string): string {
    if (!code) return '';
    const lang = this.getLang(ext);
    switch (lang) {
      case 'js': return this.highlightJS(code);
      case 'html': return this.highlightHTML(code);
      case 'css': return this.highlightCSS(code);
      case 'json': return this.highlightJSON(code);
      case 'py': return this.highlightPython(code);
      default: return this.escapeHtml(code);
    }
  }

  private getLang(ext: string): string {
    const map: Record<string, string> = {
      ts: 'js', tsx: 'js', js: 'js', jsx: 'js', mjs: 'js',
      html: 'html', htm: 'html', xml: 'html', svg: 'html', vue: 'html', svelte: 'html',
      css: 'css', scss: 'css', less: 'css',
      json: 'json',
      py: 'py',
    };
    return map[ext] || 'text';
  }

  // ===== JS / TS =====
  private highlightJS(code: string): string {
    const tokens: { start: number; end: number; cls: string }[] = [];
    const src = code;
    let i = 0;

    while (i < src.length) {
      // Template literal
      if (src[i] === '`') {
        const start = i; i++;
        while (i < src.length && src[i] !== '`') { if (src[i] === '\\') i++; i++; }
        i++;
        tokens.push({ start, end: i, cls: 'hl-str' });
      }
      // Strings
      else if (src[i] === "'" || src[i] === '"') {
        const q = src[i]; const start = i; i++;
        while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
        i++;
        tokens.push({ start, end: i, cls: 'hl-str' });
      }
      // Line comment
      else if (src[i] === '/' && src[i + 1] === '/') {
        const start = i;
        while (i < src.length && src[i] !== '\n') i++;
        tokens.push({ start, end: i, cls: 'hl-cmt' });
      }
      // Block comment
      else if (src[i] === '/' && src[i + 1] === '*') {
        const start = i; i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        tokens.push({ start, end: i, cls: 'hl-cmt' });
      }
      // Decorator
      else if (src[i] === '@' && /[A-Z]/.test(src[i + 1] || '')) {
        const start = i; i++;
        while (i < src.length && /\w/.test(src[i])) i++;
        tokens.push({ start, end: i, cls: 'hl-dec' });
      }
      // Numbers
      else if (/\d/.test(src[i]) && (i === 0 || !/\w/.test(src[i - 1]))) {
        const start = i;
        while (i < src.length && /[\d.xXa-fA-FeEn_]/.test(src[i])) i++;
        tokens.push({ start, end: i, cls: 'hl-num' });
      }
      // Words (keywords, types, functions, identifiers)
      else if (/[a-zA-Z_$]/.test(src[i])) {
        const start = i;
        while (i < src.length && /[\w$]/.test(src[i])) i++;
        const word = src.slice(start, i);

        if (this.jsKeywords.has(word)) {
          tokens.push({ start, end: i, cls: 'hl-kw' });
        } else if (this.jsControl.has(word)) {
          tokens.push({ start, end: i, cls: 'hl-ctrl' });
        } else if (this.jsTypes.has(word) || /^[A-Z][a-zA-Z0-9]*$/.test(word)) {
          tokens.push({ start, end: i, cls: 'hl-type' });
        } else if (this.jsBuiltins.has(word)) {
          tokens.push({ start, end: i, cls: 'hl-bi' });
        } else if (i < src.length && src[i] === '(') {
          tokens.push({ start, end: i, cls: 'hl-fn' });
        } else if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined' || word === 'NaN' || word === 'Infinity') {
          tokens.push({ start, end: i, cls: 'hl-val' });
        }
        // else: normal identifier, no highlight
      }
      // Operators
      else if (/[+\-*/%=!<>&|^~?]/.test(src[i])) {
        const start = i;
        while (i < src.length && /[+\-*/%=!<>&|^~?:]/.test(src[i])) i++;
        tokens.push({ start, end: i, cls: 'hl-op' });
      }
      // Brackets
      else if (/[{}()\[\]]/.test(src[i])) {
        tokens.push({ start: i, end: i + 1, cls: 'hl-br' });
        i++;
      }
      else {
        i++;
      }
    }

    return this.applyTokens(src, tokens);
  }

  // ===== HTML =====
  private highlightHTML(code: string): string {
    // Simple regex-based HTML highlighting
    let html = this.escapeHtml(code);

    // Comments
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-cmt">$1</span>');
    // Tags
    html = html.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="hl-tag">$2</span>');
    // Attribute names
    html = html.replace(/\s([\w-]+)(=)/g, ' <span class="hl-attr">$1</span>$2');
    // Attribute values in quotes
    html = html.replace(/(=)(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '$1<span class="hl-str">$2</span>');
    // {{ interpolation }}
    html = html.replace(/(\{\{.*?\}\})/g, '<span class="hl-interp">$1</span>');
    // *ngFor, *ngIf, [(ngModel)], [class.x], (click)
    html = html.replace(/(\*\w+|[\[\(][\w.]+[\]\)])/g, '<span class="hl-dir">$1</span>');

    return html;
  }

  // ===== CSS =====
  private highlightCSS(code: string): string {
    let html = this.escapeHtml(code);

    // Comments
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-cmt">$1</span>');
    // Properties
    html = html.replace(/^(\s*)([\w-]+)(\s*:)/gm, '$1<span class="hl-prop">$2</span>$3');
    // Values after :
    html = html.replace(/(:\s*)([^;{}\n]+)(;?)/g, '$1<span class="hl-val">$2</span>$3');
    // Selectors (lines ending with {)
    html = html.replace(/^([^{\/\n]+?)(\s*\{)/gm, '<span class="hl-sel">$1</span>$2');
    // Numbers with units
    html = html.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms|deg|fr)\b/g, '<span class="hl-num">$1$2</span>');
    // Colors
    html = html.replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="hl-num">$1</span>');
    // @rules
    html = html.replace(/(@[\w-]+)/g, '<span class="hl-kw">$1</span>');

    return html;
  }

  // ===== JSON =====
  private highlightJSON(code: string): string {
    let html = this.escapeHtml(code);

    // Keys
    html = html.replace(/(&quot;)([\w$.-]+)(&quot;)(\s*:)/g, '<span class="hl-prop">$1$2$3</span>$4');
    // String values
    html = html.replace(/(:\s*)(&quot;[^&]*?&quot;)/g, '$1<span class="hl-str">$2</span>');
    // Numbers
    html = html.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="hl-num">$1</span>');
    // Booleans & null
    html = html.replace(/:\s*(true|false|null)\b/g, ': <span class="hl-val">$1</span>');

    return html;
  }

  // ===== PYTHON =====
  private highlightPython(code: string): string {
    const tokens: { start: number; end: number; cls: string }[] = [];
    const src = code;
    let i = 0;
    const pyKw = new Set(['def', 'class', 'import', 'from', 'return', 'yield', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'raise', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda', 'global', 'nonlocal', 'del', 'assert', 'async', 'await']);
    const pyBi = new Set(['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'enumerate', 'zip', 'map', 'filter', 'super', 'self', 'None', 'True', 'False']);

    while (i < src.length) {
      if (src[i] === '#') {
        const s = i; while (i < src.length && src[i] !== '\n') i++;
        tokens.push({ start: s, end: i, cls: 'hl-cmt' });
      } else if ((src[i] === '"' && src[i+1] === '"' && src[i+2] === '"') || (src[i] === "'" && src[i+1] === "'" && src[i+2] === "'")) {
        const q = src.slice(i, i + 3); const s = i; i += 3;
        while (i < src.length - 2 && src.slice(i, i + 3) !== q) i++;
        i += 3;
        tokens.push({ start: s, end: i, cls: 'hl-str' });
      } else if (src[i] === "'" || src[i] === '"') {
        const q = src[i]; const s = i; i++;
        while (i < src.length && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') i++; i++; }
        i++;
        tokens.push({ start: s, end: i, cls: 'hl-str' });
      } else if (/\d/.test(src[i]) && (i === 0 || !/\w/.test(src[i-1]))) {
        const s = i; while (i < src.length && /[\d.xXa-fA-FeEjJ_]/.test(src[i])) i++;
        tokens.push({ start: s, end: i, cls: 'hl-num' });
      } else if (/[a-zA-Z_]/.test(src[i])) {
        const s = i; while (i < src.length && /\w/.test(src[i])) i++;
        const w = src.slice(s, i);
        if (pyKw.has(w)) tokens.push({ start: s, end: i, cls: 'hl-kw' });
        else if (pyBi.has(w)) tokens.push({ start: s, end: i, cls: 'hl-bi' });
        else if (/^[A-Z]/.test(w)) tokens.push({ start: s, end: i, cls: 'hl-type' });
        else if (i < src.length && src[i] === '(') tokens.push({ start: s, end: i, cls: 'hl-fn' });
        else if (w === 'True' || w === 'False' || w === 'None') tokens.push({ start: s, end: i, cls: 'hl-val' });
      } else if (src[i] === '@') {
        const s = i; i++; while (i < src.length && /\w/.test(src[i])) i++;
        tokens.push({ start: s, end: i, cls: 'hl-dec' });
      } else { i++; }
    }
    return this.applyTokens(src, tokens);
  }

  // ===== HELPERS =====

  private applyTokens(src: string, tokens: { start: number; end: number; cls: string }[]): string {
    if (tokens.length === 0) return this.escapeHtml(src);

    // Sort by start, filter overlaps
    tokens.sort((a, b) => a.start - b.start);
    const cleaned: typeof tokens = [];
    let lastEnd = 0;
    for (const t of tokens) {
      if (t.start >= lastEnd) {
        cleaned.push(t);
        lastEnd = t.end;
      }
    }

    let result = '';
    let pos = 0;
    for (const t of cleaned) {
      if (t.start > pos) result += this.escapeHtml(src.slice(pos, t.start));
      result += `<span class="${t.cls}">${this.escapeHtml(src.slice(t.start, t.end))}</span>`;
      pos = t.end;
    }
    if (pos < src.length) result += this.escapeHtml(src.slice(pos));
    return result;
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ===== KEYWORD SETS =====

  private jsKeywords = new Set([
    'const', 'let', 'var', 'function', 'class', 'extends', 'new', 'delete', 'typeof', 'instanceof', 'void',
    'return', 'yield', 'async', 'await', 'static', 'get', 'set',
    'import', 'export', 'from', 'default', 'as',
    'this', 'super',
    'interface', 'type', 'enum', 'namespace', 'declare', 'abstract', 'implements',
    'readonly', 'private', 'protected', 'public', 'override',
    'module', 'require',
  ]);

  private jsControl = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'in', 'of',
  ]);

  private jsTypes = new Set([
    'string', 'number', 'boolean', 'any', 'void', 'never', 'unknown', 'object', 'symbol', 'bigint',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Promise', 'Date', 'RegExp',
    'Error', 'TypeError', 'RangeError', 'SyntaxError',
    'HTMLElement', 'Element', 'Event', 'Observable', 'Subject', 'BehaviorSubject',
    'Component', 'Injectable', 'NgModule', 'Pipe', 'Directive',
    'EventEmitter', 'TemplateRef', 'ViewChild', 'Input', 'Output',
    'ChangeDetectorRef', 'ElementRef', 'Renderer2', 'ActivatedRoute', 'Router',
    'HttpClient', 'FormGroup', 'FormControl', 'Validators',
  ]);

  private jsBuiltins = new Set([
    'console', 'window', 'document', 'Math', 'JSON', 'parseInt', 'parseFloat',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'fetch', 'alert', 'confirm', 'prompt',
    'require', 'module', 'exports', 'process', '__dirname', '__filename',
    'Buffer', 'global',
  ]);
}
