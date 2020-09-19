# 好玩的字符画播放器 CharPlayer

## 1. 说明

    该项目是将图片及视频以字符画的方式呈现
    是抖音比较火爆的特效
    基于个人爱好开发分享给爱折腾的小伙伴们

### 1.1 技术说明

|引用库|库说明|引用说明|备注|
|-|-|-|-|
|[vue](https://github.com/vuejs/vue)|虚拟DOM框架|加快dom渲染及内部变量间联动控制|核心代码|
|[js-url](https://github.com/websanova/js-url)|url解析|url参数解析使用||
|[stats.js](https://github.com/mrdoob/stats.js)|性能监视器|监视运行时(帧率/帧耗时/内存)情况||
|[hls.js](https://github.com/video-dev/hls.js)|直播流解析|对m3u8直播流的解析支持||
|[flv.js](https://github.com/Bilibili/flv.js)|flv解码|对flv文件及直播流的解析支持||
|[dot](https://github.com/olado/doT)|js模板引擎|利用模板加快数据帧数据生成||
|[libgif](https://github.com/buzzfeed/libgif-js)|GIF解析器和播放器|对gif动画效果的解析支持||
|[inferno](https://github.com/infernojs/inferno)|虚拟DOM框架|利用该框架的高性能差异化渲染|供渲染方法五使用|
|[inferno-create-element](https://github.com/infernojs/inferno)|inferno扩展|方便inferno的节点创建||

### 1.2 github开源地址

> <https://github.com/Febby315/code_wallpaper/tree/master/TXTplayer/v3>

### 1.3 预览地址

> <https://g.febby315.top/TXTplayer/v3/index.html>

#### 1.2.1 默认效果预览

#### 1.2.2 全特效预览

### 1.4 使用说明

#### 1.4.1 URL参数说明

|参数|默认值|说明|备注|
|-|-|-|-|
|src|video/v.mp4|图片/视频uri地址|uri编码后的字符串|
|showStats|空|显示(帧率、耗时、内存)性能信息||
|enableColor|空|启用颜色|该特效会严重影响性能|
|enableReverse|空|反转前景与背景色|目前不美观|
|className|空|启用内置的特效|目前仅支持(shadow、reverse)
|style|空|额外的样式|经过JSON.stringify&的对象字符串|

> 注意: src参数不支持跨域资源但支持flv、m3u8直播链接
> src和style参数都需要编码为uri参数

#### 1.4.2 示例地址

```js
  // 外部图片源(需要经过uri编码)
  var imgSrc = decodeURIComponent('https://i.loli.net/2019/09/02/yOHcCG7XlFVv4M5.png');
  // 自定义样式(先经过JSON字符序列化再经过uri编码)
  var style = decodeURIComponent(JSON.stringify({ transform: 'scale(-0.8)' }));
  // 阴影&性能信息
  var url = `https://g.febby315.top/TXTplayer/v3/?className=shadow&showStats=1`;
  // 彩色&外链图片:
  var url = `https://g.febby315.top/TXTplayer/v3/?enableColor=1&src=${imgSrc}`;
  // 反转色彩&自定义样式
  var url = `https://g.febby315.top/TXTplayer/v3/?enableReverse=1&style=${style}`;
```

#### 1.4.3 支持格式

- [x] 图片: (.jpg|.jpeg|.png|.gif)
- [x] 视频: (.mp4|.ogg|.webp|.flv)
- [x] 直播链接: (.flv|.m3u8)
