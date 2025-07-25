# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.You need use English to write text.

## Key Development Commands
- Build: `npm run build`
- Start: `npm start`

## Architecture
- Uses `express` for routing (see `src/server.ts`)
- Bundles with `esbuild` for CLI distribution
- Plugins are loaded from `$HOME/.claude-code-rock/plugins`