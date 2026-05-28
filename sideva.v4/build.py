#!/usr/bin/env python3
"""
SI-DEVA — Build Script
Assembles index.html dari pages/ + template skeleton.

Usage:
  python build.py          → membangun index.html
  python build.py --watch  → otomatis rebuild saat file berubah
"""
import os, sys, time

PAGES = [
    'dashboard', 'paket', 'rincian', 'harga', 'penyedia', 'ecatalog',
    'master', 'import', 'backup', 'laporan', 'evat', 'evhp', 'formspek', 'formdpp',
    'nodis', 'riviu', 'penetapan', 'idkb', 'sppbj', 'bahpe', 'pengaturan',
    'manajemen-akses', 'opd-management', 'manajemen-user'
]

def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def build():
    skeleton = read('_skeleton.html')
    parts = []
    for pid in PAGES:
        active = ' active' if pid == 'dashboard' else ''
        inner = read(f'pages/{pid}.html')
        parts.append(f'\n<!-- ═══ PAGE: {pid.upper()} ═══ -->')
        parts.append(f'<div class="page{active}" id="page-{pid}">')
        parts.append(inner.strip())
        parts.append('</div>')
    assembled = '\n'.join(parts)
    output = skeleton.replace('<!-- @@PAGES@@ -->', assembled)
    write('index.html', output)
    print(f'[build] index.html rebuilt ({len(output.splitlines())} baris)')

if __name__ == '__main__':
    build()
    if '--watch' in sys.argv:
        print('[watch] Memantau perubahan file... (Ctrl+C untuk berhenti)')
        last_mtimes = {}
        watch_dirs = ['pages', '.']
        while True:
            time.sleep(1)
            changed = False
            for d in watch_dirs:
                for fn in os.listdir(d):
                    fp = os.path.join(d, fn)
                    if os.path.isfile(fp) and (fn.endswith('.html') or fn == '_skeleton.html'):
                        mt = os.path.getmtime(fp)
                        if last_mtimes.get(fp) != mt:
                            last_mtimes[fp] = mt
                            if fp in last_mtimes:
                                print(f'[watch] {fp} berubah')
                                changed = True
            if changed:
                build()
