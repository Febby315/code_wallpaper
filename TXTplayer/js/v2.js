$(function(){
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v_app = window.v_app = new Vue({
        el: "#app",
        data: {
            src: "video/v2.mp4",
            flvsrc: "http://aliyun-flv.yy.com/live/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-96597708953498332-96597708953498333-2-2748477-33.flv?codec=orig&secret=bec0e1c80fad166895855545ff4efc89&t=1562310185&appid=15013",
            m3u8src: "http://proxy.hls.yy.com/livesystem/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0.m3u8?org=yyweb&uuid=d8cee895f547417d82b0e297118278c5&t=1547044198&tk=09b38b158a6ba249a511d6e81ff9f189",
            content: null,// 视图html内容
            viewEle: document.getElementById("view"),//视图DOM节点
            fileInput: document.getElementById("file"),// 文件DOM节点
            videoEle: document.getElementById("video"),// 视频DOM节点
            canvas: document.createElement("canvas"),// 画板DOM节点
            range: document.createRange(),// 用于通过TagString创建虚拟dom(DocumentFragment)节点
            showStats: !true,//显示统计信息
            stats: null,// 性能监视器:含fps、耗时ms、内存分配
            enableCache: !true,// 启用缓存
            cacheFrame:[],// 缓存画面
            enableColor: !true,// 启用输出色彩
            reverseColor: true,// 启用反色
            spanTempFn: doT.template('<span style="color:rgb({{=it.R}},{{=it.G}},{{=it.B}});">{{=it.T}}</span>'),//彩色字符画像素模板
            fps: 60,// fps(流畅度)
            fontSize: 7||parseInt($("#view").css("font-size")), lineHeight: 8||parseInt($("#view").css("line-height")),// 视图容器字体大小及行高
            chars: ['&nbsp;', '·', ':', 'i', 't', 'd', 'k', 'w', '$', '@'],// 映射字符集
            sw: $(window).width(), sh: $(window).height(),// 存储屏幕宽高(含初始化)
            vw: 0, vh: 0,// 储存视频宽高
            cols: 0,rows: 0, char_w: 0, char_h: 0,// 字符画行列及采集块宽高,
            currTempFn: null,
            frameData: [],
        },
        // 动态计算
        computed:{
            // 配置灰度字符映射表
            charMap:function () {
                let _this = this;
                let len = 256, step = ~~(len/(this.chars.length-1));// 映射步长=最大字符长度/映射字符长度
                return new Array(len).fill(0).map(function(v,i,c){
                    return _this.chars[~~(i / step)];
                });
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
            },
            // 实时生成行模板
            rowTempFn: function(){
                let cols = this.cols, enableColor = this.enableColor ,templates = [];
                for(let i=0;i<cols;i++){
                    if(!enableColor){
                        templates.push('{{=it['+i+'].T}}');
                    }else{
                        templates.push('<span style="color:rgb({{=it['+i+'].R}},{{=it['+i+'].G}},{{=it['+i+'].B}});">{{=it['+i+'].T}}</span>');
                    }
                }
                return doT.template(templates.join(''));
            },
        },
        mounted: function () {
            this.$nextTick(function(){
                this.initStats();// 初始化统计工具
                this.initEvent();// 初始化事件
                this.src = purl().param("src")||"video/v2.mp4";
                // this.src = this.flvsrc;// flv
                // this.src = this.m3u8src;// m3u8
            }); // 初始化结束后// 开始位置
        },
        // 数据监听
        watch: {
            src: function(nv, ov){
                let _this = this;
                let video = this.$refs.video;
                var ext = purl(nv).attr("file").split(".").pop();
                switch(ext){
                    case "flv": _this.loadFlv(nv); break;
                    case "m3u8": _this.loadHls(nv); break;
                    default: video.src = nv; break;
                }
                this.$nextTick(function(){
                    this.$refs.video.load();
                });
            },
            content: function(nv, ov){
                this.enableCache ? this.cacheFrame.push(nv) : null;// 缓存画面
            },
            enableColor: function(nv, ov){
                this.resetToCharsConfig();
            }
        },
        methods: {
            // 加载Flv链接地址
            loadFlv: function(src, callback){
                let video = this.$refs.video;
                if (flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                    // flvPlayer.play();
                    callback instanceof Function ? callback(flvPlayer) : null;
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls: function(src, callback){
                let video = this.$refs.video;
                if(Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(src);
                    hls.attachMedia(video);
                    callback instanceof Function ? callback(hls) : null;
                }
            },
            // 实时生成帧模板
            frameTempFn: function(rows, cols){
                let _this = this, enableColor = this.enableColor, templates = [];
                for(let i=0;i<rows;i++){
                    for(let j=0;j<cols;j++){
                        if(!enableColor){
                            templates.push('{{=it['+i+']['+j+'].T}}');
                        }else{
                            templates.push('<span style="color:rgb({{=it['+i+']['+j+'].R}},{{=it['+i+']['+j+'].G}},{{=it['+i+']['+j+'].B}});">{{=it['+i+']['+j+'].T}}</span>');
                        }
                    }
                    templates.push('<br/>\n');
                }
                return doT.template(templates.join(''));
            },
            // 播放缓存画面
            playCacheFrame: function(){
                clearInterval(window.timer);// 清除上个定时器
                let _this = this, cacheFrames = _this.cacheFrame, len = cacheFrames.length, index = 0;
                window.timer = setInterval(function (){
                    if(_this.enableCache && index<len){
                        _this.content = cacheFrames[index];
                        index++;
                    }else{
                        clearInterval(window.timer);
                    }
                }.bind(this), _this.fpsStep);
            },
            // 重置采集参数
            resetToCharsConfig: function(){
                let fontSize = parseInt($("#view").css("font-size"));
                let zoomScale = 0.2;
                if(this.videoScale>this.screenScale){
                    zoomScale = this.vh/~~(this.sh/fontSize);
                }else{
                    zoomScale = this.vw/~~(this.sw/fontSize);
                }
                // let rows = ~~(this.sh/fontSize), cols = ~~(this.sw/fontSize);
                // $("#view").css({"font-size":fontSize+1,lineHeight:fontSize+1});
                let t_rows, t_cols, cw=this.canvas.width, ch=this.canvas.height;// 字符画行数(高度)、字符画列数(宽度)、灰度采集块宽度、灰度采集块高度
                // 根据视频、屏幕宽高比比值决定通过高度自适应或宽度自适应获得字符画宽度或高度
                this.screenScale>this.videoScale ? t_rows=this.maxCols>ch?ch:this.maxCols : t_cols=this.maxRows>cw?cw:this.maxRows;
                this.char_w=this.char_h=t_rows ? ch/t_rows : cw/t_cols;// 灰度采集块宽高 = 视频高度/字符画高度||视频宽度/字符画宽度
                t_rows ? t_cols=cw/this.char_w : t_rows=ch/this.char_h;// 字符画高度存在时计算字符画宽度否则计算字符画高度
                this.cols = t_cols, this.rows = t_rows;// 临时数据储存
                this.currTempFn = this.frameTempFn(this.rows, this.cols);
                // console.log(this.currTempFn, this.rows, this.cols);
            },
            
            // 更新画面
            update: function(frameData){
                let _this = this;
                // 方法一
                let frame = frameData.map(function(e){
                    return _this.rowTempFn(e);
                }).join("<br/>\n");
                // 方法二
                // let frame = this.currTempFn(frameData); //RangeError: Maximum call stack size exceeded(超出堆栈上限)
                // 方法三 vue原生
                // this.frameData = frameData;
                // 方法四
                // let view = this.$refs.view;
                // var fragment = this.range.createContextualFragment(frame);
                // view.innerHtml = null;
                // view.appendChild(fragment);
                this.content = frame;// 渲染画面 this.content = frame;// 渲染画面
                this.$nextTick(function(){
                    if(this.showStats){
                        let stats = this.stats;
                        stats.update.bind(stats);
                    }
                });// 触发性能统计
            },
            // 计算一个像素区域的平均灰度值和灰度映射字符及RGB值对象
            getAvgGray: function(offset_x, offset_y, w, h,cw,ch, imgDate) {
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
            // 图像转字符画数据
            toFrameData: function(ctx, cw, ch, callback) {
                let imgDate = ctx.getImageData(0, 0, cw, ch).data, spanTempFn = this.spanTempFn;// 当前画布图像数据,是否包含配色,字符画模板
                let cols_len = this.cols, rows_len = this.rows ,char_w = this.char_w, char_h = this.char_h;
                // 遍历每个字符画像素获取灰度值映射字符追加至字符画帧数据
                let rowArray = [];
                for (let r=0; r<rows_len; r++) {
                    let colArray = [];
                    for (let c=0; c<cols_len; c++) {
                        let op = this.getAvgGray(~~(char_w*c), ~~(char_h*r) , ~~(char_w), ~~(char_h), cw, ch, imgDate);// 获取灰度均值
                        colArray.push(op);// 行数据
                    }
                    rowArray.push(colArray);// 帧数据
                };
                callback instanceof Function ? callback(rowArray) : null;
            },
            // 初始化统计工具
            initStats: function(){
                if(this.showStats){
                    let stats = new Stats(); // 性能监视器:含fps、耗时ms、内存分配
                    stats.domElement.className = "stats";
                    this.stats = stats;
                    $("body").append(this.stats.domElement)
                }
            },
            // 文件更改时修改视频源
            fileChange: function(e){
                let file = this.$refs.file||this.fileInput;
                if(file.files[0]){
                    window.timer ? clearInterval(window.timer) : null;
                    this.src = URL.createObjectURL(file.files[0]);
                    // 兼容图片
                    let type=file.files[0].type;
                    if(type.split("/")[0]==="image"){
                        let _this = this;
                        let canvas = _this.canvas;
                        let ctx = canvas.getContext('2d');
                        var img = new Image();
                        img.src=this.src;
                        img.onload = function(){
                            let vw =this.vw= img.width, vh =this.vh= img.height;
                            canvas.width = vw/this.sw>0.2 ? this.sw/5 : vw;// 更新画布大小
                            canvas.height = vh*canvas.width/vw;
                            _this.resetToCharsConfig();
                            ctx.clearRect(0,0,canvas.width, canvas.height); 
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            _this.toFrameData(ctx, canvas.width, canvas.height, _this.update);// 将画布图像数据转换为字符画
                        }
                    }
                }
            },
            // 媒体元数据加载
            loadedmetadata: function(e){
                let video = this.$refs.video;
                console.log("loadedmetadata", video.videoWidth, video.videoHeight);
                let vw =this.vw= video.videoWidth, vh =this.vh= video.videoHeight;
                this.canvas.width = vw/this.sw>0.2 ? this.sw/5 : vw;// 更新画布大小
                this.canvas.height = vh*this.canvas.width/vw;
                this.resetToCharsConfig();
            },
            // 媒体可播放
            canplay: function(e){
                let video = this.$refs.video;
                console.log("canplay", video.videoWidth, video.videoHeight);
                let vw =this.vw= video.videoWidth, vh =this.vh= video.videoHeight;
                this.canvas.width = vw/this.sw>0.2 ? this.sw/5 : vw;// 更新画布大小
                this.canvas.height = vh*this.canvas.width/vw;
                this.resetToCharsConfig();
            },
            // 播放视频
            play: function(){
                let _this = this, ctx = _this.canvas.getContext('2d'), cw = _this.canvas.width, ch = _this.canvas.height;
                let video = this.$refs.video;
                console.log("canplay", video.videoWidth, video.videoHeight);
                // $("#tool").hide();// 隐藏工具栏
                this.cacheFrame = [];// 清除缓存画面
                window.timer = setInterval(function (){
                    if(!video.paused){
                        ctx.drawImage(video, 0, 0, cw, ch);// 将视频当前帧画面绘制至画布
                        _this.toFrameData(ctx, cw, ch, _this.update);// 将画布图像数据转换为字符画
                    }
                }.bind(this), _this.fpsStep);
            },
            // 播放按钮
            videoPlay: function(e){
                let video = this.$refs.video;
                video.paused?video.play():video.pause();
            },
            // 初始化事件
            initEvent: function(){
                let _this = this;
                let video = this.$refs.video||this.videoEle;
                // $("#tool").prepend(_this.canvas);
                // 窗口大小改变
                $(window).on("resize",function(e){
                    _this.sw = $(window).width();
                    _this.sh = $(window).height();// 获取屏幕宽高
                    _this.resetToCharsConfig();
                });
                // 暂停/结束
                $(video).on("pause ended",function(e){
                    clearInterval(window.timer);// 视频暂停或结束停止定时器
                    $("#tool").show();// 显示工具栏
                    e.type=="ended" ? _this.content=null : null;// 结束播放清除视图
                });
            }
        }
    });
});