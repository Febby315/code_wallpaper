$(function(){
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app = new Vue({
        el: "#app",
        data: {
            content: null,
            fileInput: document.getElementById("file"),
            video: document.getElementById("video"),
            canvas: document.createElement("canvas"),
            fontSize: 7||~~($("#view").css("font-size").replace("px","")), 
            lineHeight: 8||~~($("#view").css("line-height").replace("px","")),// 获取容器字体大小&行高
            chars: ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'],
            sw: $(window).width(), sh: $(window).height(),// 获取初始屏幕宽高
            vw: 0, vh: 0
        },
        computed:{
            // 配置灰度字符映射表
            charMap:function () {
                var map = [], step = ~~(256/(this.chars.length-1));  // 映射步长=最大字符长度/映射字符长度
                for (var i = 0; i < 256; i++) {
                    map[i] = this.chars[~~(i / step)];
                };
                return map;
            },
            // 判断视频、屏幕方向(宽高比) >1宽屏 =1方屏 <1窄屏
            // 视频宽高比
            videoScale: function () {
                return this.vw / this.vh;
            },
            // 屏幕宽高比
            screenScale:function(){
                return this.sw / this.sh;
            },
            // 字符画最大列数、
            maxRows:function(){
                return this.sw / this.fontSize
            },
            // 字符画最大行数
            maxCols:function(){
                return this.sh / this.lineHeight;
            }
        },
        mounted: function () {
            // 初始化结束后// 开始位置
            this.$nextTick(function () {
                _this = this;
                // 窗口大小改变
                $(window).on("resize",function(){
                    _this.sw = $(window).width();
                    _this.sh = $(window).height(); // 获取屏幕宽高
                });
                // 文件更改时修改视频源
                $(_this.fileInput).on("change",function(){
                    window.timer ? clearInterval(window.timer) : null;
                    $(_this.video).attr("src",URL.createObjectURL(this.files[0]));
                });
                // 视频源meta加载后
                $(_this.video).on("loadedmetadata",function(){
                    _this.vw = _this.video.videoWidth;
                    _this.vh = _this.video.videoHeight;
                    _this.canvas.width = _this.vw; _this.canvas.height = _this.vh;  // 更新画布大小
                });
                // 开始播放
                $(_this.video).on("play",function(){
                    $("#tool").hide();  // 隐藏工具栏
                    setTimeout(function(){
                        window.timer = setInterval(function () {
                            _this.captureImage(_this.canvas.getContext('2d')); // 定时捕获画布画面并绘制字符画
                        }, 34);// 1000/34=29.41fps
                    },1000);
                });
                // 暂停/结束
                $(_this.video).on("pause ended",function(){
                    clearInterval(window.timer); // 视频暂停或结束停止定时器
                    _this.content = null;
                    setTimeout(function () {
                        $("#tool").show();  // 1秒后还原工具栏
                    },1000);
                });
            });
        },
        methods: {
            // 图像转字符画
            toChars(ctx, vw, vh) {
                _this = this;
                var frame = "", image = ctx.getImageData(0, 0, vw, vh); // 字符画帧数据,当前画布图像数据
                var rows, cols, char_w, char_h;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度
                _this.screenScale>_this.videoScale ? (rows=_this.maxCols>vh?vh:_this.maxCols) : (cols=_this.maxRows>vw?vw:_this.maxRows); // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
                char_w = char_h = rows ? vh/rows : vw/cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
                rows ? cols=vw/char_w : rows=vh/char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
                // 计算一个像素区域的平均灰度值
                var getAvgGray = function (offset_x, offset_y, w, h, imgDate) {
                    var sumGray = 0, pixels = w * h, R = 0, G = 0, B = 0 ; // 初始化区域总灰度,总像素数,默认RGB色
                    for (var i = 0; i < h; i++) {
                        for (var j = 0; j < w; j++) {
                            var cy = offset_y + i, cx = offset_x + j, // 当前像素坐标位置(原点:左上角)
                                idx = (cy * vw + cx) * 4; // 当前像素数据起始指针位置(每像素由rgba数据组成)
                            R = imgDate[idx]||R, G = imgDate[idx+1]||G, B = imgDate[idx+2]||B;    // 获取当前像素RGB值,无效值则取上次记录值或0
                            sumGray += (R*30 + G*59 + B*11 + 50) ; // 类似于PS中的RGB通道根据权重计算灰度
                        }
                    }
                    return (sumGray / 100) / pixels;    // 获取区域平均灰度 为提高效率将单像素灰度计算中的除以100提出
                };
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                for (var r = 0; r < rows; r++) {
                    for (var c = 0; c < cols; c++) {
                        var avgGray = getAvgGray( ~~(char_w*c), ~~(char_h*r) , ~~(char_w), ~~(char_h), image.data); // 获取灰度均值
                        frame += _this.charMap[ ~~(avgGray) ];  // 获取灰度映射字符追加入帧
                    }
                    frame += '<br/>\n'; // 帧数据行尾追加换行
                };
                return frame;
            },
            // 捕获视频当前帧画面并转化为字符画帧数据
            captureImage (ctx) {
                var _this = this;
                ctx.clearRect(0, 0, _this.vw, _this.vh); // 清除画布
                ctx.drawImage(_this.video, 0, 0, _this.vw, _this.vh); // 将视频当前帧画面绘制至画布
                _this.content = _this.toChars(ctx, _this.vw, _this.vh); // 将画布图像转换为字符画
            }
        }
    });
});