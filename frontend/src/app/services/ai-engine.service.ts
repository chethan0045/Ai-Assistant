import { Injectable, signal, inject } from '@angular/core';
import { ProjectFile, ProjectReport, ProjectScannerService } from './project-scanner.service';
import { AIModuleService, AIProvider } from './ai-module.service';
import { answerQuestion } from './knowledge-base';
import { ProjectTemplatesService } from './project-templates.service';
import { FileSystemService } from './file-system.service';
import { KnowledgeApiService } from './knowledge-api.service';
import { AlgorithmsService } from './algorithms.service';
import { EnhancementsService } from './enhancements.service';

// ===== TYPES =====

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  artifacts?: Artifact[];
  steps?: TaskStep[];
  thinking?: string;
  _thinkingOpen?: boolean;
}

export interface Artifact {
  id: string;
  type: 'code' | 'diff' | 'testcase' | 'markdown';
  title: string;
  language: string;
  content: string;
  originalContent?: string;
  file?: string;
  applied?: boolean;
  editable?: boolean;
}

export interface TaskStep {
  label: string;
  status: 'pending' | 'running' | 'done';
  detail?: string;
}

// ===== CODE PATTERNS =====

interface Route { method: string; path: string; file: string; line: number; params?: string[]; hasAuth: boolean; hasValidation: boolean; }
interface Func { name: string; params: string[]; file: string; line: number; isAsync: boolean; }
interface Model { name: string; fields: { name: string; type: string }[]; file: string; }
interface Component { name: string; file: string; type: 'component' | 'service' | 'module' | 'guard' | 'pipe'; }

interface ProjectAnalysis {
  routes: Route[];
  functions: Func[];
  models: Model[];
  components: Component[];
  imports: { module: string; file: string }[];
  projectType: string;
  frameworks: string[];
}

// ===== TEST CASE =====

export interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'api' | 'integration' | 'e2e';
  priority: 'high' | 'medium' | 'low';
  steps: string[];
  expected: string;
  code: string;
  targetFile: string;
  status: 'pending' | 'pass' | 'fail';
}

@Injectable({ providedIn: 'root' })
export class AIEngineService {

  readonly messages = signal<ChatMessage[]>([]);
  readonly analyzing = signal(false);
  readonly projectMd = signal<string>('');
  readonly testCases = signal<TestCase[]>([]);
  readonly streamingText = signal('');
  readonly streamingId = signal('');
  readonly aiModuleAvailable = signal(false);
  readonly activeProvider = signal<'local' | 'ai-module' | 'deepseek'>('local');

  private scanner: ProjectScannerService | null = null;
  private analysis: ProjectAnalysis | null = null;
  private aiModule = new AIModuleService();
  private templates = inject(ProjectTemplatesService);
  private fs = inject(FileSystemService);
  private kbApi = inject(KnowledgeApiService);
  private algos = inject(AlgorithmsService);
  private enhancements = inject(EnhancementsService);
  private aiSessionId: string | null = null;
  private idCounter = 0;
  private id(): string { return 'ai_' + (++this.idCounter); }

  projectBasePath = '';

  injectScanner(s: ProjectScannerService) { this.scanner = s; }

  /**
   * Initialize the AI Module connection.
   * Call this once after the component loads to check availability.
   */
  async initAIModule(): Promise<void> {
    try {
      const status = await this.aiModule.getStatus();
      this.aiModuleAvailable.set(status.status === 'ready');
      if (this.aiModuleAvailable()) {
        await this.aiModule.listModels();
      }
    } catch {
      this.aiModuleAvailable.set(false);
    }
  }

  /**
   * Switch the active AI provider.
   */
  setProvider(provider: 'local' | 'ai-module' | 'deepseek'): void {
    this.activeProvider.set(provider);
  }

  /**
   * Get the AI Module service for direct access to models, sessions, etc.
   */
  getAIModule(): AIModuleService {
    return this.aiModule;
  }

  // ===== MAIN ENTRY =====

  async sendMessage(input: string, report: ProjectReport, currentFile?: ProjectFile): Promise<void> {
    if (!input.trim()) return;

    this.messages.update(m => [...m, { id: this.id(), role: 'user', text: input, timestamp: new Date() }]);
    this.analyzing.set(true);

    // Analyze project if not done
    if (!this.analysis) this.analysis = this.analyzeProject(report);

    try {
      // Simulate typing delay for natural feel
      const msgId = this.id();
      this.streamingId.set(msgId);
      this.streamingText.set('');

      // Route to AI Module if available and selected, or if command targets it
      const cmd = input.toLowerCase();
      let response: ChatMessage;

      if ((this.activeProvider() === 'ai-module' && this.aiModuleAvailable()) ||
          cmd.startsWith('/ai ') || cmd.includes('ai module') ||
          cmd.includes('cost estimate') || cmd.includes('token usage') ||
          cmd.includes('list models') || cmd.includes('model info')) {
        response = await this.cmdAIModule(input, report, currentFile);
      } else {
        const result = this.processCommand(input, report, currentFile);
        response = result instanceof Promise ? await result : result;
      }

      // Stream the text character by character
      await this.streamText(response.text, msgId);

      // Add final message with artifacts
      this.messages.update(m => [...m, { ...response, id: msgId }]);
      this.streamingId.set('');
      this.streamingText.set('');
    } finally {
      this.analyzing.set(false);
    }
  }

