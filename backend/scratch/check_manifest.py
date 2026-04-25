import tree_sitter_language_pack as tslp
try:
    langs = tslp.manifest_languages()
    print(f"Total manifest languages: {len(langs)}")
    c_langs = [l for l in langs if 'c' in l.lower()]
    print(f"Langs with 'c': {c_langs}")
except Exception as e:
    print(f"Error: {e}")
