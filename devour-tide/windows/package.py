"""Build the Windows x64 portable distribution. Supply an optional cached SDK nupkg."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from urllib.request import urlopen
import zipfile

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/"source"/"scripts"))
from stage_web import stage_web

SDK_VERSION="1.0.4314.35"
SDK_SHA256="90778deb1b77e36292828b4b5833c9255c27533f40e0ddd55891ae718944edc4"
DISTRIBUTABLES=["lib/net462/Microsoft.Web.WebView2.Core.dll", "lib/net462/Microsoft.Web.WebView2.WinForms.dll",
    "runtimes/win-x64/native/WebView2Loader.dll", "LICENSE.txt"]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output",type=Path)
    parser.add_argument("--sdk",type=Path)
    args=parser.parse_args()
    args.output.parent.mkdir(exist_ok=True,parents=True)
    compiler=Path(os.environ["WINDIR"])/"Microsoft.NET"/"Framework64"/"v4.0.30319"/"csc.exe"
    with tempfile.TemporaryDirectory(prefix="devour-windows-") as work:
        tmp=Path(work); app=tmp/"Devour-Tide"; app.mkdir()
        package=args.sdk or tmp/"webview2.nupkg"
        if not args.sdk:
            url=f"https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/{SDK_VERSION}/microsoft.web.webview2.{SDK_VERSION}.nupkg"
            with urlopen(url,timeout=45) as response, package.open("wb") as f:
                shutil.copyfileobj(response,f)
        if hashlib.sha256(package.read_bytes()).hexdigest()!=SDK_SHA256:
            raise ValueError("WebView2 SDK checksum mismatch")
        with zipfile.ZipFile(package) as z:
            for item in DISTRIBUTABLES:
                (app/Path(item).name).write_bytes(z.read(item))
        stage_web(app/"game")
        subprocess.run([str(compiler),"/nologo","/utf8output","/codepage:65001","/target:winexe","/platform:x64",
            "/optimize+","/r:System.Windows.Forms.dll","/r:System.Drawing.dll",
            "/r:"+str(app/"Microsoft.Web.WebView2.Core.dll"),"/r:"+str(app/"Microsoft.Web.WebView2.WinForms.dll"),
            "/win32icon:"+str(ROOT/"tide.ico"),"/win32manifest:"+str(ROOT/"app.manifest"),
            "/out:"+str(app/"DevourTide.exe"),str(ROOT/"DiveWindow.cs")],check=True)
        with zipfile.ZipFile(args.output,"w",zipfile.ZIP_DEFLATED,compresslevel=7) as z:
            for f in sorted(app.rglob("*")):
                if f.is_file(): z.write(f,f.relative_to(tmp))
        print(args.output.name,args.output.stat().st_size)

if __name__=="__main__":
    main()
