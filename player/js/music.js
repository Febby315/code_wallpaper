var v_app = new Vue({
    el: "#app",
    data: {
        sound:new Howl({
            src: ["music/gbqq.flac"],
            buffer: true,
            autoplay: true,
            loop: true,
            volume: 0.5,
            rate:1.5
        })
    },
    mounted:function(){
        this.$nextTick(function(){
            console.log("sound",this.sound);
        });
    },
    methods: {
    }
});