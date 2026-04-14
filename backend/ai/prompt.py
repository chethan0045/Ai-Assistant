"""Prompt assembly and system prompt builder.

Handles instruction file discovery, project context gathering,
and system prompt construction for AI conversations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


FRONTIER_MODEL_NAME = "Claude Opus 4.6"
SYSTEM_PROMPT_DYNAMIC_BOUNDARY = "<!-- DYNAMIC BOUNDARY -->"

INSTRUCTION_FILENAMES = (
    "CLAUDE.md",
    "CLAUDE.local.md",
    ".claw/CLAUDE.md",
    ".claw/instructions.md",
)


@dataclass(frozen=True)
class ContextFile:
    """An instruction file discovered in the project tree."""

    path: str
    content: str
    source: str = "project"  # "project", "parent", "home"


@dataclass(frozen=True)
class GitContext:
    """Git state for prompt context."""

    branch: str = ""
    commit: str = ""
    is_dirty: bool = False


@dataclass
class ProjectContext:
    """Project-level context injected into the system prompt."""

    cwd: str = ""
    current_date: str = ""
    git_status: str = ""
    git_diff: str = ""
    git_context: GitContext = field(default_factory=GitContext)
    instruction_files: list[ContextFile] = field(default_factory=list)


def discover_instruction_files(start_dir: Path | None = None) -> list[ContextFile]:
    """Walk up from start_dir looking for instruction files.

    Checks each directory for CLAUDE.md, CLAUDE.local.md,
    .claw/CLAUDE.md, and .claw/instructions.md.
    """
    base = start_dir or Path.cwd()
    found: list[ContextFile] = []
    seen: set[Path] = set()

    current = base.resolve()
    while True:
        for filename in INSTRUCTION_FILENAMES:
            candidate = current / filename
            if candidate.is_file() and candidate not in seen:
                seen.add(candidate)
                try:
                    content = candidate.read_text(encoding="utf-8")
                except OSError:
                    continue
                source = "project" if current == base.resolve() else "parent"
                found.append(ContextFile(
                    path=str(candidate),
                    content=content,
                    source=source,
                ))
        parent = current.parent
        if parent == current:
            break
        current = parent

    return found


class SystemPromptBuilder:
    """Assembles the full system prompt from static and dynamic sections."""

    def __init__(self) -> None:
        self._sections: list[str] = []
        self._output_style: str = ""
        self._os_name: str = ""
        self._project_context: ProjectContext | None = None

    def with_output_style(self, style: str) -> SystemPromptBuilder:
        self._output_style = style
        return self

    def with_os(self, os_name: str) -> SystemPromptBuilder:
        self._os_name = os_name
        return self

    def with_project_context(self, ctx: ProjectContext) -> SystemPromptBuilder:
        self._project_context = ctx
        return self

    def append_section(self, title: str, content: str) -> SystemPromptBuilder:
        self._sections.append(f"# {title}\n{content}")
        return self

    def build(self) -> str:
        """Assemble the complete system prompt."""
        parts: list[str] = []

        parts.append(f"You are {FRONTIER_MODEL_NAME}, an AI assistant.")

        if self._os_name:
            parts.append(f"Operating system: {self._os_name}")

        if self._output_style:
            parts.append(f"Output style: {self._output_style}")

        parts.append(SYSTEM_PROMPT_DYNAMIC_BOUNDARY)

        if self._project_context:
            ctx = self._project_context
            if ctx.cwd:
                parts.append(f"Working directory: {ctx.cwd}")
            if ctx.current_date:
                parts.append(f"Current date: {ctx.current_date}")
            if ctx.git_context.branch:
                parts.append(f"Git branch: {ctx.git_context.branch}")
            for cf in ctx.instruction_files:
                parts.append(f"\n--- {cf.path} ---\n{cf.content}")

        for section in self._sections:
            parts.append(section)

        return "\n\n".join(parts)

    def render(self) -> str:
        """Alias for build()."""
        return self.build()
