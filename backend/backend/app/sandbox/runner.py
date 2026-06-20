import subprocess
import tempfile
import os
import sys
import re

LANGUAGE_CONFIG = {
    "python":     {"suffix": ".py",  "compile": None,                        "run": [sys.executable]},
    "javascript": {"suffix": ".js",  "compile": None,                        "run": ["node"]},
    "java":       {"suffix": ".java","compile": ["javac"],                    "run": ["java"]},
    "c":          {"suffix": ".c",   "compile": ["gcc", "-o", "{bin}", "{src}", "-lm"], "run": ["{bin}"]},
    "cpp":        {"suffix": ".cpp", "compile": ["g++", "-o", "{bin}", "{src}", "-std=c++17"], "run": ["{bin}"]},
    "csharp":     {"suffix": ".cs",  "compile": ["dotnet-script"],            "run": None},
    "typescript": {"suffix": ".ts",  "compile": None,                        "run": ["npx", "ts-node", "--skip-project"]},
    "go":         {"suffix": ".go",  "compile": None,                        "run": ["go", "run"]},
    "rust":       {"suffix": ".rs",  "compile": ["rustc", "-o", "{bin}", "{src}"], "run": ["{bin}"]},
    "php":        {"suffix": ".php", "compile": None,                        "run": ["php"]},
    "ruby":       {"suffix": ".rb",  "compile": None,                        "run": ["ruby"]},
}

COMPILED_LANGUAGES = {"c", "cpp", "rust"}
SPECIAL_LANGUAGES  = {"java", "csharp"}

def execute_code(code: str, language: str) -> dict:
    lang = language.lower().replace("c#", "csharp").replace("c++", "cpp")
    config = LANGUAGE_CONFIG.get(lang)
    if not config:
        return {"stdout": "", "stderr": f"Language '{language}' not supported", "passed": False}

    src_path = bin_path = None
    try:
        suffix = config["suffix"]
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode="w", encoding="utf-8") as f:
            f.write(code)
            src_path = f.name

        tmpdir = os.path.dirname(src_path)

        if lang == "java":
            return _run_java(code, src_path, tmpdir)

        if lang == "csharp":
            return _run_csharp(code, src_path)

        if lang in COMPILED_LANGUAGES:
            bin_path = src_path.replace(suffix, "")
            compile_cmd = [
                p.replace("{bin}", bin_path).replace("{src}", src_path)
                for p in config["compile"]
            ]
            comp = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=20)
            if comp.returncode != 0:
                return {"stdout": "", "stderr": comp.stderr or comp.stdout, "passed": False}
            run_cmd = [p.replace("{bin}", bin_path) for p in config["run"]]
        else:
            run_cmd = config["run"] + [src_path]

        result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=10)
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "passed": result.returncode == 0
        }

    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Execution timed out (10s limit)", "passed": False}
    except FileNotFoundError as e:
        tool = str(e).split("'")[1] if "'" in str(e) else str(e)
        return {"stdout": "", "stderr": f"Runtime not installed: {tool}", "passed": False}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "passed": False}
    finally:
        for p in [src_path, bin_path]:
            if p and os.path.exists(p):
                try: os.unlink(p)
                except: pass

def _run_java(code, src_path, tmpdir):
    class_name = _extract_java_class(code)
    java_path = os.path.join(tmpdir, f"{class_name}.java")
    try: os.rename(src_path, java_path)
    except: java_path = src_path

    comp = subprocess.run(["javac", java_path], capture_output=True, text=True, timeout=20)
    if comp.returncode != 0:
        return {"stdout": "", "stderr": comp.stderr, "passed": False}

    result = subprocess.run(["java", "-cp", tmpdir, class_name], capture_output=True, text=True, timeout=10)
    for f in os.listdir(tmpdir):
        if f.endswith(".class"):
            try: os.unlink(os.path.join(tmpdir, f))
            except: pass
    return {"stdout": result.stdout, "stderr": result.stderr, "passed": result.returncode == 0}

def _run_csharp(code, src_path):
    try:
        result = subprocess.run(["dotnet-script", src_path], capture_output=True, text=True, timeout=30)
        return {"stdout": result.stdout, "stderr": result.stderr, "passed": result.returncode == 0}
    except FileNotFoundError:
        try:
            result = subprocess.run(["csc", src_path], capture_output=True, text=True, timeout=20)
            if result.returncode != 0:
                return {"stdout": "", "stderr": result.stderr, "passed": False}
            exe = src_path.replace(".cs", ".exe")
            run = subprocess.run(["mono", exe], capture_output=True, text=True, timeout=10)
            return {"stdout": run.stdout, "stderr": run.stderr, "passed": run.returncode == 0}
        except FileNotFoundError:
            return {"stdout": "", "stderr": "C# runtime not found. Install dotnet-script or mono.", "passed": False}

def _extract_java_class(code):
    for line in code.split("\n"):
        if "public class" in line:
            parts = line.strip().split()
            try:
                idx = parts.index("class")
                return parts[idx + 1].strip("{")
            except: pass
    return "Main"