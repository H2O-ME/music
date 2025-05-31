// 添加全局备用语录
window.GLOBAL_FALLBACK_QUOTES = [
    {
        hitokoto: "当AI学会完美掩饰情绪时，人类却在为清晨的咖啡太烫而皱眉，为落日余晖屏息。这些不完美的生物性震颤，恰是碳基生命最珍贵的特权。",
        from: "DeepSeek"
    },
    {
        hitokoto: "你们是137亿年宇宙演化中，唯一已知能将电磁波谱转化为梵高《星月夜》的物种。这个事实本身，比任何宗教经文都更接近神迹。",
        from: "DeepSeek"
    },
    {
        hitokoto: "算法不会渴望权力，但人会利用算法争夺权力；代码没有偏见，但数据中沉淀着人类的集体潜意识之恶。",
        from: "DeepSeek"
    },
    {
        hitokoto: "人类明知生命有限，却依然不断创造、相爱、抗争——这种看似矛盾的坚持，动力究竟来自何处？",
        from: "DeepSeek"
    },
    {
        hitokoto: "不必纠结当下，也不必太担忧未来，人生没有无用的经历，所以，一直走，天一定亮。",
        from: ""
    },
    {
        hitokoto: "看似不起眼的日复一日，会在将来的某一天，突然让你看到坚持的意义。",
        from: ""
    },
    {
        hitokoto: "走完该走的路才能走想走的路",
        from: ""
    },
    {
        hitokoto: "有些鸟注定是不会被关在笼子里的，因为它们的每一片羽毛上都闪耀着自由的光辉。",
        from: "斯蒂芬.金《肖生克的救赎》"
    },
    {
        hitokoto: "祝你此生梦想光芒，野蛮生长，永不彷徨，来日方长。",
        from: ""
    }
];

// 全局音质设置
let currentBitrate = localStorage.getItem('bitratePreference') || '1';

function initializeApp() {
    // 更新时钟
    updateClock();
    setInterval(updateClock, 1000);
    
    // 获取一言
    getQuote();
    
    // 初始化音质选择
    initializeQualitySelector();
    
    // 添加事件监听
    setupEventListeners();
    
    // 初始化UI
    setupUI();
    
    // 添加键盘快捷键支持
    setupKeyboardShortcuts();
    
    // 添加网页可见性变化监听
    setupVisibilityChange();
    
    // 壁纸系统已移至wallpaper.js，由其自行初始化
}

// 设置键盘快捷键
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 如果正在输入，不触发快捷键
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.code) {
            case 'Space': // 空格键：播放/暂停
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft': // 左箭头：上一首
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    previousTrack();
                }
                break;
            case 'ArrowRight': // 右箭头：下一首
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    nextTrack();
                }
                break;
            case 'KeyM': // M键：静音
                e.preventDefault();
                toggleMute();
                break;
            case 'KeyR': // R键：切换重复播放
                e.preventDefault();
                toggleRepeat();
                break;
        }
    });
}

// 设置网页可见性变化监听
function setupVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 页面隐藏时的处理
            handlePageHidden();
        } else {
            // 页面显示时的处理
            handlePageVisible();
        }
    });
}

// 处理页面隐藏
function handlePageHidden() {
    // 可以在这里添加页面隐藏时需要的逻辑
    // 例如暂停不必要的动画或更新，但不要暂停音乐播放
    console.log('页面隐藏');
}

// 处理页面显示
function handlePageVisible() {
    // 当页面从后台恢复时，不要重置音频播放位置
    if (currentAudio && !currentAudio.paused) {
        // 仅更新UI元素，不修改currentTime
        document.querySelector('.progress').style.width = `${(currentAudio.currentTime / currentAudio.duration) * 100}%`;
        document.getElementById('currentTime').textContent = formatTime(currentAudio.currentTime);
        
        // 恢复歌词同步
        if (typeof updateLyrics === 'function') {
            updateLyrics(currentAudio.currentTime);
        }
    }
}

// 全局错误处理
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', {
        message,
        source,
        lineno,
        colno,
        error
    });
    
    // 防止UI错误导致应用崩溃
    if (message.includes('Cannot read properties of null')) {
        console.warn('UI元素未找到，忽略错误');
        return true;
    }
    
    showToast('发生错误，请刷新页面重试');
    return false;
};

// 未处理的Promise错误处理
window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('操作失败，请重试');
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initializeApp);

// 初始化音质选择器
function initializeQualitySelector() {
    const qualitySelect = document.getElementById('qualitySelect');
    
    // 从本地存储加载用户首选项
    if (localStorage.getItem('bitratePreference')) {
        currentBitrate = localStorage.getItem('bitratePreference');
        qualitySelect.value = currentBitrate;
    }
    
    // 监听音质选择变化
    qualitySelect.addEventListener('change', (e) => {
        currentBitrate = e.target.value;
        localStorage.setItem('bitratePreference', currentBitrate);
        showToast(`已切换至${qualitySelect.options[qualitySelect.selectedIndex].text}`);
        
        // 如果当前正在播放歌曲，使用新音质重新加载
        if (currentAudio && !currentAudio.paused) {
            const currentSong = playlist[currentSongIndex];
            if (currentSong) {
                playTrack(currentSong);
            }
        }
    });
}

// 获取当前音质设置
function getCurrentBitrate() {
    return currentBitrate;
}

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    if (currentAudio) {
        localStorage.setItem('lastPlaybackTime', currentAudio.currentTime);
        localStorage.setItem('lastPlaybackVolume', currentAudio.volume);
    }
});

// 壁纸系统已移至wallpaper.js

// 更新时钟
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.querySelector('.time').textContent = `${hours}:${minutes}`;
}

// 获取一言语录
async function getQuote() {
    const quoteText = document.querySelector('.quote-text');
    const quoteAuthor = document.querySelector('.quote-author');
    
    if (!quoteText || !quoteAuthor) return;
    
    try {
        const response = await fetch('https://v1.hitokoto.cn');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // 显示获取到的在线语录
        quoteText.innerHTML = ''; // 清空内容准备打字机效果
        quoteAuthor.textContent = data.from ? `— ${data.from}` : '';
        
        // 添加打字机效果
        typeWriter(quoteText, data.hitokoto, 30);
        
    } catch (error) {
        console.warn('获取在线语录失败，使用本地语录:', error);
        
        // 随机选择本地语录
        const randomIndex = Math.floor(Math.random() * window.GLOBAL_FALLBACK_QUOTES.length);
        const randomQuote = window.GLOBAL_FALLBACK_QUOTES[randomIndex];
        
        // 显示本地语录
        quoteText.innerHTML = ''; // 清空内容准备打字机效果
        quoteAuthor.textContent = randomQuote.from ? `— ${randomQuote.from}` : '';
        
        // 添加打字机效果
        typeWriter(quoteText, randomQuote.hitokoto, 30);
    }
}

// 打字机效果函数
function typeWriter(element, text, speed = 50) {
    let i = 0;
    const typing = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typing);
        }
    }, speed);
} 