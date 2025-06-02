// UI相关的事件监听设置
function setupEventListeners() {
    // 搜索相关
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchMusic();
        }
    });

    // 音质选择
    const qualityBtns = document.querySelectorAll('.quality-btn');
    qualityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            qualityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBr = btn.dataset.br;
        });
    });

    // 移动端侧边栏触摸滑动
    setupTouchEvents();
    
    // 屏幕方向变化
    window.addEventListener('orientationchange', handleOrientationChange);
}

// 设置触摸事件
function setupTouchEvents() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    });

    document.addEventListener('touchmove', e => {
        touchEndX = e.touches[0].clientX;
    });

    document.addEventListener('touchend', () => {
        const sidebar = document.querySelector('.sidebar');
        const swipeDistance = touchEndX - touchStartX;
        
        // 从左向右滑动打开侧边栏
        if (swipeDistance > CONFIG.SWIPE_THRESHOLD && touchStartX < CONFIG.TOUCH_EDGE_THRESHOLD) {
            openSidebar();
        }
        
        // 从右向左滑动关闭侧边栏
        if (swipeDistance < -CONFIG.SWIPE_THRESHOLD && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
}

// 处理屏幕方向变化
function handleOrientationChange() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// 打开侧边栏
function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭侧边栏
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// 设置UI
function setupUI() {
    // 确保DOM元素都加载完成
    document.addEventListener('DOMContentLoaded', () => {
        const playerSection = document.querySelector('.player-section');
        const playerContainer = document.querySelector('.player-container');
        const lyricsDisplay = document.querySelector('.lyrics-display');
        
        // 初始时隐藏播放器和歌词
        if (playerSection) playerSection.style.display = 'none';
        if (playerContainer) playerContainer.style.display = 'none';
        if (lyricsDisplay) lyricsDisplay.style.display = 'none';
        
        // 设置音量控制
        setupVolumeControl();
        
        // 设置播放器控制
        setupPlayerControls();
    });
}

// 初始化音量控制
function initializeVolumeControl() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeSliderFill = document.getElementById('volumeSliderFill');
    
    if (volumeSlider && volumeSliderFill) {
        volumeSlider.value = CONFIG.DEFAULT_VOLUME;
        volumeSliderFill.style.width = `${CONFIG.DEFAULT_VOLUME}%`;
    }
}

// 更新播放按钮状态
function updatePlayButtonState(isPlaying) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (isPlaying) {
        playPauseBtn.textContent = '⏸';
        playPauseBtn.setAttribute('data-state', 'playing');
    } else {
        playPauseBtn.textContent = '▶';
        playPauseBtn.setAttribute('data-state', 'paused');
    }
}

// 更新进度条
function updateProgressBar(progress) {
    document.getElementById('progressBar').style.width = `${progress}%`;
}

// 更新时间显示
function updateTimeDisplay(currentTime, duration) {
    document.getElementById('currentTime').textContent = formatTime(currentTime);
    document.getElementById('duration').textContent = formatTime(duration);
}

// 显示搜索结果页
function showResultsPage(searchTerm) {
    document.body.classList.add('show-results');
    document.querySelector('.search-term').textContent = `搜索：${searchTerm}`;
}

// 返回主页
function backToHome() {
    document.body.classList.remove('show-results');
}

// 更新搜索函数
async function searchMusic() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) return;

    showResultsPage(searchTerm);
    
    try {
        const results = await fetchSearchResults(searchTerm);
        renderSearchResults(results);
    } catch (error) {
        handleSearchError(error);
    }
}

// 设置搜索框焦点效果
function setupSearchFocus() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('focus', () => {
        document.body.classList.add('search-focused');
    });
    
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
            document.body.classList.remove('search-focused');
        }
    });
} 