// 搜索音乐
async function searchMusic() {
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput) return;

    // 显示加载状态
    toggleLoadingState(true);
    
    try {
        const results = await fetchSearchResults(searchInput);
        renderSearchResults(results);
    } catch (error) {
        handleSearchError(error);
    } finally {
        toggleLoadingState(false);
    }
}

// 获取搜索结果
async function fetchSearchResults(keyword) {
    const searchParams = new URLSearchParams({
        gm: keyword,
        type: 'json',
        num: '30',
        br: currentBr
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}?${searchParams}`);
    const data = await response.json();

    if (data.code === 200 && data.data && data.data.length > 0) {
        return data.data;
    } else {
        throw new Error(data.msg || '未找到相关歌曲');
    }
}

// 渲染搜索结果
function renderSearchResults(results) {
    const resultsDiv = document.querySelector('.results');
    resultsDiv.innerHTML = '';
    
    results.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.dataset.id = song.n;
        
        card.innerHTML = `
            <div class="song-info">
                <div class="song-name">${song.title}</div>
                <div class="singer-name">${song.singer}</div>
            </div>
            <div class="song-controls">
                <button class="play-btn" onclick="playSong(event, ${JSON.stringify(song).replace(/"/g, '&quot;')})">
                    <i class="fas fa-play"></i>
                    播放
                </button>
                <button class="download-btn" onclick="downloadSong(event, '${song.title}', '${song.n}')">
                    <i class="fas fa-download"></i>
                    下载
                </button>
            </div>
        `;
        
        resultsDiv.appendChild(card);
    });
}

// 播放歌曲
async function playSong(event, song) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        toggleLoadingState(true);
        hideError();
        
        // 验证歌曲信息
        if (!song || !song.title || !song.n) {
            throw new Error('歌曲信息不完整');
        }
        
        // 获取播放链接
        const url = await fetchSongUrl(song);
        if (!url) {
            throw new Error('无法获取播放链接');
        }
        
        // 创建音频对象并预加载
        const audio = new Audio();
        
        // 添加加载事件监听
        const loadPromise = new Promise((resolve, reject) => {
            audio.addEventListener('loadeddata', () => resolve());
            audio.addEventListener('error', () => reject(new Error('音频加载失败')));
            
            // 添加超时处理
            setTimeout(() => reject(new Error('音频加载超时')), 15000);
        });
        
        audio.src = url;
        
        // 等待音频加载
        await loadPromise;
        
        // 更新播放列表
        currentSongIndex = playlist.findIndex(s => s.n === song.n);
        if (currentSongIndex === -1) {
            playlist.push(song);
            currentSongIndex = playlist.length - 1;
        }
        
        // 设置播放器
        await setupAudioPlayer(audio, song);
        
        // 更新搜索结果中的活动状态
        updateActiveCard(song);
        
        // 开始播放
        const playPromise = audio.play();
        if (playPromise) {
            await playPromise;
        }
    } catch (error) {
        handlePlayError(error);
    } finally {
        toggleLoadingState(false);
    }
}

// 更新活动卡片
function updateActiveCard(song) {
    // 移除所有卡片的活动状态
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // 添加活动状态到当前播放的歌曲卡片
    const activeCard = document.querySelector(`.song-card[data-id="${song.n}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 下载歌曲
async function downloadSong(event, title, n) {
    event.stopPropagation();
    
    try {
        showToast('正在获取下载链接...');
        
        const url = await fetchSongUrl({ title, n });
        if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showToast('开始下载...');
        }
    } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败，请重试');
    }
}

// 切换加载状态
function toggleLoadingState(show) {
    document.querySelector('.loading').style.display = show ? 'block' : 'none';
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 隐藏错误信息
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// 处理搜索错误
function handleSearchError(error) {
    console.error('搜索失败:', error);
    showError(error.message || '搜索失败，请重试');
}

// 处理播放错误
function handlePlayError(error) {
    console.error('播放失败:', error);
    
    let errorMessage = '播放失败，请重试';
    if (error.message.includes('无效的播放链接')) {
        errorMessage = '该歌曲暂时无法播放';
    } else if (error.message.includes('加载超时')) {
        errorMessage = '网络连接不稳定，请重试';
    }
    
    showToast(errorMessage);
    
    // 清理播放状态
    cleanupPlayback();
}

// 清理播放状态
function cleanupPlayback() {
    // 调用播放器的清理函数
    cleanupPlayerUI();
    
    // 清除活动状态
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('active');
    });
}

// ... 其他搜索相关函数 