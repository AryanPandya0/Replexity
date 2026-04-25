import tree_sitter_language_pack as tslp

langs = [
    "python", "javascript", "typescript", "tsx", 
    "java", "go", "rust", "c", "cpp", "c_sharp", 
    "ruby", "php", "kotlin", "swift"
]

for lang in langs:
    try:
        tslp.get_language(lang)
        print(f"{lang}: Supported")
    except Exception as e:
        print(f"{lang}: FAILED - {e}")
