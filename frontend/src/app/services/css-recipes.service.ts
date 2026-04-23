import { Injectable } from '@angular/core';

/**
 * Offline CSS recipe library. Each recipe recognizes a style intent
 * ("dark theme", "bigger buttons", etc.) and transforms CSS text — either a
 * .css/.scss file or the inline `styles: [`...`]` block of an Angular
 * standalone component.
 *
 * Transformations are deliberately simple (regex replace + append) so they
 * run offline with deterministic output. Full-parse CSS rewriting is out of
 * scope; for that, use the LLM path once DEEPSEEK_API_KEY is configured.
 */

export interface CssRecipe {
  id: string;
  name: string;
  description: string;
  triggers: RegExp[];
  /** Apply returns the modified content + a short change note. */
  apply: (content: string) => { content: string; note: string };
}

/** Wrap a body in an appended block so it overrides previous rules of same specificity. */
function appendOverride(content: string, selector: string, rules: string): string {
  const block = `\n\n/* --- recipe override --- */\n${selector} {\n${rules.trim()}\n}\n`;
  // Inline-styles case: inject before the closing backtick.
  const backtickEnd = content.lastIndexOf('`');
  if (backtickEnd !== -1 && content.includes('styles:')) {
    return content.slice(0, backtickEnd) + block + content.slice(backtickEnd);
  }
  return content + block;
}

