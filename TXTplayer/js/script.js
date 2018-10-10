

$(function(){
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app = new Vue({
        el: "#app",
        data: {
            content:
                "<div class='help'>" +
                    "字符画显示区域<br>" +
                    "1.目录下start.bat文件<br/>" +
                    "2.点击对话框中'允许'按钮<br/>" +
                    "3.打开浏览器<br/>" +
                    "4.地址栏输入http://127.0.0.1<br/>" +
                    "5.按下<span>回车</span><br/>" +
                    "6.点击选择文件按钮,选择一个mp4文件<br/>" +
                    "7.点击播放/暂停按钮" +
                "</div>",
            jq$fileInput: $("#file"),
            jq$video: $("#video"),
            canvas: document.createElement("canvas"),
            fontSize: 7||parseInt($("#app").css("font-size").replace("px","")), 
            lineHeight: 8||parseInt($("#app").css("line-height").replace("px","")),// 获取容器字体大小&行高
            chars: ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'],
            charMap: {},
            sw: 0, sh: 0,
            vw: 0, vh: 0
        },
        computed:{
            // var videoScale = vw / vh, screenScale = _this.sw / _this.sh; // 判断视频、屏幕方向(宽高比) >1宽屏 =1方屏 <1窄屏
            videoScale: function () {
                return this.vw / this.vh;
            },
            screenScale:function(){
                return this.sw / this.sh;
            }
        },
        mounted: function () {
            // 初始化结束后
            this.$nextTick(function () {
                _this = this;
                _this.getCharsMap(); // 配置灰度字符映射表
                // 开始位置
                _this.sw = $(window).width();
                _this.sh = $(window).height(); // 获取屏幕宽高
                // 窗口大小改变
                $(window).on("resize",function(){
                    _this.sw = $(window).width();
                    _this.sh = $(window).height(); // 获取屏幕宽高
                });
                // 文件更改时修改视频源
                _this.jq$fileInput.on("change",function(){
                    window.timer ? clearInterval(window.timer) : null;
                    _this.jq$video.attr("src",URL.createObjectURL(this.files[0]));
                });
                // 视频源meta加载后
                _this.jq$video.on("loadedmetadata",function(){
                    _this.vw = _this.jq$video.prop("videoWidth");
                    _this.vh = _this.jq$video.prop("videoHeight");
                });
                // 开始播放
                _this.jq$video.on("play",function(){
                    window.timer = setInterval(function () {
                        _this.captureImage(1); // 定时捕获画面并绘制字符画
                    }, 20);// 1000/20=50fps
                });
                // 暂停/结束
                _this.jq$video.on("pause ended",function(){
                    clearInterval(window.timer); // 视频暂停或结束停止定时器
                });
            });
        },
        methods: {
            // 配置灰度字符映射表
            getCharsMap() {
                _this = this;
                var step = parseInt(256/(_this.chars.length-1));  //映射步长=最大字符长度/映射字符长度
                for (var i = 0; i < 256; i++) {
                    _this.charMap[i] = _this.chars[parseInt(i / step)];
                };
                return _this.charMap;
            },
            // 图像转字符画
            toChars(ctx, vw, vh, rowChars) {
                _this = this;
                var frame = "", image = ctx.getImageData(0, 0, vw, vh); //字符画帧数据,当前画布图像数据

                // var zoomScale = _this.screenScale>_this.videoScale ? vh/_this.sh/_this.lineHeight : vw/_this.sw/_this.fontSize; // 获取视频填充缩放比=屏幕宽高比>视频宽高比?高度缩放比:宽度缩放比
                var rows, cols, char_w, char_h, maxRows = _this.sw/_this.fontSize, maxCols = _this.sh/_this.lineHeight;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度、字符画最大列数、字符画最大行数
                _this.screenScale>_this.videoScale ? (rows=maxCols>vh?vh:maxCols) : (cols=maxRows>vw?vw:maxRows); // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
                char_w = char_h = rows ? vh/rows : vw/cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
                rows ? cols=vw/char_w : rows=vh/char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
                // 计算一个像素区域的平均灰度值
                var getAvgGray = function (x, y, w, h, d) {
                    var sumGray = 0, pixels = w * h;
                    for (var r = 0; r < w; r++) {
                        for (var c = 0; c < h; c++) {
                            var cx = x + c, cy = y + r, // 当前像素坐标位置(原点:左上角)
                                idx = (cy * vw + cx) * 4, //当前像素数据起始指针位置(每像素由rgba数据组成)
                                R = d[idx]||128, G = d[idx + 1]||128, B = d[idx + 2]||128,
                                gray = (R*30 + G*59 + B*11 + 50) / 100; //类似于PS中的RGB通道根据权重计算灰度
                            sumGray += gray;
                        }
                    }
                    return sumGray / pixels;
                };
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                for (var r = 0; r < rows; r++) {
                    for (var c = 0; c < cols; c++) {
                        var avgGray = getAvgGray( parseInt(c * char_h), parseInt(r * char_h) , parseInt(char_w), parseInt(char_h), image.data);   //获取灰度均值
                        frame += _this.charMap[ parseInt(avgGray) ];
                    }
                    frame += '<br/>\n';
                };
                return frame;
            },
            // 捕获视频当前帧画面并转化为字符画
            captureImage () {
                var _this = this, canvas = this.canvas;
                canvas.width = _this.vw;
                canvas.height = _this.vh;
                if (_this.vw) {
                    var ctx = canvas.getContext('2d');  //获取画布
                    ctx.clearRect(0, 0, _this.vw, _this.vh);   //清除画布
                    ctx.drawImage(_this.jq$video[0], 0, 0, _this.vw, _this.vh);   //将视频当前帧画面绘制至画布
                    _this.content = _this.toChars(ctx, _this.vw, _this.vh);  //将画布图像转换为字符画
                    // _this.$nextTick(function () {
                    //     console.clear();
                    //     console.error("%c%s","font-family: Courier New; font-size: 12px;line-height:8px;",$("#app").text()); //输出到console
                    // });
                }
            }
        }
    });
});