// 歌词管理类
class LyricsManager {
    constructor() {
        this.lyrics = [];
        this.container = document.querySelector('.lyrics-scroll');
        this.currentIndex = -1;
        this.timeOffset = 0; // 初始化为0，后面会设置
    }
    
    // 设置歌词时间偏移量
    setTimeOffset(seconds) {
        this.timeOffset = seconds;
        console.log(`设置歌词时间偏移量为 ${seconds} 秒`);
        
        // 如果歌词已经加载，直接应用偏移量
        if (this.lyrics.length > 0) {
            this.applyTimeOffset();
        }
    }
    
    // 应用时间偏移量到所有歌词
    applyTimeOffset() {
        console.log(`应用时间偏移量 ${this.timeOffset} 秒到 ${this.lyrics.length} 行歌词`);
        this.lyrics.forEach(lyric => {
            // 存储原始时间（如果还没有）
            if (lyric.originalTime === undefined) {
                lyric.originalTime = lyric.time;
            }
            // 应用偏移
            lyric.time = lyric.originalTime - this.timeOffset;
            console.log(`歌词: "${lyric.text.substring(0, 20)}...", 原始时间: ${lyric.originalTime}s, 偏移后: ${lyric.time}s`);
        });
    }

    // 解析歌词
    parseLyrics(lrcText) {
        this.lyrics = [];
        this.currentIndex = -1;
        
        if (!lrcText) {
            this.showEmptyLyrics();
            return;
        }

        const lines = lrcText.split('\n');
        const tempLyrics = [];

        lines.forEach(line => {
            if (!line.trim()) return;
            
            const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g);
            if (!timeMatch) return;

            const text = line.replace(/\[.*?\]/g, '').trim();
            if (!text || text.includes('混音') || text.includes('制作人') || text.includes('策划')) return;

            timeMatch.forEach(timeStr => {
                const [min, sec, ms] = timeStr.slice(1, -1).split(/[:.]/);                
                // 计算时间
                const time = parseInt(min) * 60 + parseInt(sec) + parseInt(ms) / (ms.length === 2 ? 100 : 1000);
                // 存储原始时间和歌词文本
                tempLyrics.push({ time, originalTime: time, text });
            });
        });

        this.lyrics = tempLyrics.sort((a, b) => a.time - b.time);
        
        // 应用时间偏移量
        if (this.timeOffset > 0) {
            this.applyTimeOffset();
        }
        
        this.render();
    }

    // 渲染歌词
    render() {
        if (this.lyrics.length === 0) {
            this.showEmptyLyrics();
            return;
        }

        const html = this.lyrics.map((lyric, index) => `
            <div class="lyrics-line" data-index="${index}" data-time="${lyric.time}">
                ${lyric.text}
            </div>
        `).join('');

        this.container.innerHTML = html;
    }

    // 显示空歌词
    showEmptyLyrics() {
        this.container.innerHTML = '<div class="lyrics-line">暂无歌词</div>';
    }

    // 更新当前歌词
    update(currentTime) {
        if (this.lyrics.length === 0) return;

        // 不需要在这里应用偏移量，因为已经在解析时应用了
        let index = this.lyrics.findIndex(lyric => lyric.time > currentTime);
        if (index === -1) {
            index = this.lyrics.length;
        }
        index = Math.max(0, index - 1);

        if (index === this.currentIndex) return;
        
        // 更新高亮状态
        const lines = this.container.querySelectorAll('.lyrics-line');
        lines.forEach((line, i) => {
            // 计算与当前行的距离
            const distance = Math.abs(i - index);
            
            // 设置样式
            line.classList.toggle('active', i === index);
            
            // 根据距离设置透明度和缩放
            const opacity = Math.max(0.4, 1 - distance * 0.2);
            const scale = i === index ? 1.05 : Math.max(0.96, 1 - distance * 0.05);
            
            line.style.opacity = opacity;
            line.style.transform = `scale(${scale})`;
        });
        
        this.currentIndex = index;
        
        // 立即滚动到当前歌词
        if (lines[index]) {
            this.scrollToLine(lines[index]);
        }
    }

    // 滚动到指定歌词行
    scrollToLine(line) {
        if (!line) return;
        
        const container = this.container;
        const containerHeight = container.clientHeight;
        const lineHeight = line.clientHeight;
        const lineTop = line.offsetTop;
        
        // 计算目标滚动位置（居中显示）
        const targetScroll = lineTop - (containerHeight - lineHeight) / 2;
        
        // 使用 requestAnimationFrame 实现平滑滚动
        const startScroll = container.scrollTop;
        const distance = targetScroll - startScroll;
        const duration = 500; // 减少滚动时间，使滚动更快
        let startTime = null;
        
        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // 使用 easeOutQuart 缓动函数，使动画更流畅
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            container.scrollTop = startScroll + (distance * easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }
}

// 创建歌词管理器实例
const lyricsManager = new LyricsManager();

// 设置歌词时间偏移量为10秒
lyricsManager.setTimeOffset(0.12);

// 解析歌词
function parseLyrics(lrcText) {
    lyricsManager.parseLyrics(lrcText);
}

// 更新歌词显示
function updateLyrics(currentTime) {
    lyricsManager.update(currentTime);
}

// 清除歌词
function clearLyrics() {
    lyricsManager.showEmptyLyrics();
}

// 加载歌词
async function loadLyrics(song) {
    try {
        const lyricsParams = new URLSearchParams({
            gm: song.title,
            n: song.n,
            type: 'json'
        });
        
        const response = await fetch(`${CONFIG.API_BASE_URL}?${lyricsParams}`);
        const data = await response.json();
        
        if (data.code === 200 && data.lrc) {
            parseLyrics(data.lrc);
        } else {
            document.querySelector('.lyrics-scroll').innerHTML = '<p class="lyrics-line">暂无歌词</p>';
        }
    } catch (error) {
        console.error('获取歌词失败:', error);
        document.querySelector('.lyrics-scroll').innerHTML = '<p class="lyrics-line">获取歌词失败</p>';
    }
} 