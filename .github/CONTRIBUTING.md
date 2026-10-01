# Contributing to Galactic Stays

Galactic Stays is an educational SAP CAP project for local development. Contributions that improve its correctness, learning value, or documentation are welcome.

## Getting started

1. Fork the repository and create a branch for your change.
2. Use Node.js 24 and install dependencies with `npm ci`.
3. Run `npm start` to start the application locally.

## Guidelines

- Check existing issues before reporting a bug or proposing a feature.
- For bugs, include reproduction steps, expected behavior, and actual behavior.
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
