# Josephus' Custom Formatters

Simplified version of https://github.com/jkillian/vscode-custom-local-formatters extension (thanks to @jkillian), to provide custom formatters for specific languages.

I currently use this to provide [Laravel Pint](https://laravel.com/docs/pint) formatting for PHP files.

## Usage

1. Install the extension in VS Code
2. Add something like the following to your VS Code settings (adjust the command and args as needed):

```json
"josephusCustomFormatters.formatters": [
    {
        "command": "vendor/bin/pint - --stdin-filename ${fileRelativeToWorkspace}",
        "languages": ["php"],
        "disabled": false
    }
]
```

That registers a PHP formatter that uses the `vendor/bin/pint` script to format PHP files, passing the file contents via stdin and the filename as an argument.

Platform-specific commands can be used by specifying `command` as an object with one or more [Node.js `os.platform()` names](https://nodejs.org/api/os.html#osplatform) or keys, e.g.:

```json
"josephusCustomFormatters.formatters": [
    {
        "command": {
            "win32": "vendor\\bin\\pint.bat - --stdin-filename ${fileRelativeToWorkspace}",
            "linux": "vendor/bin/pint - --stdin-filename ${fileRelativeToWorkspace}",
            "darwin": "vendor/bin/pint - --stdin-filename ${fileRelativeToWorkspace}"
        },
        "languages": ["php"],
        "disabled": false,
    }
]
```

`*` may be used as a key to provide a fallback command for any platforms not explicitly listed.

## Development

1. Clone the repository and change to its directory
2. Run `yarn` to install dependencies
3. Open the repository in VS Code
4. Press F5 to build the extension and launch a new VS Code window with the extension loaded. This window will open the `sample-php-project` folder by default.
5. There are sample PHP files in `sample-php-project/` with Pint installed for testing the extension.
   - Try editing and saving `src/models/Excluded.php` to see that it is not formatted (it's ignored via the `pint.json` config)
   - Try editing and saving `src/models/User.php` to see that it is formatted using Pint

### Package

Run `yarn vsce package` to create a `.vsix` package file for the extension.
