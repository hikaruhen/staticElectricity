# 電荷實驗室 v6.3

正式網站：https://hikaruhen.github.io/staticElectricity/

- 選模式不再自動進入fullscreen或鎖定方向。只有明確按全螢幕按鈕才請求；初始橫向stage保留。
- 毛衣／氣球電子約0.28秒一顆，只有實際接觸摩擦才轉移，不積欠queue。分離立即取消未完成轉移並回復電荷，不跨空氣追球。
- 接觸停著不會持續生電子；隱藏、換模式或重設取消未完成的一顆，恢復後需再摩擦。

保留紅粗庫倫力、正負實作測驗、目標金屬導體球旁的淨電量，以及旋轉觸控與轉向狀態保存。
模式：靜電、摩擦起電、自由操作起電、庫倫定律、測驗模式。
網站僅index.html、style.css、app.js、explore.js、workbench.js、shell.js。教材、私有QA、備份不在產物中；動畫及物理數量為教學示意。
課程參考：05-115國中自然3上備課ch4-理化，第4-1節。
互動參考：https://phet.colorado.edu/zh_TW/simulations/balloons-and-static-electricity
