# Contributing to Galactic Stays

Galactic Stays is an educational SAP CAP project for local development. Contributions that improve its correctness, learning value, or documentation are welcome.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

1. Fork the repository and create a branch for your change.
2. Use Node.js 24 and install dependencies with `npm ci`.
3. Run `npm start` to start the application locally.

## Guidelines

- Use [Discussions](https://github.com/vontanne/galactic-stays/discussions) to ask questions about the project or share what you learn.
- For security vulnerabilities, follow the [security policy](SECURITY.md) and report privately.
- Check existing issues before reporting a bug or proposing a feature.
- Use the [bug report](https://github.com/vontanne/galactic-stays/issues/new?template=bug_report.md) or [feature request](https://github.com/vontanne/galactic-stays/issues/new?template=feature_request.md) template and provide the requested details.
- Discuss substantial features or changes to the data model and booking rules in an issue first.
- Keep changes focused and avoid unrelated refactoring.
- Prefer CDS declarations for modeling, validation, and authorization. Use focused JavaScript handlers where needed.
- Follow the existing code style and use clear names instead of comments in JavaScript and CDS.
- Keep domain error messages in `_i18n/messages.properties`.
- Add meaningful tests for changes to business rules or authorization. For UI changes, verify the affected apps as the relevant users.

## Before opening a pull request

Run these checks:

```bash
npm run format:check
npm run lint
npm test
git diff --check
```

For CDS or UI annotation changes, also compile the OData metadata. This command requires `@sap/cds-dk` to be installed globally:

```bash
cds compile '*' --to edmx-v4 --service all > /dev/null
```

Describe the problem, your changes, and how you verified them. Link a related issue when applicable.

Use Conventional Commit messages, such as `feat:`, `fix:`, `docs:`, or `test:` followed by a clear description.
