# Contributing to Transformers.js Chrome Extension

Thank you for your interest in contributing to the Transformers.js Chrome Extension! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js to build this project
- pnpm package manager to install dependencies
- Chrome browser to load and run the extension

### Local Development

1. Clone the repository:
```bash
git clone git@github.com:tantara/transformers.js-chrome.git
cd transformers.js-chrome
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` directory

5. Build and package the extension for production:
```bash
pnpm build
pnpm package
```

It will create a `.zip` file in the `build/chrome-mv3-prod` directory (ie `build/chrome-mv3-prod.zip`). Please ensure that the file is valid and can be installed in Chrome.


## Development Guidelines

### Code Style

- Use TypeScript for all new code
- No need to follow existing code formatting patterns. I'm new to react and typescript. Feedback is always welcome.
- Use meaningful variable and function names
- Add comments for complex logic

### Making Changes

1. Create a new branch for your feature/fix:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test thoroughly
3. Commit your changes with clear commit messages
4. Push to your fork and submit a Pull Request

### Testing

Before submitting a PR, please:

- Include screenshots or videos of the changes in the PR description if available
- Test the extension in Chrome
- Verify memory usage (using Chrome Task Manager)
- Check for any console errors
- Test with different models if your changes affect model loading/inference

### Debugging Tips

- Use the service worker inspector in `chrome://extensions`
- Monitor memory usage through Chrome's Task Manager
- Check local storage for cached checkpoints in the browser's DevTools

## Pull Request Process

1. Update the README.md with details of significant changes
2. Ensure your PR description clearly describes the problem and solution
3. Reference any related issues in your PR description

## Feature Requests and Bug Reports

- Use GitHub Issues to report bugs or request features
- Provide detailed steps to reproduce bugs
- Include Chrome version and system specifications
- For feature requests, explain the use case and benefits

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help maintain a positive community environment

## Questions?

If you have questions about contributing, feel free to:
- Open an issue for discussion
- Ask in existing relevant issues
- Reach out to the maintainers

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project. 