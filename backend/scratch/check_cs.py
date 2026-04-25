import tree_sitter_language_pack as tslp

variations = ["csharp", "c-sharp", "cs", "C#", "CSharp", "c_sharp"]

for v in variations:
    try:
        tslp.get_language(v)
        print(f"'{v}' is SUPPORTED")
    except Exception:
        print(f"'{v}' is NOT supported")
