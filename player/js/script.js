$(document).ready(function () {
    var v_body = new Vue({
        el: "#body",
        data: {
            list:[],
            mp4: "http://112.253.22.160/10/y/x/k/l/yxklhiqyketcuwmntrsevpoggmhfkn/hc.yinyuetai.com/7B360162F1E5670C8FAFC88D480F49E2.mp4",
            ogg: "http://www.runoob.com/try/demo_source/mov_bbb.ogg",
            ogv:"https://www.quirksmode.org/html5/videos/big_buck_bunny.ogv",
            webp: "https://www.quirksmode.org/html5/videos/big_buck_bunny.webm",
            m3u8: "http://proxy.hls.yy.com/livesystem/15013_xv_50859655_50859655_0_100_0-15013_xa_50859655_50859655_0_100_0.m3u8?org=yyweb&uuid=44416323bd80444db22a35cd0b18dd7b&http://220.194.227.44:8469/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-0-0.m3u8?uuid=11d26c3f24b74ae48016169f8236e62a&org=yyweb&m=157248cbcbd4abee38a30a54c596e58d&r=1384112878&v=1&t=1524646147&uid=0t=1524645906&tk=e2d2f57f7b06519d0fe947334cf8ec2d",
            flv: "http://hls.yy.com/newlive/54880976_54880976.flv?org=yyweb&appid=0&uuid=dea3deafb58b49669b6a2e7319340688&t=1524646353&tk=780ff094e2dce9afb90aaef55e519727&uid=0&ex_audio=0&ex_coderate=1200&ex_spkuid=0",
            rtmp:"rtmp://live.hkstv.hk.lxdns.com/live/hks",

            type:"application/x-mpegURL",
            url: "http://202.107.186.137:5001/nn_live.m3u8?id=hunantvm",
        },
        mounted:function(){
            this.$nextTick(function(){
                $(".playerbox").draggable().resizable();   //可任意拖放
            });
        },
        methods: {
            play: function () {
                //flv
                flvPlayer = function(item,ele){
                    if (flvjs.isSupported()) {
                        var flvPlayer = flvjs.createPlayer({ type: 'flv', url: item.url });
                        flvPlayer.attachMediaElement(ele);
                        flvPlayer.load();
                        flvPlayer.play();
                    }
                }
                //m3u8
                hlsPlayer = function(item,ele){
                    if(Hls.isSupported()) {
                        var hls = new Hls();
                        hls.loadSource(item.url);
                        hls.attachMedia(ele);
                        hls.on(Hls.Events.MANIFEST_PARSED,function() {
                            ele.play();
                        });
                    }else if (ele.canPlayType('application/vnd.apple.mpegurl')) {
                        ele.src = item.url;
                        ele.addEventListener('canplay',function() {
                            ele.play();
                        });
                    }
                }
                //rtmp
                rtmpPlayer = function(item,ele){
                    $(ele).remove();
                    $("#d_"+item.id).show();
                    var player = new TcPlayer("d_"+item.id, {
                        rtmp : item.url,
                        autoplay : true,controls:"none",
                        width:"100%", height:"100%",
                        live:true
                    });
                }
                //h5
                h5Player = function(item,ele){
                    ele.src = item.url;
                    ele.play();
                }
               
                _this = this;
                var item = { id: "v"+_this.list.length, url: _this.url, butShow: false, player: h5Player };
                var protocol = $.url(_this.url).attr("protocol");
                if(protocol=="rtmp"){
                    $.extend(item,{ player: rtmpPlayer });
                }else if(protocol=="http"||protocol=="https"){
                    switch($.url(_this.url).attr("file").split(".").pop().toLowerCase()){
                        case "m3u8" : $.extend(item,{ player: hlsPlayer, type: "application/x-mpegURL" }); break;
                        case "flv" : $.extend(item,{ player: flvPlayer }); break;
                        case "webm" : $.extend(item,{ type: "video/webm" }); break;
                        case "ogg","ogv" : $.extend(item,{ type: "video/ogg" });break;
                    }
                }
                _this.list.push(item);
                _this.$nextTick(function(){
                    $(_this.$refs.p[_this.list.length-1]).draggable().resizable();
                    item.player(item, _this.$refs.v[_this.list.length-1]);
                });
            },
            del: function(item){
                this.list.splice(this.list.indexOf(item),1);
            },
            setTop: function(item){
                this.list=this.list.concat(this.list.splice(this.list.indexOf(item),1));
            }
        }
    });
});