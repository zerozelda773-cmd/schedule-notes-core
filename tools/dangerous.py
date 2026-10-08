"""SPDX-License-Identifier: Apache-2.0. Conservative dangerous sink scan, not a data-flow proof."""
import pathlib, re, json, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
RULES = {
    'eval': rb'\beval\s*\(',
    'dynamic_function': rb'\b(?:new\s+)?Function\s*\(',
    'html_sink': rb'\.(?:innerHTML|outerHTML)\s*=|\.insertAdjacentHTML\s*\(',
    'prototype_write': rb'\.__proto__\s*=|\bObject\.setPrototypeOf\s*\(',
    'executable_deserialization': rb'\b(?:deserialize|runInNewContext|runInThisContext)\s*\(|\bpickle\.loads\s*\(',
}

def dangerous(data):
    return [name for name, pattern in RULES.items() if re.search(pattern, data)]

def main():
    manifest = json.loads((ROOT / 'PUBLIC-MANIFEST.json').read_text(encoding='utf-8'))
    errors = []
    checked = 0
    for name in manifest['files']:
        if pathlib.PurePosixPath(name).suffix not in ('.js', '.cjs', '.mjs'):
            continue
        checked += 1
        errors.extend([name, rule] for rule in dangerous((ROOT / name).read_bytes()))
    print(json.dumps({'executable_files_checked': checked, 'errors': errors,
        'scope': 'static dangerous sinks; structured JSON requires runtime guards and boundary tests'}))
    return bool(errors)

if __name__ == '__main__':
    sys.exit(main())
