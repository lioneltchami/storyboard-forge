# Contributing Guide

Thank you for your interest in **Storyboard Forge**. Contributions of any kind are welcome.

## Development Environment

### Requirements

- Node.js >= 18
- npm >= 9 (or pnpm >= 8)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/lioneltchami/storyboard-forge.git
cd storyboard-forge

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Project Structure

```
storyboard-forge/
├── electron/          # Electron main process + preload
├── src/
│   ├── components/    # React UI components
│   ├── stores/        # Zustand state management
│   ├── lib/           # Utilities and business logic
│   ├── packages/      # Internal packages (@opencut/ai-core)
│   └── types/         # TypeScript type definitions
├── build/             # Build assets (icons, etc.)
└── scripts/           # Utility scripts
```

### Build

```bash
# Compile the project
npm run build

# Compile only (do not package an installer)
npx electron-vite build
```

## Contribution Flow

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request

### Commit Convention

Please use the [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation update
- `refactor:` code refactor
- `style:` formatting-only change
- `perf:` performance improvement
- `test:` test-related change
- `chore:` build/tooling change

### Code Style

- Use TypeScript strict mode
- Prefer function components and Hooks for React components
- Use Tailwind CSS for styling
- Keep public APIs in English

## Contributor License Agreement (CLA)

By submitting a pull request, you agree that:

1. You own the copyright to the code you submit, or you have the right to submit it
2. You authorize the project maintainers to include your contribution in both the AGPL-3.0 open-source release and the commercial license offering
3. Your contribution will be released under AGPL-3.0

This helps the project maintain its dual-licensing model.

## Feedback and Issues

- Bug reports: [GitHub Issues](https://github.com/lioneltchami/storyboard-forge/issues)
- Feature requests: [GitHub Issues](https://github.com/lioneltchami/storyboard-forge/issues)
- Discussion: [GitHub Issues](https://github.com/lioneltchami/storyboard-forge/issues)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
