# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X Copilot is a modern browser extension built for recording and managing X (Twitter) browsing history with intelligent search capabilities. The extension is built using the WXT framework with Vue 3, TypeScript, and UnoCSS.

### Development
- `pnpm dev` - Start development server for Chrome
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build extension for production
- `pnpm build:firefox` - Build extension for Firefox
- `pnpm zip` - Package extension for Chrome Web Store
- `pnpm zip:firefox` - Package extension for Firefox Add-ons

### Quality Control
- `pnpm compile` - Type check with vue-tsc (no emit)
- `pnpm test` - Run tests with Vitest
- `pnpm format` - Format code with Prettier

## Architecture

### Core Components

**Background Script** (`entrypoints/background.ts`):
- Handles automatic tweet recording with debounced URL checking
- Manages browser tab updates and SPA navigation detection
- Implements periodic history cleanup via alarms API
- Stores tweet history in browser storage

**Content Script** (`entrypoints/content.ts`):
- Injects command palette into ALL websites (not just X.com)
- Monitors DOM changes for SPA navigation
- Provides Shift+K shortcut for search and Shift+S for DOM selection
- Uses throttled messaging to background script

**Popup Interface** (`entrypoints/popup/App.vue`):
- Main extension popup with search and history management
- Configurable cleanup periods (1w, 1m, 3m, 1y, never)
- LLM integration settings for AI-powered search
- History filtering and manual cleanup options

**Command Palette** (`components/ContentCommandPalette.vue`):
- Overlay interface for quick history search
- Keyboard navigation (arrow keys, enter, escape)
- Individual record deletion functionality
- AI-powered search query transformation

### LLM Integration

The extension supports intelligent search through multiple LLM providers:
- **Providers**: OpenAI, Gemini (configurable via popup settings)
- **Implementation**: Uses Vercel AI SDK (`ai` package)
- **Search Enhancement**: Converts natural language queries to X search parameters
- **Models Directory**: `llm/models/` contains provider-specific implementations

### Data Management

**Storage Schema**:
- `CleanupConfig`: Manages automatic history cleanup settings
- `LLMConfig`: Stores API keys and model configurations
- `ContentRecord`: Union type for `TwitterRecord` and `DomSelectionRecord`
- `ContentStorage`: Centralized storage management class in `utils/storage.ts`

**History Management**:
- Automatic recording based on dwell time on tweet pages
- DOM element selection and recording on any website
- Periodic cleanup based on user-configured retention periods
- Real-time search filtering by author or content with advanced query syntax (`source:twitter`)

### Tech Stack

- **Framework**: WXT (Web Extension Toolkit)
- **Frontend**: Vue 3 with Composition API
- **Styling**: UnoCSS with preset-icons
- **Type Safety**: TypeScript with strict configuration
- **Testing**: Vitest for unit tests
- **Build**: Vite-based build system via WXT

### Extension Permissions

- `activeTab`: Access current tab information
- `storage`: Browser storage API access
- `alarms`: Periodic background tasks

## Development Notes

- The extension uses debouncing (300ms) and throttling (1000ms) to optimize performance
- SPA navigation detection is handled through MutationObserver on timeline elements
- All browser storage operations use WXT's storage abstraction
- The command palette uses Vue's teleport-like functionality for DOM injection
- Search service supports grouped/filtered display modes based on query complexity
- DOM selection tool provides visual overlays and CSS selector generation

## Key Files

- `utils/storage.ts`: Centralized ContentStorage class for all data operations
- `utils/searchService.ts`: Advanced search functionality with query parsing
- `utils/domSelector.ts`: Interactive element selection system
- `llm/index.ts`: LLM integration with prompt engineering for search enhancement
- `types/index.ts`: TypeScript definitions for all data structures

## IMP!!
no gradient, no card!