"""Build and sign the offline Android application using the official SDK and JDK."""
import argparse
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "source" / "scripts"))
from stage_web import stage_web


def run(*args, env=None):
    subprocess.run([str(a) for a in args], check=True, env=env)


def windows_credential(data, decrypt=False):
    import ctypes
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [("length", wintypes.DWORD), ("data", ctypes.c_void_p)]
    buffer = ctypes.create_string_buffer(data)
    source, target = Blob(len(data), ctypes.cast(buffer, ctypes.c_void_p)), Blob()
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    transform = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    if not transform(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(target.data, target.length)
    finally:
        ctypes.windll.kernel32.LocalFree(ctypes.c_void_p(target.data))


def private_key(keytool, env):
    override = env.get("DT_KEYSTORE")
    if override:
        if not env.get("DT_STORE_PASS"):
            raise ValueError("Supply DT_STORE_PASS for the provided PKCS12 keystore")
        return Path(override), env.get("DT_KEY_ALIAS", "devourtide")
    if os.name != "nt":
        raise ValueError("Set DT_KEYSTORE, DT_STORE_PASS and DT_KEY_ALIAS for signing")
    folder = Path(env["LOCALAPPDATA"]) / "DevourTide" / "signing"
    folder.mkdir(exist_ok=True, parents=True)
    store, credential = folder / "devourtide.p12", folder / "credential.dpapi"
    if credential.is_file():
        env["DT_STORE_PASS"] = windows_credential(credential.read_bytes(), decrypt=True).decode()
    else:
        if store.exists():
            raise RuntimeError("Existing signing key requires its original password")
        env["DT_STORE_PASS"] = secrets.token_urlsafe(36)
        credential.write_bytes(windows_credential(env["DT_STORE_PASS"].encode()))
    if not store.exists():
        run(keytool, "-genkeypair", "-storetype", "PKCS12", "-keystore", store,
            "-alias", "devourtide", "-keyalg", "RSA", "-keysize", "3072", "-validity", "10000",
            "-dname", "CN=Devour Tide Game", "-storepass:env", "DT_STORE_PASS",
            "-keypass:env", "DT_STORE_PASS", env=env)
    return store, "devourtide"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    sdk = Path(env.get("ANDROID_HOME") or env.get("ANDROID_SDK_ROOT") or
               str(Path(env.get("LOCALAPPDATA", ".")) / "Android" / "Sdk"))
    java_home = Path(env.get("DT_JAVA_HOME") or env.get("JAVA_HOME") or
                     "C:/Program Files/Android/Android Studio/jbr")
    if os.name=="nt" and not (java_home/"bin"/"javac.exe").exists():
        java_home = Path("C:/Program Files/Android/Android Studio/jbr")
    ext = ".exe" if os.name == "nt" else ""
    java = java_home / "bin" / ("java"+ext)
    javac = java_home / "bin" / ("javac"+ext)
    bt = sdk / "build-tools" / env.get("DT_BUILD_TOOLS", "36.1.0")
    platform = sdk / "platforms" / "android-36" / "android.jar"
    store, alias = private_key(java_home / "bin" / ("keytool"+ext), env)
    with tempfile.TemporaryDirectory(prefix="devour-apk-") as work:
        tmp = Path(work)
        assets, classes, dex = (tmp / n for n in ("assets", "classes", "dex"))
        stage_web(assets)
        classes.mkdir(); dex.mkdir()
        shutil.copytree(ROOT/"res", tmp/"res")
        shutil.copytree(ROOT/"src", tmp/"src")
        shutil.copyfile(ROOT/"AndroidManifest.xml", tmp/"AndroidManifest.xml")
        run(bt / ("aapt2"+ext), "compile", "--dir", tmp/"res", "-o", tmp/"res.zip")
        run(bt / ("aapt2"+ext), "link", "-o", tmp/"base.apk", "-I", platform, "--manifest",
            tmp/"AndroidManifest.xml", "-A", assets, tmp/"res.zip")
        run(javac, "-encoding", "UTF-8", "-source", "8", "-target", "8", "-classpath", platform,
            "-d", classes, *sorted((tmp/"src").rglob("*.java")))
        with zipfile.ZipFile(tmp/"classes.jar", "w") as archive:
            for f in classes.rglob("*.class"):
                archive.write(f, f.relative_to(classes))
        run(java, "-cp", bt/"lib"/"d8.jar", "com.android.tools.r8.D8", "--min-api", "26",
            "--lib", platform, "--output", dex, tmp/"classes.jar")
        with zipfile.ZipFile(tmp/"base.apk") as resources, zipfile.ZipFile(tmp/"compiled.apk","w") as archive:
            for entry in resources.infolist():
                archive.writestr(entry.filename,resources.read(entry),compress_type=entry.compress_type)
            for f in dex.glob("*.dex"):
                archive.write(f, f.name, zipfile.ZIP_DEFLATED)
        run(bt/("zipalign"+ext), "-f", "-p", "4", tmp/"compiled.apk", tmp/"aligned.apk")
        signer = bt/"lib"/"apksigner.jar"
        run(java, "-jar", signer, "sign", "--ks", store, "--ks-key-alias", alias,
            "--ks-pass", "env:DT_STORE_PASS", "--key-pass", "env:DT_STORE_PASS",
            "--v4-signing-enabled", "false", "--out", tmp/"signed.apk", tmp/"aligned.apk", env=env)
        run(java, "-jar", signer, "verify", "--verbose", tmp/"signed.apk")
        run(bt/("zipalign"+ext), "-c", "-p", "4", tmp/"signed.apk")
        shutil.copyfile(tmp/"signed.apk", output)
    print(f"{output.name} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
