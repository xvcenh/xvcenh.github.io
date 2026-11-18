# 动漫版 0.2.0 构建

网页版、Android 和 Windows 使用同一份 Phaser 3 游戏代码。Android 应用的游戏文件随 APK 安装，Windows 版使用本机 WebView2 Runtime 读取随包文件。进度保存在每个应用自己的本地存储中。

在 `source/` 执行以下命令。Vite 在上一级目录生成博客所需的网页入口和资源。

```shell
npm ci
npm run build
python scripts/stage_web.py PATH_TO_WEB_DIRECTORY
node scripts/standalone.mjs PATH_TO_OFFLINE_HTML
```

在本文件所在目录打包。

```shell
python android/package.py Devour-Tide-0.2.0.apk
python windows/package.py Devour-Tide-Windows-x64.zip
```

Android 构建使用 JDK、SDK Platform 36 与 Build Tools 36.1.0。可用 `ANDROID_HOME` 和 `DT_JAVA_HOME` 指定工具位置。Windows 上首次构建会在当前用户的 LocalAppData 下创建 `DevourTide/signing`，后续构建自动复用同一把签名密钥。已有发布签名时，用 `DT_KEYSTORE` 指向 PKCS12，并通过 `DT_KEY_ALIAS` 和 `DT_STORE_PASS` 提供凭据。升级版本时同时更新清单的版本号与打包文件名。

Windows 构建使用系统 .NET Framework 4.x 编译器和固定版本的 Microsoft WebView2 SDK。打包脚本会校验下载内容。可用 `--sdk PATH_TO_NUPKG` 复用同版本的本地 NuGet 包。解压后运行 `DevourTide.exe`。浏览器离线文件可在桌面端直接打开。

有关游戏的源图、导出规格、游动模型和设计出处，见[美术与动作](source/art/README.md)。

回归测试在 `source/` 运行 `npx playwright install chromium`，启动开发服务器后执行 `npm run test:game`。要测试已部署的构建，可以用 `DT_URL` 指向带有 `?debug=1` 的游戏地址。

运行 `npm run test:physics` 可离线验证脊柱、多更新频率、鱼群、扑击、碰撞和存档，并测量 80、320、1000 条鱼的转向耗时。
