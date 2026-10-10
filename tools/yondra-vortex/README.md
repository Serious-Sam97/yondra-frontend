# yondra-vortex

Q-10 · Vortex in your terminal, like the 1985 dimension. Zero dependencies, read-only.

1. Profile → Vortex → "Outside the app" → switch on **Terminal**. Copy the key.
2. Run it (local only; this package is not published):

```bash
YONDRA_API=http://localhost npx ./tools/yondra-vortex <key>
```

Flags: `--watch` (he keeps muttering every minute), `--polite`, `--no-color`.
The key only reads your open cards and his mood. Switch it off in the profile and it dies.
