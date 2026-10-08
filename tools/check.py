"""SPDX-License-Identifier: Apache-2.0. Closed public manifest, fixture and license checks."""
import pathlib,json,re,hashlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
RULES={
 'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'github_token':rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b',
 'provider_secret':rb'\bsb_secret_[A-Za-z0-9_-]{10,}',
 'aws_key':rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
 'jwt':rb'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
 'credential_literal':rb'(?i)(?:password|passwd|api[_-]?key|access[_-]?token|secret)\s*[\x22\x27]?\s*[:=]\s*[\x22\x27]([^\x22\x27\r\n]{8,256})[\x22\x27]',
 'production_endpoint':rb'https?://[^\s\x22\x27]*(?:supabase\.co|vercel\.app)',
}
def scan(data):return [name for name,pattern in RULES.items() if re.search(pattern,data)]
def fixture_errors(f):
    errors=[]
    if f.get('synthetic') is not True:errors.append('synthetic_provenance')
    def walk(v):
        if isinstance(v,dict):
            for k,x in v.items():
                if isinstance(x,str) and (k=='id' or k.endswith('Id')) and not re.fullmatch(r'[A-Z][A-Z0-9]*_SYN_[A-Z0-9_]+',x):errors.append('synthetic_identity')
                if (k.endswith('Name') or k=='name') and isinstance(x,str) and not x.startswith(('虚构','Synthetic ')):errors.append('synthetic_name')
                walk(x)
        if isinstance(v,list):
            for x in v:
                if isinstance(x,dict) and ('id' in x or 'entityType' in x) and x.get('synthetic') is not True:errors.append('synthetic_row_provenance')
                walk(x)
    walk(f);return errors
def main():
    errors=[];manifest=json.loads((ROOT/'PUBLIC-MANIFEST.json').read_text(encoding='utf-8'));allowed=set(manifest['files']);actual=set()
    for p in ROOT.rglob('*'):
        rel=p.relative_to(ROOT);name=rel.as_posix()
        if any(x in ('.git','__pycache__','node_modules') for x in rel.parts):continue
        if p.is_symlink():errors.append([name,'symlink']);continue
        if not p.is_file():continue
        data=p.read_bytes();errors.extend([name,rule] for rule in scan(data))
        if rel.parts[0]=='dist':
            source=manifest['buildFiles'].get(name[5:])
            if not source or data!=(ROOT/source).read_bytes():errors.append([name,'build_not_allowlisted'])
            continue
        actual.add(name)
        if name not in allowed:errors.append([name,'not_allowlisted'])
        if name in manifest['sha256'] and hashlib.sha256(data).hexdigest()!=manifest['sha256'][name]:errors.append([name,'frozen_hash_changed'])
    errors.extend([x,'missing_file'] for x in allowed-actual)
    pkg=json.loads((ROOT/'package.json').read_text())
    if pkg.get('dependencies') or pkg.get('devDependencies') or pkg['license']!='Apache-2.0':errors.append(['package.json','license_or_dependencies'])
    license_text=(ROOT/'LICENSE').read_text()
    if 'Apache License' not in license_text or 'Version 2.0, January 2004' not in license_text:errors.append(['LICENSE','missing_license'])

    lock=json.loads((ROOT/'package-lock.json').read_text())
    if set(lock['packages'])!={''} or lock['version']!=pkg['version']:errors.append(['package-lock.json','dependency_inventory'])
    for file in ('fixtures/synthetic.json','fixtures/scenarios.json','fixtures/legacy-schema1.json'):
        errors.extend([file,x] for x in fixture_errors(json.loads((ROOT/file).read_text(encoding='utf-8'))))
    for name in actual:
        p=ROOT/name
        if p.suffix in ('.js','.cjs','.py') and b'SPDX-License-Identifier: Apache-2.0' not in p.read_bytes()[:300]:errors.append([name,'missing_source_license'])
    for destination,source in manifest['buildFiles'].items():
        if source not in allowed or '..' in pathlib.PurePosixPath(destination).parts:errors.append([destination,'unapproved_build_source'])

    workflow=(ROOT/'.github/workflows/public-ci.yml').read_text()
    expected={'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1','actions/setup-node@820762786026740c76f36085b0efc47a31fe5020'}
    if set(re.findall(r'uses:\s*([^\s#]+)',workflow))!=expected or re.search(r'pull_request_target|workflow_run|secrets\.|:\s*write\b',workflow):errors.append(['CI','privileged_or_unapproved'])
    for p in ROOT.rglob('*.js'):
        if 'dist' in p.parts or 'node_modules' in p.parts:continue
        if subprocess.run(['node','--check',str(p)],capture_output=True).returncode:errors.append([p.name,'syntax'])
    for p in ROOT.rglob('*.cjs'):
        if 'node_modules' in p.parts:continue
        if subprocess.run(['node','--check',str(p)],capture_output=True).returncode:errors.append([p.name,'syntax'])
    print(json.dumps({'files_checked':len(actual),'errors':errors}));return bool(errors)
if __name__=='__main__':sys.exit(main())
