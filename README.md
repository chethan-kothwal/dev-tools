# Dev Tools

Static web app with JSON/YAML formatters and utility tools (JWT decoder, cron parser, timestamp converter, Base64/Hex utilities).

## Tools available

- JSON Formatter
  - Formats JSON with consistent indentation.
  - Validates JSON syntax and surfaces line/column errors.
  - Supports auto-fix for common issues like unquoted keys, trailing commas, and single quotes.

- YAML Formatter
  - Parses and formats YAML into a clean structure.
  - Highlights parsing issues with location details.
  - Supports practical auto-fixes for common indentation and spacing problems.

- JWT Decoder
  - Decodes JWT header and payload from raw token or `Bearer` token input.
  - Shows token metadata and timing information (`iat`, `nbf`, `exp`, expiry status).

- Cron Schedule Parser
  - Validates 5-field cron expressions.
  - Displays the next scheduled run times based on the current time.

- Unix Timestamp Converter
  - Converts Unix seconds/milliseconds and date-time strings.
  - Returns UTC/local representations and normalized timestamp values.

- Base64/Hex Utilities
  - Encodes/decodes text using Base64 and Hex.
  - Encodes files to Base64/Hex and decodes Base64/Hex back to downloadable binary files.
  - Decodes JWT header/payload parts and encodes JWT parts as Base64URL.

## Run locally

1. Clone the repository.
2. Open `index.html` in your browser.

## Run tests

Prerequisite: Node.js 18+ and npm.

```bash
npm install
npm test
```
