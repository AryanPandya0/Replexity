import tree_sitter_language_pack as tslp
try:
    lang = tslp.get_language("csharp")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
