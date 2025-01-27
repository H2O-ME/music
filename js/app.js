function initializeApp() {
    // 更新时钟
    updateClock();
    setInterval(updateClock, 1000);
    
    // 获取励志语录
    fetchQuote();
    
    // 添加事件监听
    setupEventListeners();
    
    // 初始化UI
    setupUI();
    
    // 添加键盘快捷键支持
    setupKeyboardShortcuts();
    
    // 添加网页可见性变化监听
    setupVisibilityChange();
    
    // 添加背景图加载错误处理
    setupBackgroundFallback();
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
    // 可以在这里添加一些页面隐藏时的处理逻辑
    // 例如：保存当前播放状态等
    if (currentAudio) {
        localStorage.setItem('lastPlaybackTime', currentAudio.currentTime);
        localStorage.setItem('lastPlaybackVolume', currentAudio.volume);
    }
}

// 处理页面显示
function handlePageVisible() {
    // 可以在这里添加一些页面重新显示时的处理逻辑
    // 例如：恢复播放状态等
    if (currentAudio) {
        const lastTime = localStorage.getItem('lastPlaybackTime');
        const lastVolume = localStorage.getItem('lastPlaybackVolume');
        
        if (lastTime) currentAudio.currentTime = parseFloat(lastTime);
        if (lastVolume) currentAudio.volume = parseFloat(lastVolume);
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

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    if (currentAudio) {
        localStorage.setItem('lastPlaybackTime', currentAudio.currentTime);
        localStorage.setItem('lastPlaybackVolume', currentAudio.volume);
    }
});

// 背景图加载错误处理
function setupBackgroundFallback() {
    const testImage = new Image();
    testImage.onerror = () => {
        // 第一个源加载失败，尝试第二个源
        document.body.style.backgroundImage = 'url(https://source.unsplash.com/random/1920x1080)';
        
        const fallbackImage = new Image();
        fallbackImage.onerror = () => {
            // 两个源都失败，使用渐变背景
            document.body.classList.add('bg-fallback');
            document.body.style.backgroundImage = 'none';
        };
        fallbackImage.src = 'https://source.unsplash.com/random/1920x1080';
    };
    testImage.src = 'https://api.dujin.org/bing/1920.php';
}

// 更新时钟
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.querySelector('.time').textContent = `${hours}:${minutes}`;
}

// 获取励志语录
async function fetchQuote() {
    try {
        const response = await fetch('https://zj.v.api.aa1.cn/api/wenan-zl/?type=json');
        const data = await response.json();
        
        const quoteText = document.querySelector('.quote-text');
        const quoteAuthor = document.querySelector('.quote-author');
        
        if (data.msg) {
            quoteText.textContent = data.msg;
            quoteAuthor.textContent = '— 每日励志';
        }
    } catch (error) {
        console.error('获取励志语录失败:', error);
    }
} 