@Injectable({ providedIn: 'root' })
export class CssRecipesService {
  private recipes: CssRecipe[] = [
    {
      id: 'dark-theme',
      name: 'Dark theme',
      description: 'Swap to a dark color palette (near-black backgrounds, light text, indigo accent).',
      triggers: [/\bdark(\s+mode|\s+theme)?\b/i, /\bnight(\s+mode)?\b/i, /make\s+it\s+dark/i],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, .login-card, main, .wrap', `
  background: #0f172a !important;
  color: #e2e8f0;
`) + appendOverride(content, '.input, input, textarea', `
  background: rgba(255,255,255,0.06) !important;
  color: #e2e8f0 !important;
  border-color: rgba(255,255,255,0.12) !important;
`) + appendOverride(content, '.btn, button', `
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  color: #fff !important;
`),
        note: 'Applied dark palette to page/card/inputs/buttons.',
      }),
    },
    {
      id: 'light-theme',
      name: 'Light theme',
      description: 'Swap to a clean light palette (white surfaces, slate text).',
      triggers: [/\blight(\s+mode|\s+theme)?\b/i, /make\s+it\s+light/i, /\bwhite\s+theme\b/i],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, .login-card, main, .wrap', `
  background: #f8fafc !important;
  color: #0f172a;
`) + appendOverride(content, '.input, input, textarea', `
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
`) + appendOverride(content, '.btn, button', `
  background: #6366f1 !important;
  color: #fff !important;
`),
        note: 'Applied light palette to page/card/inputs/buttons.',
      }),
    },
    {
      id: 'rounded-corners',
      name: 'Rounded corners',
      description: 'Increase border-radius on cards, inputs, and buttons for a softer look.',
      triggers: [/\bround(ed)?(\s+corners?)?\b/i, /\bsoft\s+edges?\b/i, /\bmore\s+rounded\b/i],
      apply: (content) => ({
        content: appendOverride(content, '.login-card, .card, .wrap', 'border-radius: 24px !important;')
               + appendOverride(content, '.input, input, textarea, select', 'border-radius: 12px !important;')
               + appendOverride(content, '.btn, button', 'border-radius: 999px !important;'),
        note: 'Cards 24px, inputs 12px, buttons fully pill-shaped.',
      }),
    },
    {
      id: 'bigger-text',
      name: 'Larger text and buttons',
      description: 'Scale up font sizes on headings, inputs, and buttons.',
      triggers: [/\b(big(ger)?|larger)\s+(text|font|buttons?)\b/i, /\bzoom\b/i, /\bmake.*(bigger|larger)\b/i],
      apply: (content) => ({
        content: appendOverride(content, 'h1, h2, h3', 'font-size: 2em !important;')
               + appendOverride(content, '.input, input, textarea', 'padding: 16px 20px !important; font-size: 17px !important;')
               + appendOverride(content, '.btn, button', 'padding: 16px 28px !important; font-size: 17px !important;'),
        note: 'Headings 2em; inputs/buttons 17px with roomier padding.',
      }),
    },
    {
      id: 'gradient-bg',
      name: 'Gradient background',
      description: 'Apply a vibrant multi-stop gradient to the page background.',
      triggers: [/\bgradient\b/i, /\bcolou?rful\s+background\b/i, /\bbackground.*gradient\b/i],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, .wrap, main', `
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%) !important;
  color: #fff;
`),
        note: 'Added a dark indigo → midnight gradient to the page background.',
      }),
    },
    {
      id: 'glassmorphism',
      name: 'Glassmorphism',
      description: 'Translucent frosted-glass panels with blur.',
      triggers: [
        /\bglass(morph|y|\s+effect)?\b/i,
        /\bglass\s*(p?h?orp|morp|morph)\w*\b/i,  // forgiving spelling: glassphorpism, glassmorphism, glassmorpism
        /\bfrost(ed)?\s+glass?\b/i,
        /\btranslucent\b/i,
      ],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, main, .wrap', 'background: linear-gradient(135deg,#667eea,#764ba2) !important;')
               + appendOverride(content, '.login-card, .card, .panel', `
  background: rgba(255,255,255,0.12) !important;
  border: 1px solid rgba(255,255,255,0.22) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.35) !important;
`),
        note: 'Frosted glass panel over a purple gradient backdrop.',
      }),
    },
    {
      id: 'flat-minimal',
      name: 'Flat minimal',
      description: 'Remove gradients, shadows, and heavy effects for a minimalist look.',
      triggers: [/\b(flat|minimal(ist)?|plain|clean)\b/i, /\bremove\s+(shadow|gradient|effect)/i],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, .wrap, main, .login-card, .btn, button, .input, input, textarea', `
  background: #ffffff !important;
  color: #1f2937 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-image: none !important;
`) + appendOverride(content, '.login-card, .card', 'border: 1px solid #e5e7eb !important;')
   + appendOverride(content, '.btn, button', 'background: #111827 !important; color: #fff !important;'),
        note: 'Stripped shadows/gradients; white surfaces, black primary button.',
      }),
    },
    {
      id: 'high-contrast',
      name: 'High contrast',
      description: 'Strong black-on-white contrast, heavier borders, for accessibility.',
      triggers: [/\b(high\s+contrast|accessib(le|ility))\b/i, /\bbold\s+borders\b/i],
      apply: (content) => ({
        content: appendOverride(content, ':host, body, .login-wrap, main', 'background: #ffffff !important; color: #000 !important;')
               + appendOverride(content, '.login-card, .card', 'border: 2px solid #000 !important; background: #fff !important;')
               + appendOverride(content, '.input, input, textarea', 'border: 2px solid #000 !important; color: #000 !important; background: #fff !important;')
               + appendOverride(content, '.btn, button', 'background: #000 !important; color: #fff !important; border: 2px solid #000 !important; font-weight: 700 !important;'),
        note: 'Black/white palette with 2px borders on all interactive elements.',
      }),
    },
  ];

  /** List all recipes (for help output). */
  list(): CssRecipe[] { return this.recipes; }

  /** Find the first recipe whose triggers match the request. */
  detect(request: string): CssRecipe | null {
    for (const r of this.recipes) {
      if (r.triggers.some(t => t.test(request))) return r;
    }
    return null;
  }

  /** Quick intent check — "does this request look like a style change at all?" */
  isStyleIntent(request: string): boolean {
    return /\b(style|styling|theme|color|colour|design|appearance|look|font|spacing|layout|background|ui|css|scss)\b/i.test(request);
  }

  /**
   * Pick the best target file for a style recipe, in this order:
   *  1. Currently-open file if it's .css/.scss or a component with inline styles
   *  2. Any .css or .scss file in the project
   *  3. Any .ts file containing `styles: [`...`]`
   */
  pickTargetFile(
    files: { path: string; content: string }[],
    currentPath?: string,
  ): { path: string; content: string } | null {
    if (currentPath) {
      const cur = files.find(f => f.path === currentPath);
      if (cur && this.hasStyles(cur)) return cur;
    }
    const css = files.find(f => /\.s?css$/i.test(f.path));
    if (css) return css;
    const inline = files.find(f => /styles\s*:\s*\[/.test(f.content));
    return inline || null;
  }

  private hasStyles(f: { path: string; content: string }): boolean {
    if (/\.s?css$/i.test(f.path)) return true;
    return /styles\s*:\s*\[/.test(f.content);
  }
}
