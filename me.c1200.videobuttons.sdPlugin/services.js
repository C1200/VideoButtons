/**
 * @typedef {(b64image: string) => void} SetImage
 */

/**
 * @typedef {(func: () => void) => Function} SetTidy
 */

/**
 * @typedef {Object} MatchObject
 * @property {string} url 
 */

/**
 * @typedef {Object} HandleObject
 * 
 * @property {(b64image: string) => void} setImage
 * @property {(func: () => void) => Function} setTidy
 * @property {() => void} showAlert
 * @property {string} url
 */

/**
 * @typedef {Object} Service
 * @property {(object: MatchObject) => boolean} match 
 * @property {(object: HandleObject) => void} handle 
 */

/**
 * @type {Record<string, Service>}
 */
window.vbservices = {
    "youtube": {
        re: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/|shorts\/)?)([\w\-]+)(\S+)?$/i,
        match: function ({ url }) {
            return this.re.test(url);
        },
        handle: function ({ setImage, setTidy, url }) {
            let timer;
            var eUrl = url.replace(this.re, 'https://youtube.com/embed/$6');
            var e = document.createElement('iframe');
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            c.width = c.height = 72;
            e.src = eUrl;
            document.body.append(e, c);

            e.onload = () => {
                e.contentDocument.getElementById('movie_player').click();
                var v = e.contentDocument.querySelector('video');

                v.onloadeddata = () => {
                    update();
                }

                v.onended = setTidy(() => {
                    e.remove();
                    c.remove();
                    clearTimeout(timer);
                    ctx.drawImage(playIcon, 0, 0, 72, 72);
                    setImage(c.toDataURL());
                });

                function update() {
                    ctx.clearRect(0, 0, c.width, c.height);
                    var ratio = Math.min(c.width / v.videoWidth, c.height / v.videoHeight);
                    var x = (c.width - v.videoWidth * ratio) / 2;
                    var y = (c.height - v.videoHeight * ratio) / 2;
                    ctx.fillStyle = '#f00';
                    ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight, x, y, v.videoWidth * ratio, v.videoHeight * ratio);
                    ctx.fillRect(x, (v.videoHeight * ratio) + y - 1, Math.floor((v.currentTime / v.duration) * (v.videoWidth * ratio)), 1);
                    setImage(c.toDataURL());
                    timer = setTimeout(update, 0);
                }
            }
        }
    },
    "spotifymusic": {
        re: /^((https?:)?\/\/)?(open\.spotify\.com)(\/(track\/|playlist\/|show\/|episode\/))(\w+)(\S+)?$/i,
        match: function ({ url }) {
            return this.re.test(url);
        },
        handle: function ({ setImage, setTidy, showAlert, url }) {
            var timer;
            var re = this.re;
            var eUrl = url.replace(this.re, 'https://open.spotify.com/embed/$5$6');
            var e = document.createElement('iframe');
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            c.width = c.height = 72;
            e.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
            e.src = eUrl;
            document.body.append(e, c);

            e.onload = () => {
                var w = e.contentWindow.window;
                var playFunc = w.HTMLMediaElement.prototype.play;

                var iUrl = e.contentDocument.body.innerHTML.match(/https:\/\/i.scdn.co\/image\/\w+/g)[0];
                var i = new Image();
                i.src = iUrl;

                var isPlaylist = url.replace(re, '$5') === 'playlist/';
                var playlistPos = 0;
                var playlistLength = isPlaylist ? e.contentDocument.querySelector('[aria-label="Track list"]').children.length : null;

                var tidy = setTidy(() => {
                    e.remove();
                    c.remove();
                    clearTimeout(timer);
                    ctx.clearRect(0, 0, 72, 72);
                    ctx.drawImage(i, 0, 0, 72, 72);
                    ctx.drawImage(playIcon, 0, 0, 72, 72);
                    setImage(c.toDataURL());
                });

                var cantPlay = setTimeout(() => {
                    showAlert();
                    setTimeout(() => {
                        tidy();
                        throw new Error('Can\'t play. There may be more details above.');
                    }, 2000);
                }, 5000);

                w.HTMLMediaElement.prototype.play = w.HTMLAudioElement.prototype.play = w.Audio.prototype.play = function () {
                    var a = this;

                    a.onloadeddata = () => {
                        update();
                    }

                    if (isPlaylist) {
                        a.onended = () => {
                            clearTimeout(timer);
                            playlistPos++;
                            if (playlistPos >= playlistLength) {
                                tidy();
                            }
                        }
                    } else {
                        a.onended = tidy;
                    }

                    function update() {
                        if (cantPlay) {
                            clearTimeout(cantPlay);
                            cantPlay = null;
                        }
                        ctx.clearRect(0, 0, 72, 72);
                        ctx.drawImage(i, 0, 0, 72, 72);
                        ctx.fillStyle = 'rgba(24, 216, 96, 0.6)';
                        ctx.fillRect(0, 0, Math.floor((a.currentTime / a.duration) * 72), 72);
                        setImage(c.toDataURL());
                        timer = setTimeout(update, 0);
                    }

                    return playFunc.bind(this)();
                }

                setTimeout(() => {
                    e.contentDocument.querySelector('[aria-label="Play"]').click();
                }, 100);
            }
        }
    }
};