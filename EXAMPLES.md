# Test examples for Dev Tools utilities

Copy and paste these into the app to test each tool.

---

## 1. JSON Formatter

**Minified / messy JSON (Format):**
```json
{"name":"Dev Tools","version":1,"features":["json","yaml","jwt"],"active":true,"meta":null}
```

**Invalid JSON (Auto Fix):**
```json
{ name: "test", items: [1, 2, 3], enabled: true }
```

**Trailing comma (Auto Fix):**
```json
{"a": 1, "b": 2,}
```

---

## 2. YAML Formatter

**Simple YAML:**
```yaml
name: Dev Tools
version: 1.0
features:
  - json
  - yaml
  - jwt
settings:
  theme: light
  autoSave: true
```

**Messy YAML (tabs / spacing):**
```yaml
name:Test App
version: 2
env:
  - dev
  - staging
  - prod
```

---

## 3. JWT Decoder

**Sample JWT (paste and click Decode):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3Mzk2MDY0MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**With Bearer prefix (also works):**
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
```

---

## 4. Cron Parser

**Every 15 minutes:**
```
*/15 * * * *
```

**Weekdays at 9:00 AM:**
```
0 9 * * 1-5
```

**First day of every month at midnight:**
```
0 0 1 * *
```

**Every hour:**
```
0 * * * *
```

**Every 5 minutes during business hours (9–17), weekdays:**
```
*/5 9-17 * * 1-5
```

---

## 5. Timestamp Converter

**Unix seconds:**
```
1739606400
```

**Unix milliseconds:**
```
1739606400000
```

**ISO 8601:**
```
2025-02-15T12:00:00.000Z
```

**Date string:**
```
Feb 15, 2025
```

**Another readable date:**
```
15 February 2025 00:00:00 GMT
```
