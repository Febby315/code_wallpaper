window.RAF = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 17);
    };
$(function(){
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app =window.v_app= new Vue({
        el: "#app",
        data: {
            content: null,
            fileInput: document.getElementById("file"),
            video: document.getElementById("video"),
            canvas: document.createElement("canvas"),
            stats: new Stats(),
            cacheFrame:[],//缓存画面
            fontSize: 7||~~($("#view").css("font-size").replace("px","")), 
            lineHeight: 8||~~($("#view").css("line-height").replace("px","")),// 获取容器字体大小&行高
            chars: ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'],
            sw: $(window).width(), sh: $(window).height(),// 获取初始屏幕宽高
            vw: 0, vh: 0,// 储存视频宽高
            cols: 0,rows: 0, char_w: 0, char_h: 0,// 字符画行列及采集块宽高
            hasColor: false,// 是否输出色彩
            spanTempFn : doT.template('<span style="color:rgb({{=it.R}},{{=it.G}},{{=it.B}});">{{=it.T}}</span>')   //字符画像素模板
        },
        // 动态计算
        computed:{
            // 配置灰度字符映射表
            charMap:function () {
                let map = [], step = ~~(256/(this.chars.length-1));// 映射步长=最大字符长度/映射字符长度
                for (let i = 0; i < 256; i++) {
                    map[i] = this.chars[~~(i / step)];
                };
                return map;
            },
            // 视频宽高比
            videoScale: function () {
                return this.vw / this.vh;// 判断视频、屏幕方向(宽高比) >1宽屏 =1方屏 <1窄屏
            },
            // 屏幕宽高比
            screenScale:function(){
                return this.sw / this.sh;
            },
            // 字符画最大列数、
            maxRows:function(){
                return this.sw / this.fontSize;
            },
            // 字符画最大行数
            maxCols:function(){
                return this.sh / this.lineHeight;
            }
        },
        mounted: function () {
            // 初始化结束后// 开始位置
            this.$nextTick(this.init);
        },
        methods: {
            // 初始化
            init(){
                this.stats.domElement.style.position = 'absolute';
                this.stats.domElement.style.left = '0px';
                this.stats.domElement.style.top = '0px';
                document.body.appendChild( this.stats.domElement );
                this.initEvent();
            },
            // 初始化事件
            initEvent(){
                let _this = this;
                // 窗口大小改变
                $(window).on("resize",function(e){
                    _this.sw = $(window).width();
                    _this.sh = $(window).height();// 获取屏幕宽高
                    _this.resetToCharsConfig();
                });
                // 文件更改时修改视频源
                $(_this.fileInput).on("change",function(e){
                    window.timer ? clearInterval(window.timer) : null;
                    $(_this.video).attr("src",URL.createObjectURL(this.files[0]));
                    _this.resetToCharsConfig();
                });
                // 视频源meta加载后
                $(_this.video).on("loadedmetadata",function(e){
                    let vw =_this.vw= this.videoWidth, vh =_this.vh= this.videoHeight;
                    _this.canvas.width = vw/_this.sw>0.2 ? _this.sw/5 : vw;// 更新画布大小
                    _this.canvas.height = vh*_this.canvas.width/vw;
                    _this.resetToCharsConfig();
                });
                // 开始播放
                $(_this.video).on("play",function(e){
                    $("#tool").hide();// 隐藏工具栏
                    setTimeout(_this.play,0);
                    this.cacheFrame = [];// 清除缓存画面
                });
                // 暂停/结束
                $(_this.video).on("pause ended",function(e){
                    e.type=="ended" ? _this.content=null : null;
                    clearInterval(window.timer);// 视频暂停或结束停止定时器
                    setTimeout(function(){
                        $("#tool").show();
                    },1000);// 1秒后还原工具栏
                });
            },
            // 更新画面
            update(frame,frameData){
                // TODO canvas 双缓冲减少卡顿
                this.cacheFrame.push(frame);// 缓存画面
                this.content = frame;//渲染画面
                this.stats.update();
            },
            // 播放缓存画面
            playCacheFrame(){
                let cacheFrame = this.cacheFrame, playCacheFrameIndex = 0, len = cacheFrame.length;
                window.timer = setInterval(function (){
                    if(playCacheFrameIndex>len){
                        this.content = cacheFrame[playCacheFrameIndex];
                        this.stats.update();
                        playCacheFrameIndex++;
                    }else{
                        clearInterval(window.timer);
                    }
                }.bind(this), 34);// 1000/34=29.41fps
            },
            // 重置采集参数
            resetToCharsConfig(){
                let t_rows, t_cols, cw=this.canvas.width, ch=this.canvas.height;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度
                // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
                this.screenScale>this.videoScale ? t_rows=this.maxCols>ch?ch:this.maxCols : t_cols=this.maxRows>cw?cw:this.maxRows
                this.char_w=this.char_h=t_rows ? ch/t_rows : cw/t_cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
                t_rows ? t_cols=cw/this.char_w : t_rows=ch/this.char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
                this.cols = t_cols, this.rows = t_rows;// 临时数据储存
            },
            // 计算一个像素区域的平均灰度值和灰度映射字符及RGB值对象
            getAvgGray(offset_x, offset_y, w, h,cw,ch, imgDate) {
                let pixels=w*h, R=0, G=0, B=0;// 总像素数,默认RGB色
                let sumGray=0, sumR=0, sumG=0, sumB=0;// 初始化区域总灰度,
                let py, px, idx;
                for (let i=0; i < h; i++) {
                    py = offset_y+i;
                    for (let j=0; j < w; j++){
                        px = offset_x+j, idx = (py*cw+px)*4;// 当前像素坐标位置(原点:左上角)及起始指针位置(每像素由rgba数据组成)
                        R = imgDate[idx]||R, G = imgDate[idx+1]||G, B = imgDate[idx+2]||B;// 获取当前像素RGB值,无效值则取上次记录值或0
                        sumGray+=(R*30 + G*59 + B*11 + 50); sumR+=R; sumG+=G; sumB+=B;// 类似于PS中的RGB通道根据权重计算灰度
                    }
                }
                let avgGray = ~~((sumGray/100)/pixels);// 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                return { Gray: avgGray, T: this.charMap[avgGray], R: ~~(sumR/pixels), G: ~~(sumG/pixels), B: ~~(sumB/pixels) };
            },
            // 转换为字符串
            toFrame(frameData, callback){
                let hasColor = this.hasColor, spanTempFn = this.spanTempFn;
                var frameStr = frameData.map(function(v){
                    return v.map(function(op){
                        return hasColor ? spanTempFn(op) : op.T;
                    }).join("");
                }).join("<br/>\n");
                callback(frameStr);
            },
            // 图像转字符画
            toChars(ctx, cw, ch, callback) {
                let imgDate = ctx.getImageData(0, 0, cw, ch).data, hasColor = this.hasColor, spanTempFn = this.spanTempFn;// 当前画布图像数据,是否包含配色,字符画模板
                let cols_len = this.cols, rows_len = this.rows ,char_w = this.char_w, char_h = this.char_h;
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                let frameRows = [], rowArray = [];
                for (let r=0; r<rows_len; r++) {
                    let frameCols = [],colArray = [];
                    for (let c=0; c<cols_len; c++) {
                        let op = this.getAvgGray(~~(char_w*c), ~~(char_h*r) , ~~(char_w), ~~(char_h), cw, ch, imgDate);// 获取灰度均值
                        frameCols.push(hasColor ? spanTempFn(op) : op.T);// 获取灰度映射字符追加入帧(仅灰度):获取灰度映射字符追加入帧(含色彩,较消耗性能)
                        colArray.push(op);
                    }
                    frameRows.push(frameCols.join(""));
                    rowArray.push(colArray);
                };
                callback(frameRows.join("<br/>\n"),rowArray);
            },
            // 播放视频
            play(){
                var _this = this;
                let ctx = this.canvas.getContext('2d'), cw = this.canvas.width, ch = this.canvas.height;
                window.timer = setInterval(function (){
                    ctx.clearRect(0, 0, cw, ch); // 清除画布
                    ctx.drawImage(this.video, 0, 0, cw, ch);// 将视频当前帧画面绘制至画布
                    this.toChars(ctx, cw, ch, this.update);// 将画布图像数据转换为字符画
                }.bind(this), 17);// 1000/34=29.41fps
                // let loop = function loop(e){
                //     if (!_this.video.paused) {
                //         ctx.drawImage(_this.video, 0, 0, cw, ch);// 将视频当前帧画面绘制至画布 
                //         _this.toChars(ctx, cw, ch, _this.update);// 将画布图像数据转换为字符画
                //         window.RAF(loop);
                //     }
                // }
                // window.RAF(loop);
            }
        }
    });
});