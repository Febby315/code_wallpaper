$(function(){
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app = window.v_app = new Vue({
        el: "#app",
        data: {
            src: "video/v.mp4",
            flvsrc: "http://hls.yy.com/newlive/22490906_22490906.flv?org=yyweb&appid=0&uuid=85fdb281e4e54dbf9a2ff2408e155ebb&t=1547044198&tk=38368db45ea125b8949344ec7fb42ce6&uid=0&ex_audio=0&ex_coderate=1200&ex_spkuid=0",
            m3u8src: "http://proxy.hls.yy.com/livesystem/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0.m3u8?org=yyweb&uuid=d8cee895f547417d82b0e297118278c5&t=1547044198&tk=09b38b158a6ba249a511d6e81ff9f189",
            content: null,// 视图
            fileInput: document.getElementById("file"),// 文件DOM对象
            videoEle: document.getElementById("video"),// 视频DOM对象
            canvas: document.createElement("canvas"),// 画板DOM对象
            showStats: true,//显示统计信息
            stats: new Stats(),// 性能监视器:含fps、耗时ms、内存分配
            enableCache: !true,// 启用缓存
            cacheFrame:[],// 缓存画面
            enableColor: !true,// 启用输出色彩
            spanTempFn: doT.template('<span style="color:rgb({{=it.R}},{{=it.G}},{{=it.B}});">{{=it.T}}</span>'),//彩色字符画像素模板
            fps: 144,// fps(流畅度)
            fontSize: 7||parseInt($("#view").css("font-size")), lineHeight: 8||parseInt($("#view").css("line-height")),// 视图容器字体大小及行高
            chars: ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'],// 映射字符集
            sw: $(window).width(), sh: $(window).height(),// 存储屏幕宽高(含初始化)
            vw: 0, vh: 0,// 储存视频宽高
            cols: 0,rows: 0, char_w: 0, char_h: 0,// 字符画行列及采集块宽高
        },
        // 动态计算
        computed:{
            // 配置灰度字符映射表
            charMap:function () {
                let map = [], step = ~~(256/(this.chars.length-1));// 映射步长=最大字符长度/映射字符长度
                for (let i=0; i<256; i++) {
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
            // 字符画最大列数
            maxRows:function(){
                return this.sw / this.fontSize;
            },
            // 字符画最大行数
            maxCols:function(){
                return this.sh / this.lineHeight;
            },
            // 画面帧间隔时间ms
            fpsStep: function(){
                return 1000 / this.fps;
            }
        },
        mounted: function () {
            this.$nextTick(function(){
                this.initStats();// 初始化统计工具
                this.initEvent();// 初始化事件
                // this.loadFlv(this.flvsrc);// flv
                // this.loadHls(this.m3u8src);// m3u8
            });// 初始化结束后// 开始位置
        },
        methods: {
            // 加载Flv链接地址
            loadFlv(src, callback){
                if (flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    flvPlayer.attachMediaElement(this.videoEle);
                    flvPlayer.load();
                    callback instanceof Function ? callback(flvPlayer) : null;
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls(src, callback){
                if(Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(src);
                    hls.attachMedia(this.videoEle);
                    callback instanceof Function ? callback(hls) : null;
                }
            },
            // 播放视频
            play(){
                let _this = this, ctx = this.canvas.getContext('2d'), cw = this.canvas.width, ch = this.canvas.height;
                window.timer = setInterval(function (){
                    if(!this.videoEle.paused){
                        ctx.drawImage(this.videoEle, 0, 0, cw, ch);// 将视频当前帧画面绘制至画布
                        this.toChars(ctx, cw, ch, this.update);// 将画布图像数据转换为字符画
                    }
                }.bind(this), this.fpsStep);
            },
            // 播放缓存画面
            playCacheFrame(){
                clearInterval(window.timer);// 清除上个定时器
                let _this = this, cacheFrame = this.cacheFrame, len = cacheFrame.length, index = 0;
                window.timer = setInterval(function (){
                    if(this.enableCache && index<len){
                        this.content = cacheFrame[index];
                        index++;
                        this.$nextTick(this.stats.update.bind(this.stats));
                    }else{
                        clearInterval(window.timer);
                    }
                }.bind(this), this.fpsStep);
            },
            // 重置采集参数
            resetToCharsConfig(){
                let t_rows, t_cols, cw=this.canvas.width, ch=this.canvas.height;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度
                // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
                this.screenScale>this.videoScale ? t_rows=this.maxCols>ch?ch:this.maxCols : t_cols=this.maxRows>cw?cw:this.maxRows;
                this.char_w=this.char_h=t_rows ? ch/t_rows : cw/t_cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
                t_rows ? t_cols=cw/this.char_w : t_rows=ch/this.char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
                this.cols = t_cols, this.rows = t_rows;// 临时数据储存
            },
            // 更新画面
            update(frame, frameData){
                this.content = frame;// 渲染画面
                this.$nextTick(this.stats.update.bind(this.stats));// 触发性能统计
                this.enableCache ? this.cacheFrame.push(frame) : null;// 缓存画面
            },
            // 转换为字符串
            toFrame(frameData, callback){
                let enableColor = this.enableColor, spanTempFn = this.spanTempFn;
                var frameStr = frameData.map(function(v){
                    return v.map(function(op){
                        return enableColor ? spanTempFn(op) : op.T;
                    }).join("");
                }).join("<br/>\n");
                callback instanceof Function ? callback(frameStr) : null;
            },
            // 计算一个像素区域的平均灰度值和灰度映射字符及RGB值对象
            getAvgGray(offset_x, offset_y, w, h,cw,ch, imgDate) {
                let pixels=w*h, R=0, G=0, B=0;// 总像素数,默认RGB色
                let sumGray=0, sumR=0, sumG=0, sumB=0;// 初始化区域总灰度,
                let py, px, idx;
                for (let i=0; i<h; i++) {
                    py = offset_y+i;
                    for (let j=0; j<w; j++){
                        px = offset_x+j, idx = (py*cw+px)*4;// 当前像素坐标位置(原点:左上角)及起始指针位置(每像素由rgba数据组成)
                        R = imgDate[idx]||R, G = imgDate[idx+1]||G, B = imgDate[idx+2]||B;// 获取当前像素RGB值,无效值则取上次记录值或0
                        sumGray+=(R*30 + G*59 + B*11 + 50); sumR+=R; sumG+=G; sumB+=B;// 类似于PS中的RGB通道根据权重计算灰度
                    }
                }
                let avgGray = ~~((sumGray/100)/pixels);// 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                return { Gray: avgGray, T: this.charMap[avgGray], R: ~~(sumR/pixels), G: ~~(sumG/pixels), B: ~~(sumB/pixels) };
            },
            // 图像转字符画
            toChars(ctx, cw, ch, callback) {
                let imgDate = ctx.getImageData(0, 0, cw, ch).data, enableColor = this.enableColor, spanTempFn = this.spanTempFn;// 当前画布图像数据,是否包含配色,字符画模板
                let cols_len = this.cols, rows_len = this.rows ,char_w = this.char_w, char_h = this.char_h;
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                let frameRows = [], rowArray = [];
                for (let r=0; r<rows_len; r++) {
                    let frameCols = [],colArray = [];
                    for (let c=0; c<cols_len; c++) {
                        let op = this.getAvgGray(~~(char_w*c), ~~(char_h*r) , ~~(char_w), ~~(char_h), cw, ch, imgDate);// 获取灰度均值
                        frameCols.push(enableColor ? spanTempFn(op) : op.T);// 启用色彩?渲染色彩模板追加入帧(含色彩,较消耗性能):获取灰度映射字符追加入帧(仅灰度)
                        // colArray.push(op);// 行数据
                    }
                    frameRows.push(frameCols.join(""));
                    // rowArray.push(colArray);// 帧数据
                };
                callback instanceof Function ? callback(frameRows.join("<br/>\n"),rowArray) : null;
            },
            // 初始化统计工具
            initStats(){
                this.stats.domElement.className = "stats";
                this.showStats ? $("body").append(this.stats.domElement) : null;
            },
            // 初始化事件
            initEvent(){
                let _this = v_app;
                // 窗口大小改变
                $(window).on("resize",function(e){
                    _this.sw = $(window).width();
                    _this.sh = $(window).height();// 获取屏幕宽高
                    _this.resetToCharsConfig();
                });
                // 文件更改时修改视频源
                $(this.fileInput).on("change",function(e){
                    window.timer ? clearInterval(window.timer) : null;
                    $(_this.videoEle).prop("src",URL.createObjectURL(this.files[0]));
                    _this.resetToCharsConfig();
                });
                // 视频源meta加载后
                $(this.videoEle).on("loadedmetadata",function(e){
                    let vw =_this.vw= this.videoWidth, vh =_this.vh= this.videoHeight;
                    _this.canvas.width = vw/_this.sw>0.2 ? _this.sw/5 : vw;// 更新画布大小
                    _this.canvas.height = vh*_this.canvas.width/vw;
                    _this.resetToCharsConfig();
                });
                // 开始播放
                $(this.videoEle).on("play",function(e){
                    $("#tool").hide();// 隐藏工具栏
                    _this.cacheFrame = [];// 清除缓存画面
                    setTimeout(_this.play,0);// 开始播放
                });
                // 暂停/结束
                $(this.videoEle).on("pause ended",function(e){
                    e.type=="ended" ? _this.content=null : null;// 结束播放清除视图
                    clearInterval(window.timer);// 视频暂停或结束停止定时器
                    $("#tool").show();// 显示工具栏
                });
            }
        }
    });
});