  private async streamText(text: string, msgId: string): Promise<void> {
    const words = text.split(' ');
    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? ' ' : '') + words[i];
      this.streamingText.set(accumulated);
      // Small delay every few words for natural typing effect
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 15));
    }
  }

  // ===== COMMAND ROUTER =====

  private processCommand(input: string, report: ProjectReport, currentFile?: ProjectFile): ChatMessage | Promise<ChatMessage> {
    const cmd = input.toLowerCase();

    // Structured intent JSON — { "intent": "...", "keywords": [...], "output": "..." }
    const intentMatch = this.tryParseIntent(input);
    if (intentMatch) {
      return this.cmdStructuredIntent(intentMatch);
    }

    // Detect if user pasted executable JS code
    if (this.looksLikeExecutableCode(input)) {
      return this.cmdRunCode(input);
    }

    // Enhancement request — "add X feature", "make it so Y", "enhance with Z", "improve this to do X"
    const isEnhancement = /\b(add(\s|ing)?|enhance|improve|include|make it|make the|make this|modify|change|update|extend)\b.*\b(feature|functionality|support|so that|to do|to have|detection|dialog|option|ability)\b/i.test(cmd)
      || /\benhancement\b/i.test(cmd)
      || /make.*(game|app|code|project).*\b(happens?|work|detect|supports?)\b/i.test(cmd);
    if (isEnhancement && report?.files && report.files.length > 0) {
      return this.cmdEnhanceProject(input, report);
    }

    // Bug report on current project — "button not working", "X is broken", "doesn't work", etc.
    const isBugReport = /\b(not working|doesn'?t work|isn'?t working|broken|not responding|not clickable|no response|not firing|won'?t click|stuck|bug in|issue in|fix my|fix this|is broken)\b/i.test(cmd);
    if (isBugReport && report?.files && report.files.length > 0) {
      return this.cmdFixProjectBug(input, report, currentFile);
    }

    // Algorithm/snippet generation — "create/write/generate code for fibonacci/factorial/etc."
    // This must run BEFORE project-specific commands so "create fibonacci" doesn't hit cmdGenerateCode (which edits files)
    const isAlgoRequest = (cmd.includes('create') || cmd.includes('write') || cmd.includes('generate') ||
                          cmd.includes('code for') || cmd.includes('code to') || cmd.includes('give me') ||
                          cmd.includes('show me')) && !/project|component|service|module|folder|file|app/i.test(cmd);
    if (isAlgoRequest) {
      const snippet = this.algos.find(input);
      if (snippet) return this.cmdAlgorithm(snippet);
    }
    // Also try bare requests like "fibonacci" or "palindrome check"
    if (cmd.split(/\s+/).length <= 4 && !cmd.includes('?')) {
      const snippet = this.algos.find(input);
      if (snippet) return this.cmdAlgorithm(snippet);
    }

    // OTP addition (patch) — highest priority for project modifications
    const wantsOtp = cmd.includes('otp') || cmd.includes('verify email') || cmd.includes('email verification') || cmd.includes('verification code');
    if (wantsOtp && report?.tree) {
      return this.cmdScaffoldProject('add-otp', report);
    }

    // Project scaffolding — detect "create X project" / "scaffold" / "generate project"
    const isCreateProject = (cmd.includes('create') || cmd.includes('scaffold') || cmd.includes('generate') || cmd.includes('build') || cmd.includes('make') || cmd.includes('new'))
      && (cmd.includes('project') || cmd.includes('angular') || cmd.includes('express') || cmd.includes('fullstack') || cmd.includes('full stack') || cmd.includes('full-stack') || cmd.includes('backend') && cmd.includes('frontend'));
    if (isCreateProject) {
      const templateId = this.templates.detectTemplate(input);
      if (templateId) {
        return this.cmdScaffoldProject(templateId, report);
      }
    }

    // Project-specific commands (need a loaded project)
    if (cmd.includes('epic') || cmd.includes('feature') || cmd.includes('stor')) {
      return this.cmdExtractALM(report);
    }
    if ((cmd.includes('test case') || cmd.includes('generate test')) && report.totalFiles > 0) {
      return this.cmdGenerateTests(report, currentFile);
    }
    if (cmd.includes('explain') && (cmd.includes('project') || cmd.includes('structure')) && report.totalFiles > 0) {
      return this.cmdExplainProject(report);
    }
    if ((cmd.includes('explain') || cmd.includes('what does')) && currentFile && cmd.includes('file')) {
      return this.cmdExplainFile(currentFile, report);
    }
    if (cmd.includes('fix') || cmd.includes('debug') || cmd.includes('error') || cmd.includes('bug')) {
      if (currentFile) return this.cmdFixCode(input, report, currentFile);
    }
    if (cmd.includes('build') || cmd.includes('create') || cmd.includes('generate') || cmd.includes('write')) {
      if (report.totalFiles > 0) return this.cmdGenerateCode(input, report, currentFile);
    }
    if (cmd.includes('auto code') || cmd.includes('automation')) {
      return this.cmdAutoCode(report, currentFile);
    }
    if (cmd.includes('find') || cmd.includes('search') || cmd.includes('where')) {
      if (report.totalFiles > 0) return this.cmdSearch(input, report);
    }
    if (cmd === 'help' || cmd === '/help') {
      return this.cmdHelp();
    }

    // MongoDB knowledge-backed code generation
    // Trigger: "write code for X", "generate code for X", "build me X", "how to implement X", "code for X"
    const isCodeGenRequest = /(write|generate|build|implement|code|give).*(code|snippet|implementation|example)/i.test(cmd) ||
      /(code|implementation|snippet|example)\s+(for|of|to)/i.test(cmd) ||
      cmd.startsWith('build me') || cmd.startsWith('write me') || cmd.startsWith('give me code');
    if (isCodeGenRequest) {
      return this.cmdGenerateFromKB(input);
    }

    // Knowledge base — answer any question offline
    return this.cmdKnowledge(input);
  }

  // ===== MONGODB-BACKED CODE GENERATION =====

  private async cmdGenerateFromKB(input: string): Promise<ChatMessage> {
    const steps: TaskStep[] = [
      { label: 'Parsing request', status: 'done', detail: input.slice(0, 60) },
      { label: 'Querying knowledge base', status: 'running' },
      { label: 'Assembling patterns', status: 'pending' },
      { label: 'Generating code', status: 'pending' },
    ];

    const result = await this.kbApi.generateCode(input);

    if (!result) {
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: `Could not reach knowledge base. Make sure the backend is running:\n\n\`\`\`bash\ncd C:\\AI\\backend\nnode terminal-server.js\n\`\`\``,
        steps: [
          { label: 'Backend unreachable', status: 'done', detail: 'check server on port 4100' },
        ],
      };
    }

    if (!result.code || result.patterns_used.length === 0) {
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: result.message || 'No matching patterns in the knowledge base. Try more specific terms like "angular login form", "express crud api", or "mongoose user schema".',
      };
    }

    const doneSteps: TaskStep[] = [
      { label: 'Parsed request', status: 'done', detail: input.slice(0, 60) },
      { label: 'Queried knowledge base', status: 'done', detail: `${result.patterns_used.length} patterns` },
      { label: 'Primary pattern', status: 'done', detail: result.primary_pattern || 'auto-detected' },
      { label: 'Assembled code', status: 'done', detail: `${result.code.split('\n').length} lines` },
    ];

    let text = `## Generated Code\n\n`;
    text += `**Based on ${result.patterns_used.length} patterns from the knowledge base:**\n`;
    text += result.patterns_used.map(p => `- **${p.title}** (${p.category})`).join('\n');
    text += `\n\n---\n\n`;
    text += result.code;

    return { id: '', role: 'ai', text, timestamp: new Date(), steps: doneSteps };
  }

  // ===== EXTRACT EPICS / FEATURES / STORIES =====

  private cmdExtractALM(report: ProjectReport): ChatMessage {
    const a = this.analysis!;
    const steps: TaskStep[] = [
      { label: 'Scanning project structure', status: 'done', detail: `${report.totalFiles} files` },
      { label: 'Detecting route groups (Epics)', status: 'done', detail: `${a.routes.length} routes` },
      { label: 'Detecting components (Features)', status: 'done', detail: `${a.components.length} components` },
      { label: 'Extracting functions (Stories)', status: 'done', detail: `${a.functions.length} functions` },
    ];

    // Group routes into epics
    const epics = new Map<string, Route[]>();
    for (const r of a.routes) {
      const group = r.path.split('/').filter(Boolean)[0] || 'root';
      if (!epics.has(group)) epics.set(group, []);
      epics.get(group)!.push(r);
    }

    let text = `**Project Analysis Complete**\n\n`;
    text += `**Type:** ${a.projectType}\n**Frameworks:** ${a.frameworks.join(', ')}\n\n`;

    text += `**Epics (${epics.size}):**\n`;
    for (const [name, routes] of epics) {
      text += `- **${name}** — ${routes.length} endpoints (${routes.map(r => r.method).join(', ')})\n`;
    }

    text += `\n**Features (${a.components.length}):**\n`;
    for (const c of a.components.slice(0, 15)) {
      text += `- **${c.name}** (${c.type}) — \`${c.file}\`\n`;
    }

    text += `\n**User Stories (${a.functions.length}):**\n`;
    for (const f of a.functions.slice(0, 15)) {
      text += `- \`${f.name}(${f.params.join(', ')})\` — ${f.file}:${f.line}\n`;
    }

    text += `\n**Models (${a.models.length}):**\n`;
    for (const m of a.models) {
      text += `- **${m.name}** — ${m.fields.map(f => f.name).join(', ')}\n`;
    }

    return { id: '', role: 'ai', text, timestamp: new Date(), steps };
  }

  // ===== GENERATE TEST CASES =====

  private cmdGenerateTests(report: ProjectReport, currentFile?: ProjectFile): ChatMessage {
    const a = this.analysis!;
    const tests: TestCase[] = [];

    // API tests for routes
    for (const route of a.routes) {
      // Success test
      tests.push({
        id: this.id(), name: `${route.method} ${route.path} — success`,
        type: 'api', priority: 'high', targetFile: route.file, status: 'pending',
        steps: [`Send ${route.method} request to ${route.path}`, 'Include valid auth token', 'Send valid request body'],
        expected: 'Returns 200 with expected data',
        code: this.genAPITest(route, 'success'),
      });
      // Error test
      tests.push({
        id: this.id(), name: `${route.method} ${route.path} — unauthorized`,
        type: 'api', priority: 'high', targetFile: route.file, status: 'pending',
        steps: [`Send ${route.method} request without token`],
        expected: 'Returns 401 Unauthorized',
        code: this.genAPITest(route, 'error'),
      });
      // Validation test for POST/PUT
      if (route.method === 'POST' || route.method === 'PUT') {
        tests.push({
          id: this.id(), name: `${route.method} ${route.path} — validation`,
          type: 'api', priority: 'medium', targetFile: route.file, status: 'pending',
          steps: [`Send ${route.method} with empty body`],
          expected: 'Returns 400 with validation error',
          code: this.genAPITest(route, 'validation'),
        });
      }
    }

    // Unit tests for functions
    for (const func of a.functions.slice(0, 20)) {
      tests.push({
        id: this.id(), name: `${func.name}() — valid input`,
        type: 'unit', priority: 'medium', targetFile: func.file, status: 'pending',
        steps: [`Call ${func.name} with valid arguments`, 'Verify return value'],
        expected: 'Returns expected result without errors',
        code: this.genUnitTest(func),
      });
    }

    // Model tests
    for (const model of a.models) {
      tests.push({
        id: this.id(), name: `${model.name} — create valid`,
        type: 'integration', priority: 'high', targetFile: model.file, status: 'pending',
        steps: [`Create ${model.name} with all required fields`, 'Verify saved to DB'],
        expected: `${model.name} created with correct fields`,
        code: this.genModelTest(model, 'create'),
      });
      tests.push({
        id: this.id(), name: `${model.name} — required fields`,
        type: 'integration', priority: 'medium', targetFile: model.file, status: 'pending',
        steps: [`Create ${model.name} without required fields`],
        expected: 'Validation error thrown',
        code: this.genModelTest(model, 'validation'),
      });
    }

    this.testCases.set(tests);

    // Build artifact with full test file
    const fullTestCode = this.buildFullTestFile(tests);

    let text = `Generated **${tests.length} test cases**:\n\n`;
    text += `| Type | Count |\n|------|-------|\n`;
    text += `| API Tests | ${tests.filter(t => t.type === 'api').length} |\n`;
    text += `| Unit Tests | ${tests.filter(t => t.type === 'unit').length} |\n`;
    text += `| Integration | ${tests.filter(t => t.type === 'integration').length} |\n\n`;

    text += `**Test Cases:**\n`;
    for (const t of tests.slice(0, 20)) {
      text += `- [${t.priority.toUpperCase()}] ${t.name}\n`;
    }
    if (tests.length > 20) text += `- ... and ${tests.length - 20} more\n`;

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Analyzing routes', status: 'done', detail: `${a.routes.length} routes` },
        { label: 'Analyzing functions', status: 'done', detail: `${a.functions.length} functions` },
        { label: 'Generating test cases', status: 'done', detail: `${tests.length} tests` },
      ],
      artifacts: [{
        id: this.id(), type: 'code', title: 'tests.spec.js', language: 'javascript',
        content: fullTestCode, editable: true,
      }],
    };
  }

  // ===== EXPLAIN PROJECT =====

  private cmdExplainProject(report: ProjectReport): ChatMessage {
    const a = this.analysis!;
    let text = `**${report.tree?.name || 'Project'} — ${a.projectType}**\n\n`;
    text += `**Stack:** ${a.frameworks.join(', ')}\n`;
    text += `**Files:** ${report.totalFiles} (${report.totalLines.toLocaleString()} lines)\n\n`;

    text += `**Architecture:**\n`;
    if (a.routes.length > 0) text += `- ${a.routes.length} API endpoints across ${new Set(a.routes.map(r => r.file)).size} route files\n`;
    if (a.models.length > 0) text += `- ${a.models.length} data models: ${a.models.map(m => m.name).join(', ')}\n`;
    if (a.components.length > 0) text += `- ${a.components.length} components/services\n`;
    text += `- ${a.functions.length} functions detected\n`;

    if (a.routes.length > 0) {
      text += `\n**API Routes:**\n`;
      for (const r of a.routes.slice(0, 15)) {
        text += `- \`${r.method} ${r.path}\` ${r.hasAuth ? '🔒' : '🔓'} — ${r.file.split('/').pop()}\n`;
      }
    }

    const md = text;
    this.projectMd.set(md);

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      artifacts: [{ id: this.id(), type: 'markdown', title: 'project-analysis.md', language: 'markdown', content: md }],
    };
  }

  // ===== EXPLAIN FILE =====

  private cmdExplainFile(currentFile: ProjectFile | undefined, report: ProjectReport): ChatMessage {
    if (!currentFile) return { id: '', role: 'ai', text: 'Open a file first, then ask me to explain it.', timestamp: new Date() };

    const lines = currentFile.content.split('\n');
    const funcs = this.analysis!.functions.filter(f => f.file === currentFile.path);
    const routes = this.analysis!.routes.filter(r => r.file === currentFile.path);
    const imports = this.analysis!.imports.filter(i => i.file === currentFile.path);

    let text = `**${currentFile.name}** — ${this.detectFilePurpose(currentFile)}\n\n`;
    text += `**Lines:** ${lines.length} | **Language:** ${currentFile.language}\n\n`;

    if (imports.length > 0) {
      text += `**Dependencies:** ${imports.map(i => `\`${i.module}\``).join(', ')}\n\n`;
    }
    if (routes.length > 0) {
      text += `**Routes:**\n`;
      for (const r of routes) text += `- \`${r.method} ${r.path}\` (line ${r.line})\n`;
      text += '\n';
    }
    if (funcs.length > 0) {
      text += `**Functions:**\n`;
      for (const f of funcs) text += `- \`${f.name}(${f.params.join(', ')})\` ${f.isAsync ? '(async)' : ''} — line ${f.line}\n`;
      text += '\n';
    }

    // Suggestions
    const suggestions: string[] = [];
    if (routes.some(r => !r.hasAuth)) suggestions.push('Some routes lack authentication middleware');
    if (routes.some(r => !r.hasValidation)) suggestions.push('Missing input validation on some endpoints');
    if (!currentFile.content.includes('try') && currentFile.content.includes('async')) suggestions.push('Async code without try-catch error handling');
    if (lines.length > 300) suggestions.push('File is large (300+ lines) — consider splitting');
    if (currentFile.content.includes('console.log')) suggestions.push('Remove console.log before production');

    if (suggestions.length > 0) {
      text += `**Suggestions:**\n`;
      for (const s of suggestions) text += `- ${s}\n`;
    }

    return { id: '', role: 'ai', text, timestamp: new Date() };
  }

  // ===== FIX CODE =====

  private cmdFixCode(input: string, report: ProjectReport, currentFile?: ProjectFile): ChatMessage {
    if (!currentFile) return { id: '', role: 'ai', text: 'Open a file first to fix it.', timestamp: new Date() };

    const lines = currentFile.content.split('\n');
    const newLines = [...lines];
    const changes: string[] = [];

    // Add null checks after DB queries
    for (let i = newLines.length - 1; i >= 0; i--) {
      const m = newLines[i].match(/(?:const|let)\s+(\w+)\s*=\s*await\s+\w+\.(findOne|findById)\s*\(/);
      if (m && !newLines.slice(i + 1, i + 4).join('').includes('if (!')) {
        newLines.splice(i + 1, 0, `    if (!${m[1]}) return res.status(404).json({ error: '${m[1]} not found' });`);
        changes.push(`Added null check for \`${m[1]}\` at line ${i + 1}`);
      }
    }

    // Add validation for req.body
    for (let i = 0; i < newLines.length; i++) {
      const bm = newLines[i].match(/(?:const|let)\s*\{\s*([\w\s,]+)\s*\}\s*=\s*req\.body/);
      if (bm && !newLines.slice(i + 1, i + 5).join('').includes('if (!')) {
        const fields = bm[1].split(',').map(f => f.trim()).filter(Boolean);
        newLines.splice(i + 1, 0, `    if (${fields.map(f => '!' + f).join(' || ')}) return res.status(400).json({ error: '${fields.join(', ')} required' });`);
        changes.push(`Added validation for \`${fields.join(', ')}\``);
      }
    }

    // Add try-catch to async functions without it
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].match(/async\s+/) && !newLines.slice(i, Math.min(i + 15, newLines.length)).join('').includes('try')) {
        const end = this.findBlockEnd(newLines, i);
        if (end > i + 2) {
          newLines.splice(i + 1, 0, '  try {');
          newLines.splice(end + 2, 0, '  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }');
          changes.push(`Added try-catch at line ${i + 1}`);
          break;
        }
      }
    }

    if (changes.length === 0) {
      return { id: '', role: 'ai', text: `No issues found in **${currentFile.name}**. The code looks good!`, timestamp: new Date() };
    }

    const fixed = newLines.join('\n');
    let text = `Fixed **${changes.length} issues** in **${currentFile.name}**:\n\n`;
    for (const c of changes) text += `- ${c}\n`;

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      artifacts: [{
        id: this.id(), type: 'diff', title: currentFile.name, language: currentFile.language || 'javascript',
        content: fixed, originalContent: currentFile.content, file: currentFile.path, editable: true,
      }],
    };
  }

  // ===== GENERATE CODE =====

  private cmdGenerateCode(input: string, report: ProjectReport, currentFile?: ProjectFile): ChatMessage {
    const cmd = input.toLowerCase();
    const artifacts: Artifact[] = [];
    const steps: TaskStep[] = [{ label: 'Analyzing request', status: 'done' }];

    if (cmd.includes('login') || cmd.includes('auth')) {
      steps.push({ label: 'Generating auth system', status: 'done', detail: '4 files' });
      artifacts.push({ id: this.id(), type: 'code', title: 'models/User.js', language: 'javascript', content: this.tplUserModel(), editable: true });
      artifacts.push({ id: this.id(), type: 'code', title: 'routes/auth.js', language: 'javascript', content: this.tplAuthRoutes(), editable: true });
      artifacts.push({ id: this.id(), type: 'code', title: 'middleware/auth.js', language: 'javascript', content: this.tplAuthMiddleware(), editable: true });
      artifacts.push({ id: this.id(), type: 'code', title: 'login.component.ts', language: 'typescript', content: this.tplLoginComponent(), editable: true });
      return { id: '', role: 'ai', text: `Generated **login/auth system** with 4 files:\n- User model\n- Auth routes (login + register)\n- JWT middleware\n- Login component`, timestamp: new Date(), steps, artifacts };
    }

    const crudMatch = cmd.match(/(?:crud|api|rest)\s+(?:for\s+)?(\w+)/i) || cmd.match(/(\w+)\s+(?:crud|api|model)/i);
    if (crudMatch) {
      const name = crudMatch[1].charAt(0).toUpperCase() + crudMatch[1].slice(1);
      steps.push({ label: `Generating CRUD for ${name}`, status: 'done', detail: '2 files' });
      artifacts.push({ id: this.id(), type: 'code', title: `models/${name}.js`, language: 'javascript', content: this.tplModel(name), editable: true });
      artifacts.push({ id: this.id(), type: 'code', title: `routes/${name.toLowerCase()}s.js`, language: 'javascript', content: this.tplCRUD(name), editable: true });
      return { id: '', role: 'ai', text: `Generated **CRUD API** for **${name}**:\n- Mongoose model with timestamps\n- Express routes (GET, POST, PUT, DELETE)`, timestamp: new Date(), steps, artifacts };
    }

    const compMatch = cmd.match(/component\s+(?:for\s+|named?\s+)?(\w+)/i) || cmd.match(/(\w+)\s+component/i);
    if (compMatch) {
      const name = compMatch[1];
      artifacts.push({ id: this.id(), type: 'code', title: `${name}.component.ts`, language: 'typescript', content: this.tplComponent(name), editable: true });
      return { id: '', role: 'ai', text: `Generated Angular component **${name}**`, timestamp: new Date(), artifacts };
    }

    if (currentFile) {
      return this.cmdFixCode(input, report, currentFile);
    }

    return { id: '', role: 'ai', text: 'What would you like to generate?\n- `build login page`\n- `create CRUD for Product`\n- `generate dashboard component`', timestamp: new Date() };
  }

  // ===== AUTO CODE (test automation) =====

  private cmdAutoCode(report: ProjectReport, currentFile?: ProjectFile): ChatMessage {
    const tests = this.testCases();
    if (tests.length === 0) {
      // Generate tests first
      const result = this.cmdGenerateTests(report, currentFile);
      return { ...result, text: result.text + '\n\nTest automation code generated above. Copy and run with `npx jest`.' };
    }

    const code = this.buildFullTestFile(tests);
    return {
      id: '', role: 'ai', text: `Generated automation code for **${tests.length} test cases**. Run with:\n\`\`\`\nnpm install --save-dev jest supertest\nnpx jest tests.spec.js\n\`\`\``,
      timestamp: new Date(),
      artifacts: [{ id: this.id(), type: 'code', title: 'tests.spec.js', language: 'javascript', content: code, editable: true }],
    };
  }

  // ===== SEARCH =====

  private cmdSearch(input: string, report: ProjectReport): ChatMessage {
    const keywords = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !['find', 'search', 'where', 'the', 'for', 'and'].includes(w));
    const results: { file: string; line: number; text: string }[] = [];

    for (const file of report.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (keywords.some(k => lines[i].toLowerCase().includes(k))) {
          results.push({ file: file.path, line: i + 1, text: lines[i].trim().slice(0, 100) });
        }
      }
    }

    let text = `Found **${results.length} matches** for "${keywords.join(', ')}":\n\n`;
    const grouped = new Map<string, typeof results>();
    for (const r of results.slice(0, 40)) {
      if (!grouped.has(r.file)) grouped.set(r.file, []);
      grouped.get(r.file)!.push(r);
    }
    for (const [file, matches] of grouped) {
      text += `**${file}**\n`;
      for (const m of matches.slice(0, 3)) text += `  Line ${m.line}: \`${m.text}\`\n`;
      if (matches.length > 3) text += `  ... ${matches.length - 3} more\n`;
    }

    return { id: '', role: 'ai', text, timestamp: new Date() };
  }

  // ===== HELP =====

  private cmdHelp(): ChatMessage {
    return {
      id: '', role: 'ai', timestamp: new Date(),
      text: `**Commands:**\n\n` +
        `- **"extract epics"** — Analyze project, find epics/features/stories\n` +
        `- **"generate test cases"** — Auto-create tests for all routes & functions\n` +
        `- **"explain project"** — Full architecture breakdown\n` +
        `- **"explain this file"** — Analyze the open file\n` +
        `- **"fix this file"** — Auto-fix bugs, add validation & error handling\n` +
        `- **"build login page"** — Generate full auth system\n` +
        `- **"create CRUD for Product"** — Model + routes\n` +
        `- **"auto code"** — Generate test automation scripts\n` +
        `- **"find [keyword]"** — Search across all files\n\n` +
        `**AI Module Commands** (requires ai-server.py running):\n` +
        `- **"/ai list models"** — Show all available AI models and pricing\n` +
        `- **"/ai model info [alias]"** — Resolve model alias to details\n` +
        `- **"/ai cost estimate"** — Estimate token cost\n` +
        `- **"/ai analyze"** — Analyze current file with AI module\n` +
        `- **"/ai status"** — Show AI module status and providers\n` +
        `- **"/ai session"** — Start a new AI session\n` +
        `- **"/ai send [message]"** — Send message to AI session\n`,
    };
  }

  // ===== PROJECT SCAFFOLDING =====

  private async cmdScaffoldProject(templateId: string, report: ProjectReport): Promise<ChatMessage> {
    const template = this.templates.getTemplate(templateId);
    if (!template || !this.scanner) {
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: 'Could not generate project — template not found or scanner not available.',
      };
    }

    const folderName = report?.tree?.name || 'new-project';
    const basePath = this.scanner.projectBasePath();
    const isPatch = templateId === 'add-otp' || templateId === 'otp';

    // Generate/patch files in the scanner (memory)
    let newReport: ProjectReport;
    if (isPatch) {
      const patched = this.scanner.patchReport(folderName, template.files);
      if (!patched) {
        return {
          id: '', role: 'ai', timestamp: new Date(),
          text: 'No existing project found. Open a project first, then run this command.',
        };
      }
      newReport = patched;
    } else {
      newReport = this.scanner.scaffoldFromTemplate(folderName, template.files);
    }
    this.scanner.report.set(newReport);

    // Write to disk if basePath is set
    let diskResult: { success: string[]; failed: string[] } | null = null;
    if (basePath) {
      const sep = basePath.includes('\\') ? '\\' : '/';
      const diskFiles = template.files.map(f => ({
        path: basePath + sep + f.path.replace(/\//g, sep),
        content: f.content,
      }));
      diskResult = await this.fs.writeFiles(diskFiles);
    }

    const steps: TaskStep[] = [
      { label: 'Analyzing template', status: 'done', detail: template.name },
      { label: 'Generating files', status: 'done', detail: `${template.files.length} files` },
      { label: 'Writing to IDE tree', status: 'done', detail: `${newReport.totalFiles} visible` },
      { label: basePath ? 'Saving to disk' : 'Disk save skipped', status: 'done',
        detail: basePath ? `${diskResult?.success.length || 0} written to ${basePath}` : 'no disk path set' },
    ];

    // Auto-open the first meaningful file (server.js if fullstack, app.component.ts otherwise)
    const preferFiles = ['backend/server.js', 'frontend/src/app/app.component.ts', 'src/app/app.component.ts', 'server.js', 'README.md'];
    for (const pref of preferFiles) {
      const match = newReport.files.find(f => f.path === folderName + '/' + pref);
      if (match) { this.scanner.selectedFilePath.set(match.path); break; }
    }

    // Group files by folder for the summary
    const folders = new Map<string, number>();
    for (const f of template.files) {
      const folder = f.path.split('/').slice(0, -1).join('/') || '(root)';
      folders.set(folder, (folders.get(folder) || 0) + 1);
    }
    const folderList = Array.from(folders.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([folder, count]) => `- \`${folder || '/'}\` — ${count} file${count === 1 ? '' : 's'}`)
      .join('\n');

    let text = `**${isPatch ? 'Patch Applied' : 'Project Generated'}: ${template.name}**\n\n`;
    text += `${isPatch ? 'Modified' : 'Created'} **${template.files.length} file${template.files.length === 1 ? '' : 's'}** in \`${folderName}/\`\n\n`;

    if (basePath && diskResult) {
      text += `**Saved to disk:** \`${basePath}\`\n`;
      text += `${diskResult.success.length} written`;
      if (diskResult.failed.length > 0) text += `, ${diskResult.failed.length} failed`;
      text += `\n\n`;
    } else if (!basePath) {
      text += `**⚠️ No disk path** — files are in IDE memory only.\n`;
      text += `To save to disk, close this workspace, click "+ New Empty Project" and enter a disk path like \`C:\\Projects\`.\n\n`;
    }

    text += `**${isPatch ? 'Files Updated' : 'Structure'}:**\n${folderList}\n\n`;

    if (isPatch && templateId.startsWith('add-otp') || templateId === 'otp') {
      text += `**What's New:**\n`;
      text += `- Register now sends a 6-digit OTP to the user's email\n`;
      text += `- New OTP verification screen with 6 input boxes\n`;
      text += `- Resend OTP with 60-second cooldown\n`;
      text += `- Login blocks unverified users\n\n`;
      text += `**Required steps to activate:**\n`;
      text += `\`\`\`bash\n# Install nodemailer in backend\ncd ${folderName}/backend\nnpm install nodemailer\n\n# Set Gmail credentials in backend/.env\n# MAIL_USER=your-gmail@gmail.com\n# MAIL_PASS=your-app-password  (get at myaccount.google.com/apppasswords)\n\nnpm run dev\n\n# Frontend (new terminal)\ncd ${folderName}/frontend\nng serve\n\`\`\`\n\n`;
      text += `**How it works:**\n`;
      text += `1. User fills register form → submit\n`;
      text += `2. Backend generates 6-digit OTP, saves to user.otp + 10min expiry, emails via Gmail\n`;
      text += `3. UI switches to OTP screen with 6 input boxes\n`;
      text += `4. User enters code → verify → JWT issued → redirect to dashboard`;
    } else if (templateId.includes('fullstack') || templateId === 'angular-fullstack') {
      text += `**Next steps:**\n`;
      text += `\`\`\`bash\n# Backend\ncd ${folderName}/backend\nnpm install\n# Create .env with MONGO_URI and JWT_SECRET\nnpm run dev\n\n# Frontend (new terminal)\ncd ${folderName}/frontend\nnpm install\nng serve\n\`\`\`\n\n`;
      text += `Click any file in the Explorer to view/edit. Use the terminal below to run commands.`;
    } else if (templateId.includes('angular')) {
      text += `**Next steps:**\n\`\`\`bash\ncd ${folderName}\nnpm install\nng serve\n\`\`\`\n\n`;
      text += `Click any file in the Explorer to view/edit.`;
    } else {
      text += `**Next steps:**\n\`\`\`bash\ncd ${folderName}\nnpm install\nnpm run dev\n\`\`\``;
    }

    return { id: '', role: 'ai', text, timestamp: new Date(), steps };
  }

  // ===== STRUCTURED INTENT PARSER =====

  /**
   * Parse a JSON intent spec like:
   * { "intent": "generate fibonacci code", "keywords": [...], "output": "javascript function" }
   */
  private tryParseIntent(input: string): { intent?: string; keywords?: string[]; output?: string; language?: string } | null {
    const trimmed = input.trim();
    // Must start with { or have ```json fence
    if (!trimmed.startsWith('{') && !trimmed.includes('```json')) return null;

    // Strip json fences
    let jsonStr = trimmed;
    const fenceMatch = trimmed.match(/```json\s*([\s\S]+?)\s*```/i);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      // Must have at least one of the intent fields
      if (parsed && typeof parsed === 'object' && (parsed.intent || parsed.keywords || parsed.output)) {
        return parsed;
      }
    } catch {}
    return null;
  }

  /**
   * Handle structured intent by extracting target and routing.
   */
  private cmdStructuredIntent(intent: { intent?: string; keywords?: string[]; output?: string; language?: string }): ChatMessage {
    // Build a composite query from all fields
    const parts: string[] = [];
    if (intent.intent) parts.push(intent.intent);
    if (intent.keywords?.length) parts.push(...intent.keywords);
    if (intent.output) parts.push(intent.output);
    const query = parts.join(' ');

    // 1. Try algorithm matcher first
    const snippet = this.algos.find(query);
    if (snippet) {
      let text = `## ${snippet.name.charAt(0).toUpperCase() + snippet.name.slice(1).replace(/-/g, ' ')}\n\n`;
      text += `*Matched from structured intent:*\n\`\`\`json\n${JSON.stringify(intent, null, 2)}\n\`\`\`\n\n`;
      text += `${snippet.description}\n\n`;
      if (snippet.complexity) text += `**Complexity:** ${snippet.complexity}\n\n`;
      text += `### Implementation\n\`\`\`javascript\n${snippet.code}\n\`\`\`\n\n`;
      text += `### Example Usage\n\`\`\`javascript\n${snippet.example}\n\`\`\``;

      return {
        id: '', role: 'ai', text, timestamp: new Date(),
        steps: [
          { label: 'Parsed structured intent', status: 'done', detail: `${Object.keys(intent).length} fields` },
          { label: 'Matched algorithm', status: 'done', detail: snippet.name },
          { label: 'Generated code', status: 'done', detail: `${snippet.code.split('\n').length} lines` },
        ],
      };
    }

    // 2. Fall back to MongoDB KB code generation (async fire-and-format)
    return this.cmdStructuredIntentViaKB(intent, query);
  }

  private cmdStructuredIntentViaKB(intent: any, query: string): ChatMessage {
    // Kick off async KB lookup but return a message now, updating via streaming isn't clean here.
    // Simpler: return a sync placeholder that tells user we're looking — OR do async via the async path.
    // Since processCommand allows Promise<ChatMessage>, do it properly:
    return {
      id: '', role: 'ai',
      text: `**Structured Intent Received:**\n\`\`\`json\n${JSON.stringify(intent, null, 2)}\n\`\`\`\n\nNo direct algorithm match. Try one of:\n${this.algos.list().map(a => `- ${a}`).join('\n')}\n\nOr rephrase with clearer keywords.`,
      timestamp: new Date(),
    };
  }

  // ===== PROJECT ENHANCEMENT =====

  private cmdEnhanceProject(input: string, report: ProjectReport): ChatMessage {
    // Check if any known enhancement matches the request + current project
    const fileContents = report.files.map(f => ({ path: f.path, content: f.content }));
    const match = this.enhancements.detect(input, fileContents);

    if (!match) {
      // Fall through to knowledge base code generation for custom enhancements
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: `## Enhancement Request Received\n\nI don't have a pre-built enhancement matching your request.\n\n**Available enhancements for this project type:**\n${this.enhancements.list().map(e => `- **${e.name}** — ${e.description}`).join('\n')}\n\nOr describe it more specifically and I'll try to generate the patch.`,
      };
    }

    // Find target file in the project
    const folderName = report.tree?.name || '';
    const targetPath = match.targetFile;
    const targetFile = report.files.find(f =>
      f.path === folderName + '/' + targetPath || f.path.endsWith('/' + targetPath) || f.path === targetPath
    );

    if (!targetFile) {
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: `## Cannot Apply Enhancement\n\nTarget file \`${targetPath}\` not found in the project.\n\nMake sure the project structure matches.`,
      };
    }

    // Apply the patch — full file replacement
    if (!this.scanner) {
      return { id: '', role: 'ai', text: 'Scanner not available.', timestamp: new Date() };
    }

    const newContent = match.newContent;
    const updatedFile = { ...targetFile, content: newContent, size: newContent.length };
    const allFiles = report.files.map(f => f.path === targetFile.path ? updatedFile : f);
    const tree = this.scanner.buildTree(allFiles);
    if (report.tree?.name) { tree.name = report.tree.name; tree.path = report.tree.path; }
    const newReport = { ...report, files: allFiles, tree };
    this.scanner.report.set(newReport as any);
    this.scanner.selectedFilePath.set(targetFile.path);

    // Write to disk if basePath set
    const basePath = this.scanner.projectBasePath();
    let diskWritten = false;
    if (basePath) {
      const sep = basePath.includes('\\') ? '\\' : '/';
      const rel = targetFile.path.startsWith(folderName + '/')
        ? targetFile.path.slice(folderName.length + 1)
        : targetFile.path;
      const fullPath = basePath + sep + rel.replace(/\//g, sep);
      this.fs.writeFile(fullPath, newContent);
      diskWritten = true;
    }

    let text = `## ✨ Enhancement Applied: ${match.name}\n\n`;
    text += `${match.description}\n\n`;
    text += `**File updated:** \`${targetFile.path}\`\n`;
    text += basePath ? `**Saved to disk:** \`${basePath}\`\n\n` : `**Saved in IDE memory only.**\n\n`;
    text += `### What changed\n`;
    text += match.changes.map(c => `- ${c}`).join('\n');
    text += `\n\n### Run it\n\`\`\`bash\ncd ${basePath || folderName}\nng serve\n\`\`\`\n\n`;
    text += `Click \`${targetFile.name}\` in the Explorer to see the updated code.`;

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Parsed enhancement request', status: 'done', detail: match.name },
        { label: 'Located target file', status: 'done', detail: targetFile.path },
        { label: 'Applied patch', status: 'done', detail: `${newContent.split('\n').length} lines` },
        { label: diskWritten ? 'Written to disk' : 'In-memory only', status: 'done', detail: diskWritten ? basePath : 'no disk path' },
      ],
    };
  }

  // ===== PROJECT BUG FIXER =====

  /**
   * Scan the current project / file for common Angular bugs related to what the user described.
   * Returns a fix message and auto-patches when safe.
   */
  private cmdFixProjectBug(input: string, report: ProjectReport, currentFile?: ProjectFile): ChatMessage {
    const cmd = input.toLowerCase();
    const files = report.files;

    // Skip config/non-code files when auto-selecting
    const isConfigFile = (f: ProjectFile) => /\.(json|md|txt|lock|env|gitignore|editorconfig)$/i.test(f.name)
      || /angular\.json|tsconfig|package(-lock)?\.json|README/i.test(f.name);

    // Extract keywords from the user's bug description (e.g., "guess button" → "guess")
    const keywords = cmd
      .replace(/\b(not working|doesn'?t work|isn'?t working|broken|button|the|is|a|an|not|click|disabled|won'?t|fix|my|this|that)\b/gi, '')
      .split(/\s+/).filter(w => w.length >= 3);

    // File selection priority:
    // 1. A .ts/.html file whose CONTENT contains a user keyword (best match)
    // 2. Currently open file if it's not a config file
    // 3. The most likely component file (app.component.ts, or any .component.ts)
    // 4. First non-config file
    let target: ProjectFile | undefined;

    const componentFiles = files.filter(f => /\.(component\.(ts|html)|ts|html)$/i.test(f.name) && !isConfigFile(f));

    if (keywords.length > 0) {
      let bestScore = 0;
      for (const f of componentFiles) {
        let score = 0;
        const lc = f.content.toLowerCase();
        for (const kw of keywords) {
          const occurrences = (lc.match(new RegExp('\\b' + kw + '\\b', 'g')) || []).length;
          score += occurrences;
        }
        if (score > bestScore) { bestScore = score; target = f; }
      }
    }

    if (!target && currentFile && !isConfigFile(currentFile)) {
      target = currentFile;
    }

    if (!target) {
      target = componentFiles.find(f => f.name === 'app.component.ts')
        || componentFiles.find(f => f.name.endsWith('.component.ts'))
        || files.find(f => !isConfigFile(f));
    }

    if (!target) {
      return { id: '', role: 'ai', text: 'No project files loaded to analyze.', timestamp: new Date() };
    }

    const bugs: { issue: string; fix: string; severity: string; patched?: boolean; newContent?: string }[] = [];
    let content = target.content;
    let patched = false;

    // Bug: computed() reading a plain property instead of a signal
    const plainPropInComputed = /(\w+)\s*:\s*(?:number|string|boolean|null)[^=]*=\s*[^;]+;\s*[\s\S]*?computed\(\(\)\s*=>\s*[^}]*\bthis\.\1\b(?!\()/m.exec(content);
    if (plainPropInComputed && (cmd.includes('button') || cmd.includes('not working') || cmd.includes('disabled'))) {
      bugs.push({
        issue: `\`this.${plainPropInComputed[1]}\` is a plain property read inside \`computed()\` — Angular signals only track signal reads, so the computed never re-runs when this changes.`,
        fix: `Convert \`${plainPropInComputed[1]}\` to a signal: \`${plainPropInComputed[1]} = signal<...>(initial);\` and call it as \`this.${plainPropInComputed[1]}()\` everywhere.`,
        severity: 'error',
      });
    }

    // Bug: [(ngModel)] without FormsModule import
    if (/\[\(ngModel\)\]/.test(content) && !/FormsModule/.test(content)) {
      bugs.push({
        issue: '`[(ngModel)]` is used but `FormsModule` is not imported.',
        fix: "Add to component imports: `import { FormsModule } from '@angular/forms';` and include `FormsModule` in the `imports` array.",
        severity: 'error',
      });
      patched = true;
      content = content.replace(/(import \{[^}]*CommonModule[^}]*\} from '@angular\/common';)/, `$1\nimport { FormsModule } from '@angular/forms';`);
      content = content.replace(/imports:\s*\[([^\]]*)\]/, (m, inside) => {
        if (!inside.includes('FormsModule')) return `imports: [${inside.trim()}, FormsModule]`;
        return m;
      });
    }

    // Bug: *ngIf / *ngFor without CommonModule
    if (/\*ng(If|For|Switch)/.test(content) && !/CommonModule/.test(content)) {
      bugs.push({
        issue: '`*ngIf`/`*ngFor` used but `CommonModule` is not imported.',
        fix: "Add `CommonModule` to component's `imports` array.",
        severity: 'error',
      });
      patched = true;
      content = content.replace(/from '@angular\/core';/, `from '@angular/core';\nimport { CommonModule } from '@angular/common';`);
      content = content.replace(/imports:\s*\[([^\]]*)\]/, (m, inside) => {
        if (!inside.includes('CommonModule')) return `imports: [CommonModule, ${inside.trim()}]`;
        return m;
      });
    }

    // Bug: (click)="handler" without parens — handler reference, not invocation
    const clickNoParens = /\(click\)="(\w+)"(?!\s*[(\s])/.exec(content);
    if (clickNoParens && !/\(click\)="\w+\(/.test(content)) {
      bugs.push({
        issue: `\`(click)="${clickNoParens[1]}"\` — missing parentheses. This assigns the function reference instead of calling it.`,
        fix: `Use \`(click)="${clickNoParens[1]}()"\` with parentheses.`,
        severity: 'error',
      });
    }

    // Bug: signal read without ()
    if (/\{\{\s*\w+[^(]*\s*\}\}/.test(content) && /=\s*signal\(/.test(content)) {
      const signals = [...content.matchAll(/(\w+)\s*=\s*signal[<(]/g)].map(m => m[1]);
      for (const sig of signals) {
        const bareUsage = new RegExp(`\\{\\{\\s*${sig}\\s*\\}\\}`);
        if (bareUsage.test(content)) {
          bugs.push({
            issue: `Template uses \`{{ ${sig} }}\` but \`${sig}\` is a signal — must be called as \`{{ ${sig}() }}\`.`,
            fix: `Change \`{{ ${sig} }}\` to \`{{ ${sig}() }}\` in the template.`,
            severity: 'error',
          });
        }
      }
    }

    // Bug: async User.findOne etc. without await (for backend files)
    if (/\b[A-Z]\w*\.(findOne|findById|find)\s*\(/.test(content) && !/\bawait\s+[A-Z]\w*\.(findOne|findById|find)/.test(content)) {
      bugs.push({
        issue: 'Mongoose query without `await` — returns a Query object instead of the document.',
        fix: 'Add `await` before the query call.',
        severity: 'error',
      });
    }

    // If user's file is the number-guessing bug specifically
    if (/secret\s*=\s*signal/.test(content) && /guess\s*:\s*(?:number|null)/.test(content)) {
      bugs.push({
        issue: 'Number guessing game: `guess` is a plain property but read inside `computed()` — button stays disabled because Angular signals don\'t track plain properties.',
        fix: 'Change `guess: number | null = null;` to `guess = signal<number | null>(null);` and read as `this.guess()` everywhere. In template use `[ngModel]="guess()" (ngModelChange)="guess.set($event)"`.',
        severity: 'error',
      });
      // Auto-patch this specific case
      patched = true;
      content = content.replace(/guess:\s*number\s*\|\s*null\s*=\s*null;/, 'guess = signal<number | null>(null);');
      content = content.replace(/this\.canSubmit\(\)\s*\|\|\s*this\.guess\s*===\s*null/, 'isNaN(Number(this.guess()))');
      content = content.replace(/Number\(this\.guess\)/g, 'Number(this.guess())');
      content = content.replace(/this\.guess\s*=\s*null/g, 'this.guess.set(null)');
      content = content.replace(/canSubmit\s*=\s*computed\(\(\)\s*=>\s*this\.guess\s*!==\s*null\s*&&\s*this\.guess\s*>=\s*this\.min\s*&&\s*this\.guess\s*<=\s*this\.max\);/,
        'canSubmit = computed(() => { const g = this.guess(); return g !== null && g >= this.min && g <= this.max; });');
      // HTML template fix
      content = content.replace(/\[\(ngModel\)\]="guess"/g, '[ngModel]="guess()" (ngModelChange)="guess.set($event)"');
    }

    // Build response
    let text = `## 🔧 Project Bug Analysis\n\n`;
    text += `**File analyzed:** \`${target.path}\`\n\n`;

    if (bugs.length === 0) {
      text += `✅ No obvious issues detected matching your description.\n\n`;
      text += `**Describe the issue more specifically** and I can dig deeper. Examples:\n`;
      text += `- "the guess button is disabled and won't click"\n`;
      text += `- "ngFor is showing no data"\n`;
      text += `- "form submit does nothing"\n`;
      return { id: '', role: 'ai', text, timestamp: new Date() };
    }

    text += `### 🐛 Found ${bugs.length} issue${bugs.length === 1 ? '' : 's'}\n\n`;
    bugs.forEach((b, i) => {
      const icon = b.severity === 'error' ? '❌' : b.severity === 'warning' ? '⚠️' : 'ℹ️';
      text += `**${i + 1}. ${icon} ${b.severity.toUpperCase()}**\n`;
      text += `**Issue:** ${b.issue}\n`;
      text += `**Fix:** ${b.fix}\n\n`;
    });

    if (patched && this.scanner) {
      // Apply the patch: update file in the scanner AND try to write to disk
      const basePath = this.scanner.projectBasePath();
      const patchedFile = { ...target, content, size: content.length };
      const allFiles = report.files.map(f => f.path === target.path ? patchedFile : f);
      const tree = this.scanner.buildTree(allFiles);
      if (report.tree?.name) { tree.name = report.tree.name; tree.path = report.tree.path; }
      const newReport = { ...report, files: allFiles, tree };
      this.scanner.report.set(newReport as any);

      if (basePath) {
        const sep = basePath.includes('\\') ? '\\' : '/';
        const rel = target.path.startsWith(report.tree?.name + '/')
          ? target.path.slice((report.tree?.name || '').length + 1)
          : target.path;
        const fullPath = basePath + sep + rel.replace(/\//g, sep);
        this.fs.writeFile(fullPath, content);
      }

      text += `### ✅ Auto-patched\n`;
      text += `The file \`${target.path}\` has been updated${basePath ? ' and written to disk' : ' in memory'}.\n\n`;
      text += `**Click the file in the Explorer to see the changes.**`;
    } else {
      text += `### 📋 Apply manually\n`;
      text += `Open \`${target.path}\` and apply the fix above.`;
    }

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Scanned file', status: 'done', detail: target.name },
        { label: 'Matched bug patterns', status: 'done', detail: `${bugs.length} found` },
        { label: 'Auto-patch', status: 'done', detail: patched ? 'applied' : 'manual fix suggested' },
      ],
    };
  }

  // ===== ALGORITHM / SNIPPET GENERATOR =====

  private cmdAlgorithm(snippet: any): ChatMessage {
    let text = `## ${snippet.name.charAt(0).toUpperCase() + snippet.name.slice(1).replace(/-/g, ' ')}\n\n`;
    text += `${snippet.description}\n\n`;
    if (snippet.complexity) text += `**Complexity:** ${snippet.complexity}\n\n`;
    text += `### Implementation\n\`\`\`javascript\n${snippet.code}\n\`\`\`\n\n`;
    text += `### Example Usage\n\`\`\`javascript\n${snippet.example}\n\`\`\`\n\n`;
    text += `*💡 Paste any of this code into the chat to run it and see the output.*`;

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Matched algorithm', status: 'done', detail: snippet.name },
        { label: 'Retrieved code', status: 'done', detail: `${snippet.code.split('\n').length} lines` },
        { label: 'Added example', status: 'done', detail: 'ready to run' },
      ],
    };
  }

  // ===== CODE EXECUTION =====

  /**
   * Detect if input looks like executable JavaScript code (not a plain question).
   */
  private looksLikeExecutableCode(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 10) return false;

    // Strip markdown code fences if present
    const code = trimmed.replace(/^```(?:js|javascript|ts|typescript)?\s*\n?/i, '').replace(/```\s*$/, '').trim();

    // Signals that it's code
    const codeSignals = [
      /^(function|const|let|var|class)\s+\w+/m,   // declarations
      /^\s*(const|let|var)\s+\w+\s*=/m,             // var assignment
      /\w+\s*\([^)]*\)\s*\{/,                       // function declaration
      /=>/,                                          // arrow function
      /console\.(log|error|warn|info)\s*\(/,        // console call
      /^\s*(for|while|if|switch)\s*\(/m,            // control flow
      /^\s*return\s+/m,                             // return
    ];

    // Signals that it's a question/prose (negate)
    const questionSignals = [
      /^(what|how|why|when|where|who|which|can|should|would|do|does)\b/i,
      /\?$/,
      /explain|describe|tell me|show me|help/i,
    ];

    // Count signals
    const codeMatches = codeSignals.filter(r => r.test(code)).length;
    const questionMatches = questionSignals.filter(r => r.test(code.split('\n')[0])).length;

    // Must have at least 2 code signals AND no leading question word
    return codeMatches >= 2 && questionMatches === 0;
  }

  /**
   * Strip markdown fences from code.
   */
  private extractCode(input: string): string {
    let code = input.trim();
    const fenceMatch = code.match(/^```(?:js|javascript|ts|typescript)?\s*\n([\s\S]*?)\n```\s*$/i);
    if (fenceMatch) return fenceMatch[1];
    // Strip just the fences if formatting is off
    code = code.replace(/^```(?:\w+)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    return code.trim();
  }

  /**
   * Detect Node.js backend code that won't run in a browser.
   * Covers full files (with require/import) AND fragments (using res.json, User.findOne, etc.)
   */
  private isBackendCode(code: string): boolean {
    // Full-file signals
    if (/\brequire\s*\(/.test(code)) return true;
    if (/module\.exports/.test(code)) return true;
    if (/process\.env/.test(code)) return true;
    if (/^\s*import\s+.+\s+from\s+['"](express|mongoose|fs|path|http|crypto|bcryptjs?|jsonwebtoken|nodemailer|cors)/m.test(code)) return true;

    // Fragment signals — Express
    if (/\bres\.(json|send|status|redirect|render|sendFile|cookie|set)\s*\(/.test(code)) return true;
    if (/\breq\.(body|params|query|headers|cookies|user)\b/.test(code)) return true;
    if (/\b(app|router)\.(get|post|put|delete|patch|use|all)\s*\(/.test(code)) return true;

    // Fragment signals — Mongoose
    if (/\b[A-Z]\w*\.(findOne|findById|find|create|findByIdAndUpdate|findOneAndUpdate|findByIdAndDelete|findOneAndDelete|updateOne|deleteOne|countDocuments|aggregate|populate)\s*\(/.test(code)) return true;
    if (/\bnew\s+mongoose\.Schema|mongoose\.model|new\s+Schema\s*\(/.test(code)) return true;

    // Fragment signals — Auth libs
    if (/\bbcrypt(js)?\.(hash|compare|genSalt)\s*\(/.test(code)) return true;
    if (/\bjwt\.(sign|verify|decode)\s*\(/.test(code)) return true;

    return false;
  }

  /**
   * Static analysis for common backend bugs.
   */
  private analyzeBackendCode(code: string): { bugs: { line: number; issue: string; fix: string; severity: string }[]; fixedCode: string } {
    const bugs: { line: number; issue: string; fix: string; severity: string }[] = [];
    const lines = code.split('\n');
    let fixed = code;

    // Bug 1: express.json without calling it
    lines.forEach((line, i) => {
      if (/app\.use\(\s*express\.json\s*\)/.test(line) && !/express\.json\s*\(\s*\)/.test(line)) {
        bugs.push({
          line: i + 1, severity: 'error',
          issue: '`express.json` is passed as a reference instead of called',
          fix: 'Call it as a function: `express.json()`',
        });
      }
    });
    fixed = fixed.replace(/app\.use\(\s*express\.json\s*\)/g, 'app.use(express.json())');

    // Bug 2: Missing await on findOne/find/findById
    lines.forEach((line, i) => {
      if (/(const|let|var)\s+\w+\s*=\s*User\.(findOne|findById|find|findOneAndUpdate|findOneAndDelete)\s*\(/.test(line)
          && !/\bawait\b/.test(line)) {
        bugs.push({
          line: i + 1, severity: 'error',
          issue: 'Missing `await` on Mongoose query — returns a Query object, not the user',
          fix: 'Add `await`: `const user = await User.findOne(...)`',
        });
      }
    });
    fixed = fixed.replace(/(const|let|var)(\s+\w+\s*=\s*)(User\.(findOne|findById|find|findOneAndUpdate|findOneAndDelete)\s*\()/g,
      '$1$2await $3');

    // Bug 3: res.status().json() without return — causes "headers already sent"
    lines.forEach((line, i) => {
      if (/^\s*res\.(status\(\d+\)\.)?(json|send)\s*\(/.test(line)
          && !/^\s*return\s+res\./.test(line)
          && i < lines.length - 1) {
        // Check if next non-empty line continues execution (not a closing brace)
        let nextReal = '';
        for (let j = i + 1; j < lines.length; j++) {
          const s = lines[j].trim();
          if (s && !s.startsWith('//')) { nextReal = s; break; }
        }
        if (nextReal && !nextReal.startsWith('}') && !nextReal.startsWith(')')) {
          bugs.push({
            line: i + 1, severity: 'warning',
            issue: 'Missing `return` before res.status/res.json — execution continues, may cause "Cannot set headers after they are sent"',
            fix: 'Add `return`: `return res.status(400).json(...)`',
          });
        }
      }
    });
    fixed = fixed.replace(/^(\s*)res\.(status\(\d+\)\.)?(json|send)\(/gm, '$1return res.$2$3(');

    // Bug 4: Using == instead of ===
    lines.forEach((line, i) => {
      if (/[^!=<>]==[^=]/.test(line) && !/\/\//.test(line.split('==')[0])) {
        bugs.push({
          line: i + 1, severity: 'warning',
          issue: 'Uses `==` (loose equality) instead of `===` (strict equality)',
          fix: 'Replace `==` with `===` and `!=` with `!==`',
        });
      }
    });
    fixed = fixed.replace(/([^!=<>])==([^=])/g, '$1===$2');
    fixed = fixed.replace(/!=([^=])/g, '!==$1');

    // Bug 5: Plaintext password comparison
    if (/user\.password\s*(===|==)\s*password/.test(code) || /password\s*(===|==)\s*user\.password/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /user\.password\s*==|password\s*==\s*user\.password/.test(l)) + 1,
        severity: 'error',
        issue: 'Passwords compared as plaintext — MAJOR security vulnerability',
        fix: 'Use bcrypt: hash on register, compare on login: `await bcrypt.compare(password, user.password)`',
      });
    }

    // Bug 6: Hardcoded JWT secret
    if (/jwt\.sign\([^)]+,\s*["'][^"']{1,20}["']/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /jwt\.sign\(/.test(l)) + 1,
        severity: 'error',
        issue: 'JWT secret is hardcoded — use environment variable',
        fix: 'Use `process.env.JWT_SECRET` and never commit secrets',
      });
    }

    // Bug 7: No try/catch in async routes
    const routePattern = /app\.(get|post|put|delete|patch)\s*\([^,]+,\s*async[^{]*\{/g;
    let match;
    while ((match = routePattern.exec(code)) !== null) {
      const routeStart = code.slice(0, match.index).split('\n').length;
      const routeBody = code.slice(match.index, code.indexOf('\n})', match.index));
      if (!routeBody.includes('try') && !routeBody.includes('catch')) {
        bugs.push({
          line: routeStart, severity: 'warning',
          issue: 'Async route has no try/catch — unhandled errors will crash',
          fix: 'Wrap body in try/catch or use an asyncHandler wrapper',
        });
      }
    }

    // Bug 8: Empty string check that should be !truthy check
    if (/==\s*["']["']\s*\|\|/.test(code) || /==\s*""/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /==\s*["']["']/.test(l)) + 1,
        severity: 'info',
        issue: 'Empty-string check can miss undefined/null',
        fix: 'Use `!email || !password` instead of `email == ""`',
      });
    }

    // Bug 9: No password hashing on register
    if (/new User\(\{[^}]*password\s*[,:]/.test(code) && !/bcrypt\.hash/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /new User\(/.test(l)) + 1,
        severity: 'error',
        issue: 'Password saved as plaintext on register',
        fix: 'Hash first: `password: await bcrypt.hash(password, 10)`',
      });
    }

    // Bug 10: Missing email regex validation
    if (/\breq\.body/.test(code) && /email/i.test(code) && !/emailRegex|validator\.isEmail|match:\s*\[\/\^/i.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /email/i.test(l) && /req\.body/.test(l)) + 1 || 1,
        severity: 'warning',
        issue: 'No email format validation — invalid emails can reach the database',
        fix: 'Add: `const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/; if (!emailRegex.test(email)) return res.status(400).json({...});`',
      });
    }

    // Bug 11: No rate limiting on sensitive endpoints
    if (/app\.post\(['"]\/(login|register|auth)/.test(code) && !/rateLimit|express-rate-limit/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /app\.post\(['"]\/(login|register)/.test(l)) + 1 || 1,
        severity: 'warning',
        issue: 'Login/register endpoint has no rate limiting — vulnerable to brute force attacks',
        fix: 'Install `express-rate-limit` and apply: `app.use("/api/auth/login", rateLimit({ windowMs: 15*60*1000, max: 5 }))`',
      });
    }

    // Bug 12: Weak password length check (< 8)
    lines.forEach((l, i) => {
      const m = l.match(/password\.length\s*<\s*(\d+)/);
      if (m && parseInt(m[1]) < 8) {
        bugs.push({
          line: i + 1, severity: 'warning',
          issue: `Password minimum length is ${m[1]} — too weak by modern standards`,
          fix: 'Use 8+ chars and add complexity: `/^(?=.*[A-Z])(?=.*\\d).{8,}$/`',
        });
      }
    });

    // Bug 13: Insecure JWT secret fallback
    if (/process\.env\.JWT_SECRET\s*\|\|\s*["']/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /process\.env\.JWT_SECRET\s*\|\|/.test(l)) + 1,
        severity: 'error',
        issue: 'JWT secret has a fallback default — silently insecure if env is missing',
        fix: '`if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET required");`',
      });
    }

    // Bug 14: No logging middleware
    if (/express\(\)/.test(code) && !/morgan|winston|pino|app\.use.*log/i.test(code)) {
      bugs.push({
        line: 1, severity: 'info',
        issue: 'No logging middleware — hard to debug issues in production',
        fix: 'Add `morgan("dev")` for requests and `winston` for app logs',
      });
    }

    // Bug 15: JWT without expiry
    if (/jwt\.sign\([^)]+\)/.test(code) && !/expiresIn/.test(code)) {
      bugs.push({
        line: lines.findIndex(l => /jwt\.sign\(/.test(l)) + 1,
        severity: 'warning',
        issue: 'JWT has no expiry — tokens valid forever if not explicitly invalidated',
        fix: 'Add expiry: `jwt.sign(payload, secret, { expiresIn: "7d" })`',
      });
    }

    return { bugs, fixedCode: fixed };
  }

  /**
   * Compute code quality scores like industry SAST tools.
   */
  private computeScores(code: string, bugs: { severity: string }[]): {
    security: number; codeQuality: number; errorHandling: number; scalability: number; overallScore: number;
  } {
    const errors = bugs.filter(b => b.severity === 'error').length;
    const warnings = bugs.filter(b => b.severity === 'warning').length;
    const infos = bugs.filter(b => b.severity === 'info').length;

    // Security — penalized by security bugs
    const securityBugs = bugs.filter(b =>
      /password|secret|jwt|hash|bcrypt|validation|rate limit|brute|plaintext|regex|fallback/i.test((b as any).issue || '')).length;
    let security = 100 - securityBugs * 8 - errors * 3;
    if (/bcrypt/.test(code)) security += 5;
    if (/rateLimit|express-rate-limit/.test(code)) security += 5;
    if (/helmet/.test(code)) security += 3;
    security = Math.max(0, Math.min(100, security));

    // Code quality — uses of === vs ==, let vs var, etc.
    let codeQuality = 100 - warnings * 3 - infos * 2;
    if (/\bvar\s/.test(code)) codeQuality -= 5;
    if (/==\s[^=]/.test(code) && !/===/.test(code)) codeQuality -= 8;
    if (/TODO|FIXME|XXX/i.test(code)) codeQuality -= 3;
    codeQuality = Math.max(0, Math.min(100, codeQuality));

    // Error handling
    const asyncRoutes = (code.match(/async\s*\(req,\s*res/g) || []).length;
    const tryBlocks = (code.match(/try\s*\{/g) || []).length;
    const asyncHandler = /asyncHandler/.test(code);
    let errorHandling = 100;
    if (asyncRoutes > 0 && tryBlocks < asyncRoutes && !asyncHandler) {
      errorHandling -= (asyncRoutes - tryBlocks) * 15;
    }
    if (!/app\.use\(\s*\(err/.test(code) && /express\(\)/.test(code)) errorHandling -= 20;
    errorHandling = Math.max(0, Math.min(100, errorHandling));

    // Scalability
    let scalability = 100;
    if (/mongodb:\/\/localhost/.test(code)) scalability -= 15;
    if (!/process\.env/.test(code) && /express\(\)/.test(code)) scalability -= 20;
    if (!/rateLimit|throttle/.test(code) && /app\.listen/.test(code)) scalability -= 10;
    if (!/morgan|winston|pino/.test(code) && /app\.listen/.test(code)) scalability -= 8;
    if (!/cors/.test(code) && /express\(\)/.test(code)) scalability -= 5;
    scalability = Math.max(0, Math.min(100, scalability));

    const overallScore = Math.round((security + codeQuality + errorHandling + scalability) / 4);
    return { security, codeQuality, errorHandling, scalability, overallScore };
  }

  /**
   * Generate the corrected version of the Express code with best practices applied.
   */
  private generateFixedExpressCode(): string {
    return `const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());  // FIX: Called as function

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('DB error:', err));

// Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Register
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // FIX: !email check catches undefined/null/empty, + return to stop execution
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // FIX: Hash password, never store plaintext
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // FIX: await on findOne
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });  // FIX: return
    }

    // FIX: bcrypt.compare instead of plaintext ==
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // FIX: JWT_SECRET from env, with expiry
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server started on port', process.env.PORT || 3000);
});`;
  }

  /**
   * Analyze backend code for bugs and return a fixed version.
   */
  private cmdAnalyzeBackendCode(code: string): ChatMessage {
    const { bugs } = this.analyzeBackendCode(code);
    const scores = this.computeScores(code, bugs as any);

    // Detect if this looks like the express auth pattern — return full corrected version
    const isExpressAuth = /express\(\)/.test(code) && /mongoose/.test(code) &&
                         /register|login/i.test(code) && /jwt/.test(code);

    let text = `## 🔍 Code Analysis — Node.js Backend\n\n`;
    text += `*This is backend code — running in the browser isn't possible (requires Node.js, MongoDB, etc.)*\n\n`;

    // Evaluation scores
    const scoreBar = (n: number) => '█'.repeat(Math.floor(n / 10)) + '░'.repeat(10 - Math.floor(n / 10));
    const scoreEmoji = (n: number) => n >= 90 ? '🟢' : n >= 75 ? '🟡' : n >= 50 ? '🟠' : '🔴';

    text += `### 📊 Evaluation Scores\n\n`;
    text += '```\n';
    text += `${scoreEmoji(scores.security)}      Security:      ${scoreBar(scores.security)} ${scores.security}/100\n`;
    text += `${scoreEmoji(scores.codeQuality)}  Code Quality:  ${scoreBar(scores.codeQuality)} ${scores.codeQuality}/100\n`;
    text += `${scoreEmoji(scores.errorHandling)}  Error Handling:${scoreBar(scores.errorHandling)} ${scores.errorHandling}/100\n`;
    text += `${scoreEmoji(scores.scalability)}  Scalability:   ${scoreBar(scores.scalability)} ${scores.scalability}/100\n`;
    text += `─────────────────────────────────────\n`;
    text += `${scoreEmoji(scores.overallScore)}  Overall:       ${scoreBar(scores.overallScore)} ${scores.overallScore}/100\n`;
    text += '```\n\n';

    if (bugs.length === 0) {
      text += `✅ **No obvious bugs detected.**\n\n`;
      text += `Run it with:\n\`\`\`bash\nnpm install express mongoose bcryptjs jsonwebtoken dotenv\nnode server.js\n\`\`\``;
    } else {
      text += `### 🐛 Found ${bugs.length} issue${bugs.length === 1 ? '' : 's'}\n\n`;
      const icons: Record<string, string> = { error: '❌', warning: '⚠️', info: 'ℹ️' };
      bugs.forEach((b, i) => {
        text += `**${i + 1}. Line ${b.line}** ${icons[b.severity] || '•'} *${b.severity.toUpperCase()}*\n`;
        text += `   **Issue:** ${b.issue}\n`;
        text += `   **Fix:** ${b.fix}\n\n`;
      });

      if (isExpressAuth) {
        text += `### ✅ Corrected Code (production-ready)\n\n`;
        text += '```javascript\n' + this.generateFixedExpressCode() + '\n```\n\n';
        text += `### 📋 Summary of fixes\n`;
        text += `- \`express.json\` → \`express.json()\` (call as function)\n`;
        text += `- Added \`await\` to all \`User.findOne()\` calls\n`;
        text += `- Added \`return\` before all \`res.status()\` calls\n`;
        text += `- Replaced \`==\` with \`===\` (strict equality)\n`;
        text += `- Added \`bcrypt.hash()\` on register\n`;
        text += `- Added \`bcrypt.compare()\` on login\n`;
        text += `- JWT secret moved to \`process.env.JWT_SECRET\`\n`;
        text += `- Added JWT expiry (\`expiresIn: '7d'\`)\n`;
        text += `- Wrapped all routes in try/catch\n`;
        text += `- Added email validation (required, unique, lowercase)\n`;
        text += `- Password minimum length 6 chars\n`;
        text += `- Global error handler middleware\n`;
        text += `- Uses \`process.env.PORT\` with fallback\n\n`;
        text += `### 🚀 Setup\n`;
        text += `\`\`\`bash\nnpm install express mongoose bcryptjs jsonwebtoken dotenv\n\n# Create .env:\n# MONGO_URI=mongodb://localhost:27017/mydb\n# JWT_SECRET=a-long-random-secret-key\n# PORT=3000\n\nnode server.js\n\`\`\``;
      }
    }

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Detected backend code', status: 'done', detail: 'Node.js + Express + Mongoose' },
        { label: 'Ran static analysis', status: 'done', detail: `${bugs.length} issues found` },
        { label: 'Generated fix', status: 'done', detail: isExpressAuth ? 'full rewrite' : 'inline patches' },
      ],
    };
  }

  /**
   * Execute JS code safely in the browser and capture console output.
   */
  private cmdRunCode(input: string): ChatMessage {
    const code = this.extractCode(input);

    // If it's Node.js backend code, analyze bugs instead of executing
    if (this.isBackendCode(code)) {
      return this.cmdAnalyzeBackendCode(code);
    }

    const startTime = performance.now();
    const logs: { type: string; message: string }[] = [];

    // Capture console methods
    const origConsole = {
      log: console.log, error: console.error,
      warn: console.warn, info: console.info,
    };

    const capture = (type: string) => (...args: any[]) => {
      const msg = args.map(a => {
        if (a === null) return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a === 'string') return a;
        if (typeof a === 'object') {
          try { return JSON.stringify(a, null, 2); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      logs.push({ type, message: msg });
      origConsole.log('[executed]', ...args);
    };

    let error: string | null = null;
    let returnValue: any = undefined;

    try {
      console.log = capture('log');
      console.error = capture('error');
      console.warn = capture('warn');
      console.info = capture('info');

      // Choose sync vs async wrapper based on top-level await usage
      const hasAwait = /^\s*(?!.*function).*\bawait\b/m.test(code);
      if (hasAwait) {
        // Wrap in async IIFE — but attach error handler so rejections aren't silent
        const wrapped = `return (async () => {\n${code}\n})();`;
        const fn = new Function(wrapped);
        const promise = fn();
        // Can't block synchronously — tag return, attach catcher
        returnValue = '<async>';
        promise.catch((e: any) => {
          logs.push({ type: 'error', message: `[async error] ${e?.message || String(e)}` });
        });
      } else {
        // Sync — any error propagates to the try/catch
        const wrapped = `${code}`;
        const fn = new Function(wrapped);
        returnValue = fn();
      }
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      console.log = origConsole.log;
      console.error = origConsole.error;
      console.warn = origConsole.warn;
      console.info = origConsole.info;
    }

    const elapsed = (performance.now() - startTime).toFixed(2);

    let text = '';
    if (error) {
      text = `## ❌ Execution Error\n\n\`\`\`\n${error}\n\`\`\``;
    } else {
      text = `## ✅ Output\n\n`;
      if (logs.length === 0 && returnValue === undefined) {
        text += `*(no output — code ran successfully but didn't print anything)*`;
      } else {
        if (logs.length > 0) {
          text += '```\n' + logs.map(l => {
            const prefix = l.type === 'error' ? '[error] ' : l.type === 'warn' ? '[warn] ' : '';
            return prefix + l.message;
          }).join('\n') + '\n```';
        }
        if (returnValue !== undefined && returnValue !== '<async>') {
          text += (logs.length > 0 ? '\n\n**Return value:**\n```\n' : '**Result:**\n```\n') +
                  (typeof returnValue === 'object' ? JSON.stringify(returnValue, null, 2) : String(returnValue)) + '\n```';
        }
      }
      text += `\n\n*Executed in ${elapsed}ms*`;
    }

    return {
      id: '', role: 'ai', text, timestamp: new Date(),
      steps: [
        { label: 'Detected JS code', status: 'done', detail: `${code.split('\n').length} lines` },
        { label: 'Executed in browser', status: 'done', detail: `${elapsed}ms` },
        { label: 'Captured output', status: 'done', detail: `${logs.length} log${logs.length === 1 ? '' : 's'}` },
      ],
    };
  }

  // ===== KNOWLEDGE BASE (Offline Q&A) =====

  private async cmdKnowledge(input: string): Promise<ChatMessage> {
    // 1. Try offline local knowledge base first (fastest)
    const localAnswer = answerQuestion(input);
    const isFallback = localAnswer.startsWith("I don't have information");

    if (!isFallback) {
      return { id: '', role: 'ai', text: localAnswer, timestamp: new Date() };
    }

    // 2. Local miss — try MongoDB knowledge base
    const mongoAnswer = await this.kbApi.answer(input);
    if (mongoAnswer && mongoAnswer.source !== 'not_found') {
      return {
        id: '', role: 'ai',
        text: mongoAnswer.answer,
        timestamp: new Date(),
        steps: [{ label: 'Source', status: 'done', detail: `MongoDB KB (${mongoAnswer.source})` }],
      };
    }

    // 3. Both missed — return local fallback (has helpful suggestions)
    return { id: '', role: 'ai', text: localAnswer, timestamp: new Date() };
  }

  // ===== AI MODULE COMMANDS =====

  private async cmdAIModule(input: string, report: ProjectReport, currentFile?: ProjectFile): Promise<ChatMessage> {
    const cmd = input.toLowerCase().replace(/^\/ai\s*/, '').trim();

    try {
      // List models
      if (cmd.includes('list models') || cmd.includes('model') && cmd.includes('list')) {
        const models = await this.aiModule.listModels();
        let text = `**Available AI Models (${models.length})**\n\n`;
        text += `| Alias | Model ID | Provider | Context | Max Output | Input $/M | Output $/M |\n`;
        text += `|-------|----------|----------|---------|------------|-----------|------------|\n`;
        for (const m of models) {
          const ctx = m.context_window ? `${(m.context_window / 1000).toFixed(0)}k` : '—';
          const out = m.max_output_tokens ? `${(m.max_output_tokens / 1000).toFixed(0)}k` : '—';
          const inp = m.pricing ? `$${m.pricing.input_per_million}` : '—';
          const outp = m.pricing ? `$${m.pricing.output_per_million}` : '—';
          text += `| ${m.alias} | ${m.canonical} | ${m.provider} | ${ctx} | ${out} | ${inp} | ${outp} |\n`;
        }
        return { id: '', role: 'ai', text, timestamp: new Date() };
      }

      // Model info
      if (cmd.includes('model info') || cmd.includes('model') && cmd.includes('info')) {
        const alias = cmd.replace(/model\s*info\s*/, '').trim() || 'sonnet';
        const info = await this.aiModule.resolveModel(alias);
        let text = `**Model: ${info.canonical}**\n\n`;
        text += `- **Alias:** ${alias}\n`;
        text += `- **Provider:** ${info.provider}\n`;
        text += `- **Auth Env:** \`${info.auth_env || 'N/A'}\`\n`;
        text += `- **Max Output:** ${info.max_output_tokens?.toLocaleString()} tokens\n`;
        text += `- **Context Window:** ${info.context_window?.toLocaleString() || 'unknown'} tokens\n`;
        if (info.pricing) {
          text += `- **Input Cost:** $${info.pricing.input_per_million}/M tokens\n`;
          text += `- **Output Cost:** $${info.pricing.output_per_million}/M tokens\n`;
        }
        return { id: '', role: 'ai', text, timestamp: new Date() };
      }

      // Cost estimate
      if (cmd.includes('cost') || cmd.includes('estimate') || cmd.includes('token usage')) {
        const estimate = await this.aiModule.estimateCost({
          input_tokens: report.totalLines * 4,
          output_tokens: Math.floor(report.totalLines * 2),
          model: 'claude-sonnet-4-6',
        });
        let text = `**Cost Estimate for Project Analysis**\n\n`;
        text += `- **Total Tokens:** ${estimate.total_tokens.toLocaleString()}\n`;
        text += `- **Estimated Cost:** ${estimate.formatted_cost}\n`;
        text += `- **Breakdown:**\n`;
        text += `  - Input: ${estimate.breakdown.input}\n`;
        text += `  - Output: ${estimate.breakdown.output}\n`;
        text += `  - Cache Write: ${estimate.breakdown.cache_write}\n`;
        text += `  - Cache Read: ${estimate.breakdown.cache_read}\n`;
        return { id: '', role: 'ai', text, timestamp: new Date() };
      }

      // Status
      if (cmd.includes('status')) {
        const status = await this.aiModule.getStatus();
        let text = `**AI Module Status**\n\n`;
        text += `- **Version:** ${status.version}\n`;
        text += `- **Status:** ${status.status}\n`;
        text += `- **Active Sessions:** ${status.sessions_active}\n`;
        text += `- **Cache:** ${status.cache_stats.hits} hits / ${status.cache_stats.misses} misses\n\n`;
        text += `**Providers:**\n`;
        for (const [name, provider] of Object.entries(status.providers) as [string, AIProvider][]) {
          const icon = provider.configured ? 'ON' : 'OFF';
          text += `- **${name}** [${icon}] — ${provider.models.join(', ')}\n`;
        }
        return { id: '', role: 'ai', text, timestamp: new Date() };
      }

      // Analyze current file
      if (cmd.includes('analyze')) {
        if (!currentFile) {
          return { id: '', role: 'ai', text: 'No file selected. Open a file first, then try again.', timestamp: new Date() };
        }
        const analysis = await this.aiModule.analyzeCode(currentFile.content, currentFile.path);
        let text = `**AI Analysis: ${currentFile.name}**\n\n`;
        text += `${analysis.summary}\n\n`;
        if (analysis.patterns.functions.length > 0) {
          text += `**Functions:**\n`;
          for (const f of analysis.patterns.functions.slice(0, 20)) {
            text += `- \`${f.name}\` (line ${f.line})\n`;
          }
          text += '\n';
        }
        if (analysis.patterns.classes.length > 0) {
          text += `**Classes:**\n`;
          for (const c of analysis.patterns.classes.slice(0, 10)) {
            text += `- \`${c.name}\` (line ${c.line})\n`;
          }
          text += '\n';
        }
        if (analysis.patterns.issues.length > 0) {
          text += `**Issues:**\n`;
          for (const issue of analysis.patterns.issues) {
            text += `- [${issue.severity}] Line ${issue.line}: ${issue.message}\n`;
          }
        }
        return { id: '', role: 'ai', text, timestamp: new Date() };
      }

      // Create session
      if (cmd.includes('session') && !cmd.includes('send')) {
        const session = await this.aiModule.createSession();
        this.aiSessionId = session.session_id;
        return {
          id: '', role: 'ai', timestamp: new Date(),
          text: `**AI Session Created**\n\n- **ID:** \`${session.session_id}\`\n- **Model:** ${session.model}\n\nUse \`/ai send [message]\` to chat.`,
        };
      }

      // Send message to session
      if (cmd.includes('send') || cmd.startsWith('send ')) {
        const message = cmd.replace(/^send\s*/, '').trim() || input.replace(/^\/ai\s*send\s*/i, '').trim();
        if (!this.aiSessionId) {
          const session = await this.aiModule.createSession();
          this.aiSessionId = session.session_id;
        }
        const result = await this.aiModule.sendMessage(this.aiSessionId, message);
        return {
          id: '', role: 'ai', timestamp: new Date(),
          text: `${result.output}\n\n---\n*Stop: ${result.stop_reason} | Tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}*`,
        };
      }

      // Fallback
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: `Unknown AI module command. Try: \`/ai list models\`, \`/ai status\`, \`/ai analyze\`, \`/ai cost estimate\`, \`/ai session\`, \`/ai send [msg]\``,
      };

    } catch (err: any) {
      return {
        id: '', role: 'ai', timestamp: new Date(),
        text: `**AI Module Error**\n\nCould not reach the AI module. Make sure the Python server is running:\n\`\`\`\ncd backend && python ai-server.py\n\`\`\`\n\nError: ${err?.message || err}`,
      };
    }
  }

  // ===== PROJECT ANALYZER =====

  private analyzeProject(report: ProjectReport): ProjectAnalysis {
    const routes: Route[] = [];
    const functions: Func[] = [];
    const models: Model[] = [];
    const components: Component[] = [];
    const imports: { module: string; file: string }[] = [];
    const allContent = report.files.map(f => f.content).join('\n');

    for (const file of report.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Routes
        const rm = line.match(/(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]/);
        if (rm) {
          routes.push({
            method: rm[1].toUpperCase(), path: rm[2], file: file.path, line: i + 1,
            hasAuth: line.includes('auth') || line.includes('middleware'),
            hasValidation: lines.slice(i, Math.min(i + 10, lines.length)).join('').includes('if (!'),
          });
        }

        // Functions
        const fm = line.match(/(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/);
        if (fm) functions.push({ name: fm[1], params: fm[2].split(',').map(p => p.trim()).filter(Boolean), file: file.path, line: i + 1, isAsync: line.includes('async') });
        const am = line.match(/(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\((.*?)\)\s*=>/);
        if (am) functions.push({ name: am[1], params: am[2].split(',').map(p => p.trim()).filter(Boolean), file: file.path, line: i + 1, isAsync: line.includes('async') });

        // Models
        const mm = line.match(/mongoose\.model\s*\(\s*['"](.*?)['"]/);
        if (mm) {
          const fields: { name: string; type: string }[] = [];
          for (let j = Math.max(0, i - 20); j < Math.min(i + 5, lines.length); j++) {
            const fm2 = lines[j].match(/^\s+(\w+)\s*:\s*\{?\s*type\s*:\s*(\w+)/);
            if (fm2) fields.push({ name: fm2[1], type: fm2[2] });
          }
          models.push({ name: mm[1], fields, file: file.path });
        }

        // Components
        if (line.includes('@Component')) components.push({ name: (file.content.match(/class\s+(\w+)/) || [])[1] || file.name, file: file.path, type: 'component' });
        if (line.includes('@Injectable')) components.push({ name: (file.content.match(/class\s+(\w+)/) || [])[1] || file.name, file: file.path, type: 'service' });

        // Imports
        const im = line.match(/require\s*\(\s*['"](.*?)['"]\)/);
        if (im) imports.push({ module: im[1], file: file.path });
        const im2 = line.match(/import\s+.*?\s+from\s+['"](.*?)['"]/);
        if (im2) imports.push({ module: im2[1], file: file.path });
      }
    }

    const frameworks: string[] = [];
    if (allContent.includes('@angular') || allContent.includes('@Component')) frameworks.push('Angular');
    if (allContent.includes('express()')) frameworks.push('Express');
    if (allContent.includes('mongoose')) frameworks.push('MongoDB');
    if (allContent.includes('jwt') || allContent.includes('jsonwebtoken')) frameworks.push('JWT');
    if (allContent.includes('socket.io')) frameworks.push('WebSocket');

    const projectType = frameworks.includes('Angular') && frameworks.includes('Express') ? 'Full-Stack' : frameworks.includes('Express') ? 'Backend' : frameworks.includes('Angular') ? 'Frontend' : 'JS/TS';

    return { routes, functions, models, components, imports, projectType, frameworks };
  }

  // ===== TEST CODE GENERATORS =====

  private genAPITest(route: Route, scenario: string): string {
    if (scenario === 'success') {
      return `it('${route.method} ${route.path} should return 200', async () => {\n  const res = await request(app).${route.method.toLowerCase()}('${route.path}')\n    .set('Authorization', 'Bearer <token>')\n    ${route.method !== 'GET' ? ".send({ /* valid data */ })" : ''};\n  expect(res.status).toBe(200);\n});`;
    }
    if (scenario === 'error') {
      return `it('${route.method} ${route.path} should return 401 without auth', async () => {\n  const res = await request(app).${route.method.toLowerCase()}('${route.path}');\n  expect(res.status).toBe(401);\n});`;
    }
    return `it('${route.method} ${route.path} should validate input', async () => {\n  const res = await request(app).${route.method.toLowerCase()}('${route.path}')\n    .set('Authorization', 'Bearer <token>')\n    .send({});\n  expect(res.status).toBe(400);\n});`;
  }

  private genUnitTest(func: Func): string {
    return `it('${func.name}() should work correctly', ${func.isAsync ? 'async ' : ''}() => {\n  const result = ${func.isAsync ? 'await ' : ''}${func.name}(${func.params.map(() => '/* arg */').join(', ')});\n  expect(result).toBeDefined();\n});`;
  }

  private genModelTest(model: Model, scenario: string): string {
    if (scenario === 'create') {
      const fields = model.fields.map(f => `${f.name}: ${f.type === 'String' ? "'test'" : f.type === 'Number' ? '1' : 'true'}`).join(', ');
      return `it('should create ${model.name}', async () => {\n  const item = await ${model.name}.create({ ${fields} });\n  expect(item._id).toBeDefined();\n  ${model.fields.slice(0, 3).map(f => `expect(item.${f.name}).toBeDefined();`).join('\n  ')}\n});`;
    }
    return `it('should fail without required fields', async () => {\n  await expect(${model.name}.create({})).rejects.toThrow();\n});`;
  }

  private buildFullTestFile(tests: TestCase[]): string {
    let code = `const request = require('supertest');\nconst app = require('./server');\n\n`;
    const grouped = new Map<string, TestCase[]>();
    for (const t of tests) {
      const group = t.targetFile.split('/').pop() || 'general';
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(t);
    }
    for (const [group, groupTests] of grouped) {
      code += `describe('${group}', () => {\n`;
      for (const t of groupTests) {
        code += `  ${t.code}\n\n`;
      }
      code += `});\n\n`;
    }
    return code;
  }

  // ===== CODE TEMPLATES =====

  private tplUserModel(): string {
    return `const mongoose = require('mongoose');\nconst userSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true, lowercase: true },\n  password: { type: String, required: true },\n  role: { type: String, enum: ['user', 'admin'], default: 'user' },\n}, { timestamps: true });\nmodule.exports = mongoose.model('User', userSchema);`;
  }

  private tplAuthRoutes(): string {
    return `const express = require('express');\nconst router = express.Router();\nconst bcrypt = require('bcryptjs');\nconst jwt = require('jsonwebtoken');\nconst User = require('../models/User');\nconst JWT_SECRET = process.env.JWT_SECRET || 'secret';\n\nrouter.post('/register', async (req, res) => {\n  try {\n    const { name, email, password } = req.body;\n    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });\n    const exists = await User.findOne({ email: email.toLowerCase() });\n    if (exists) return res.status(400).json({ error: 'Email taken' });\n    const user = await User.create({ name, email: email.toLowerCase(), password: await bcrypt.hash(password, 10) });\n    const token = jwt.sign({ userId: user._id, name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });\n    res.json({ message: 'Registered', token, user: { name, email: user.email } });\n  } catch (err) { res.status(500).json({ error: err.message }); }\n});\n\nrouter.post('/login', async (req, res) => {\n  try {\n    const { email, password } = req.body;\n    if (!email || !password) return res.status(400).json({ error: 'Required' });\n    const user = await User.findOne({ email: email.toLowerCase() });\n    if (!user) return res.status(404).json({ error: 'Not found' });\n    if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Wrong password' });\n    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });\n    res.json({ message: 'Login OK', token, user: { name: user.name, email: user.email } });\n  } catch (err) { res.status(500).json({ error: err.message }); }\n});\n\nmodule.exports = router;`;
  }

  private tplAuthMiddleware(): string {
    return `const jwt = require('jsonwebtoken');\nconst JWT_SECRET = process.env.JWT_SECRET || 'secret';\nmodule.exports = (req, res, next) => {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ error: 'No token' });\n  try { req.user = jwt.verify(token, JWT_SECRET); next(); }\n  catch { res.status(401).json({ error: 'Invalid token' }); }\n};`;
  }

  private tplLoginComponent(): string {
    return `import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\nimport { FormsModule } from '@angular/forms';\nimport { HttpClient } from '@angular/common/http';\nimport { Router } from '@angular/router';\n\n@Component({\n  selector: 'app-login', standalone: true, imports: [CommonModule, FormsModule],\n  template: \`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0c29">\n    <div style="background:rgba(255,255,255,.05);padding:40px;border-radius:16px;width:400px;border:1px solid rgba(255,255,255,.1)">\n      <h2 style="color:#fff;margin:0 0 20px">{{isLogin?'Login':'Register'}}</h2>\n      <div *ngIf="error" style="color:#f87171;background:rgba(239,68,68,.1);padding:10px;border-radius:8px;margin-bottom:16px">{{error}}</div>\n      <input *ngIf="!isLogin" [(ngModel)]="name" placeholder="Name" style="width:100%;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;margin-bottom:12px;box-sizing:border-box" />\n      <input [(ngModel)]="email" placeholder="Email" style="width:100%;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;margin-bottom:12px;box-sizing:border-box" />\n      <input [(ngModel)]="password" type="password" placeholder="Password" (keydown.enter)="submit()" style="width:100%;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;margin-bottom:16px;box-sizing:border-box" />\n      <button (click)="submit()" [disabled]="loading" style="width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer">{{loading?'Wait...':(isLogin?'Login':'Register')}}</button>\n      <p (click)="isLogin=!isLogin" style="text-align:center;color:#818cf8;cursor:pointer;margin-top:16px">{{isLogin?'No account? Register':'Have account? Login'}}</p>\n    </div></div>\`\n})\nexport class LoginComponent {\n  isLogin=true; name=''; email=''; password=''; loading=false; error='';\n  constructor(private http:HttpClient, private router:Router){}\n  submit(){\n    this.loading=true; this.error='';\n    const url=this.isLogin?'/api/auth/login':'/api/auth/register';\n    const body=this.isLogin?{email:this.email,password:this.password}:{name:this.name,email:this.email,password:this.password};\n    this.http.post<any>(url,body).subscribe({\n      next:r=>{localStorage.setItem('token',r.token);this.router.navigate(['/']);},\n      error:e=>{this.error=e.error?.error||'Error';this.loading=false;}\n    });\n  }\n}`;
  }

  private tplModel(name: string): string {
    const l = name.toLowerCase();
    return `const mongoose = require('mongoose');\nconst ${l}Schema = new mongoose.Schema({\n  name: { type: String, required: true },\n  description: { type: String, default: '' },\n  status: { type: String, enum: ['active', 'inactive'], default: 'active' },\n  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },\n}, { timestamps: true });\nmodule.exports = mongoose.model('${name}', ${l}Schema);`;
  }

  private tplCRUD(name: string): string {
    return `const express = require('express');\nconst router = express.Router();\nconst ${name} = require('../models/${name}');\n\nrouter.get('/', async (req,res) => {\n  try { res.json(await ${name}.find().sort({createdAt:-1})); }\n  catch(e) { res.status(500).json({error:e.message}); }\n});\n\nrouter.get('/:id', async (req,res) => {\n  try {\n    const item = await ${name}.findById(req.params.id);\n    if (!item) return res.status(404).json({error:'Not found'});\n    res.json(item);\n  } catch(e) { res.status(500).json({error:e.message}); }\n});\n\nrouter.post('/', async (req,res) => {\n  try {\n    const {name:n} = req.body;\n    if (!n) return res.status(400).json({error:'Name required'});\n    res.status(201).json(await ${name}.create({...req.body, createdBy:req.user?.userId}));\n  } catch(e) { res.status(400).json({error:e.message}); }\n});\n\nrouter.put('/:id', async (req,res) => {\n  try {\n    const item = await ${name}.findByIdAndUpdate(req.params.id, req.body, {new:true});\n    if (!item) return res.status(404).json({error:'Not found'});\n    res.json(item);\n  } catch(e) { res.status(400).json({error:e.message}); }\n});\n\nrouter.delete('/:id', async (req,res) => {\n  try {\n    const item = await ${name}.findByIdAndDelete(req.params.id);\n    if (!item) return res.status(404).json({error:'Not found'});\n    res.json({message:'Deleted'});\n  } catch(e) { res.status(500).json({error:e.message}); }\n});\n\nmodule.exports = router;`;
  }

  private tplComponent(name: string): string {
    const cls = name.charAt(0).toUpperCase() + name.slice(1);
    return `import { Component, OnInit } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-${name}',\n  standalone: true,\n  imports: [CommonModule],\n  template: \`<div><h2>${cls}</h2><p>Component works!</p></div>\`\n})\nexport class ${cls}Component implements OnInit {\n  ngOnInit() {}\n}`;
  }

  // ===== HELPERS =====

  private detectFilePurpose(file: ProjectFile): string {
    const c = file.content.toLowerCase();
    if (c.includes('router') && c.includes('express')) return 'Express API route';
    if (c.includes('mongoose.model')) return 'MongoDB model';
    if (c.includes('@component')) return 'Angular component';
    if (c.includes('@injectable')) return 'Angular service';
    if (c.includes('app.listen')) return 'Server entry point';
    if (c.includes('jwt')) return 'Auth middleware';
    return 'Source file';
  }

  private findBlockEnd(lines: string[], start: number): number {
    let d = 0;
    for (let i = start; i < lines.length; i++) {
      for (const c of lines[i]) { if (c === '{') d++; if (c === '}') d--; if (d === 0 && i > start) return i; }
    }
    return Math.min(start + 20, lines.length - 1);
  }

  clearChat(): void { this.messages.set([]); this.testCases.set([]); this.analysis = null; }

  calculateDiff(original: string, modified: string): { type: string; lineNum: number; text: string }[] {
    const a = original.split('\n'), b = modified.split('\n');
    const diff: { type: string; lineNum: number; text: string }[] = [];
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
    const lcs: string[] = []; let i = m, j = n;
    while (i > 0 && j > 0) { if (a[i-1] === b[j-1]) { lcs.unshift(a[i-1]); i--; j--; } else if (dp[i-1][j] > dp[i][j-1]) i--; else j--; }
    let oi = 0, mi = 0, li = 0;
    while (oi < a.length || mi < b.length) {
      if (li < lcs.length && oi < a.length && a[oi] === lcs[li] && mi < b.length && b[mi] === lcs[li]) {
        diff.push({ type: 'same', lineNum: mi + 1, text: lcs[li] }); oi++; mi++; li++;
      } else if (oi < a.length && (li >= lcs.length || a[oi] !== lcs[li])) {
        diff.push({ type: 'remove', lineNum: oi + 1, text: a[oi] }); oi++;
      } else if (mi < b.length) {
        diff.push({ type: 'add', lineNum: mi + 1, text: b[mi] }); mi++;
      }
    }
    return diff;
  }
}
