# dsh-golden-ward

Customization **golden guardian** for DSH hosts. When a frequently-customized
file (e.g. the plugin-market web client) gets overwritten by a package
upgrade, restore it **whole-file** from a captured golden copy — no manual
re-patching, no reinstalling suites.

## Install

```bash
dsh plugin add github:<owner>/dsh-golden-ward
```

Then insert into your profile patch (see `cordis.patch.yml`) and restart dsh.

## Usage

1. Customize your target file as usual.
2. Capture the golden copy once:
   `curl -X POST "http://127.0.0.1:<port>/goldenward/api?act=init"`
3. Check any time:
   `curl "http://127.0.0.1:<port>/goldenward/api?act=status"`
4. Restore after an upgrade clobbers it:
   `curl -X POST "http://127.0.0.1:<port>/goldenward/api?act=restore"`

Restore is guarded: it refuses when golden or target is missing, or when the
golden copy lacks the configured `marker` string (defaults to `golden-ward`;
set your own marker in config so it matches your customization).

## Auto-heal (optional)

Pair with a simple watchdog loop (crontab `* * * * *` or a `while true; sleep 60`
shell) that calls `act=status` and `act=restore` when `hasMarker` is false,
then restarts dsh. With that in place, an upgrade-overwritten customization
heals within ~60 seconds with zero manual work.

## Config

```yaml
- id: golden-ward
  name: "@local/dsh-golden-ward"
  config:
    target: ~/.dsh/profiles/web/node_modules/@dsh-market/plugin/lib/client.js
    goldenDir: ~/.dsh/golden
    marker: golden-ward
```

## Design notes

- Whole-file restore over anchor re-patching: upgrades change code shape, so
  patch anchors rot; an intact golden copy does not.
- `init` refuses to capture a target that lacks the marker (never save a
  clobbered file as golden).
- Restore writes via `tmp + rename` (atomic on the same filesystem).
