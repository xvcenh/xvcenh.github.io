# 《吞噬之潮》动漫美术与动作

本版的原画保存在 `masters/`。选鱼、战斗、浏览器和两个应用包共用 `../src/illustrations/` 中的 WebP 图集。重新导出时，在装有 Pillow、NumPy 和 OpenCV 的 Python 环境中运行 `python scripts/pack-art.py art/masters`，工作目录为 `source/`。

| 原画 | 游戏内用途 | 导出 |
| --- | --- | --- |
| fish.png | 蓝潮鲀、刺豚、剑鱼、灯笼鮟鱇、沙丁鱼、电鳗、海马、蝠鲼 | 8 种主角，各 8 帧 |
| wild.png | 游鱼、鲸、水母、鱿鱼和六种迁徙鱼群 | 12 种，各 8 帧 |
| guardians.png | 六片海域的守卫 | 6 种，各 8 帧 |
| props.png | 珊瑚、海草、矿物、浮标、黑匣和培养瓶等 | 16 个透明前景物件 |
| reef、trench、ice、vents、ruins、abyss | 从实验室残骸到深渊的六片海域 | 每区独立高清 WebP，另有一张快速切场图集 |
| cover.png | 标题画面和 T-07 逃离水槽的序幕 | 独立封面 |

## 画面与操作如何配合

海马悬停时小幅上下浮动，电鳗转向时尾部弯得更深，蝠鲼的翼拍较慢。加速和转弯由每条鱼的实际位移和朝向驱动。玩家留下的两股白色尾迹记录已经游过的路径。鱼群背后的青色箭纹表示可以借流，琥珀色虚线表示扫描线即将到达的位置。文字和触控键在动漫滤镜之后绘制。

| 参考 | 从作品与评论提取的观察 | 本作采用的做法 |
| --- | --- | --- |
| 《ABZÛ》 | 美术总监讨论了如何安排水下光照和大量鱼群。GameSpot 的评论尤其提到与鱼群同行的乐趣。 | 鱼群避让并重新聚拢。撞散或救出鱼群后，玩家能沿着它们的尾流避开声呐。[GDC 创作演讲](https://gdcvault.com/play/1024409/Creating-the-Art-of-ABZU) · [GameSpot 评论](https://www.gamespot.com/reviews/abzu-review/1900-6416489/) |
| 《DREDGE》 | PC Gamer 喜欢风险带来的取舍，也批评过难以预判和应对的追击。 | 黑匣扫描提前显示扫向，进入光束会逐步丢失读取进度，离开后还能补回来。[PC Gamer 评论](https://www.pcgamer.com/dredge-review/) |
| 《潜水员戴夫》 | 这款由 MINTROCKET 开发的作品让探索不断引出有用的新目标。 | 救援、回声航道、黑匣分别考验冲撞、路线和停留位置，并把奖品带回吞噬与逃生循环。[PC Gamer 评论](https://www.pcgamer.com/dave-the-diver-review/) |

鱼群的转向参考了邻近个体的避让与速度对齐，另加迁徙目标来控制关卡位置。运行时采用固定步长更新，再绘制插画与特效。[Craig Reynolds 的 Boids](https://www.red3d.com/cwr/boids/) · [Sebastian Lague 的开源实现](https://github.com/SebLague/Boids) · [Game Studio 的 Phaser 2D 开发技能](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/phaser-2d-game/SKILL.md)


## 0.2 游动与追猎

脊柱由七个控制点组成。每节受到前一节的转角、随速度变化的行波和水中阻尼影响。头部固定，海马沿身体竖轴弯尾，鳗鱼的波幅最大。近景用六条连续贴片把同一幅插画贴在脊柱上。远处的小鱼使用八相位图集。

鱼群每步读取一次邻居快照，用局部网格求避让、对齐和聚集。鲨鱼会预判主角的位置，蓄势时显示琥珀色的虚线，扑击开始后方向锁定。玩家可以横穿攻击线或钻进青色尾流。标准键盘长按和触屏摇杆都能在尾流中匹配群速。
