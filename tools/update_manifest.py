'''SPDX-License-Identifier: Apache-2.0. Explicit registration and hash refresh; no directory discovery.'''
import pathlib,json,hashlib,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--add',action='append',default=[]);parser.add_argument('--remove',action='append',default=[]);parser.add_argument('--normalize-lf',action='store_true');args=parser.parse_args()
path=ROOT/'PUBLIC-MANIFEST.json';m=json.loads(path.read_text(encoding='utf-8'));allowed=(set(m['files'])|set(args.add))-set(args.remove)
for rel in allowed:
 p=pathlib.PurePosixPath(rel)
 if p.is_absolute() or '..' in p.parts or p.parts[0] in ('.git','dist','node_modules') or not (ROOT/rel).is_file():raise SystemExit('Invalid explicit path')

if args.normalize_lf:
 for rel in sorted(allowed):
  p=ROOT/rel;p.write_bytes(p.read_bytes().replace(b'\r\n',b'\n'))
m['version']=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'];m['files']=sorted(allowed);m['sha256']={rel:hashlib.sha256((ROOT/rel).read_bytes()).hexdigest() for rel in sorted(allowed) if rel!='PUBLIC-MANIFEST.json'}
m['buildFiles']={'index.html':'demo/index.html','demo.js':'demo/demo.js','style.css':'demo/style.css','fixtures/synthetic.json':'fixtures/synthetic.json','fixtures/legacy-schema1.json':'fixtures/legacy-schema1.json'}
m['buildFiles'].update({rel:rel for rel in sorted(allowed) if rel.endswith('.js') and rel.startswith(('core/','adapters/'))})
for entry in ('index.mjs','storage-conformance.mjs','experimental-wave1.mjs'):
 if entry in allowed:m['buildFiles'][entry]=entry
path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'explicit_public_files':len(allowed)}))
