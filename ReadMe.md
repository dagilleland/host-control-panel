# host-control-panel

`host` is a TypeScript CLI built with CommanderJS that reads the Windows `hosts` file and prints the active host mappings in a simple table.

## Requirements

- Windows
- Node.js 20 or newer
- `pnpm`

## Install From Source

1. Open PowerShell.
2. Change into the project directory.
3. Install dependencies:

```powershell
pnpm install
```

4. Build the CLI:

```powershell
pnpm build
```

5. Install the command globally from the local source checkout:

```powershell
pnpm install --global .
```

After that, the `host` command should be available in a new terminal session.

## Usage

Read the default Windows `hosts` file:

```powershell
host
```

Read a specific file instead:

```powershell
host --file C:\path\to\hosts
```

## Development

Type-check the project:

```powershell
pnpm check
```

Run the tests:

```powershell
pnpm test
```

Run the compiled CLI locally without installing it globally:

```powershell
pnpm build
node .\dist\src\cli.js
```
