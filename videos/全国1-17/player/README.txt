题目讲解 · 逐步播放器
quad-pyramid-dihedral

启动（必须走 http，不能直接双击 index.html）：

  npm run serve:player

然后打开 http://localhost:8080/

注意：不要用 python3 -m http.server。它不支持 Range 请求，
浏览器无法 seek 音频，会表现为「画面在走、声音不动」——
看起来像播放器坏了，其实问题在服务端。

界面：
  顶部可切换「带配音 / 不带配音」，两条不同的时间线。
  右侧是全部步骤，点一下即跳到该步骤第一句被念出的那一帧。
  快捷键：← 上一步   → 下一步   空格 播放/暂停   Home 回到开头

放到网上（GitHub Pages / 任意静态托管）：把这个目录整个传上去即可，
index.html 用的是相对路径。可分享的深链接：
  ?f=<帧号>          落在某一帧
  ?mode=silent       直接打开无配音版

注意：本次构建没有 FPS 测量过的音轨，所以「带配音」用的是和静默版一样的时间线
（也就是你在 MP4 里看到的那条）。要真配音，先跑 npm run tts 生成 narration/ 与音轨。
