import tree_sitter_language_pack as tslp
langs = tslp.available_languages()
print(f"Total available languages: {len(langs)}")
if "c_sharp" in langs: print("c_sharp found")
elif "csharp" in langs: print("csharp found")
else:
    print("C# NOT FOUND in available_languages()")
    # Print first 20 to see names
    print(langs[:20])
    # Search for anything starting with 'c'
    c_langs = [l for l in langs if l.startswith('c')]
    print(f"Langs starting with 'c': {c_langs}")
