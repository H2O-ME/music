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
/**
 * 搜索音乐
 * @param {string} keyword 搜索关键词
 * @returns {Promise<Array>} 歌曲列表
 */
async function fetchSearchResults(keyword) {
    // 获取当前选择的音质
    const currentBitrate = window.getCurrentBitrate ? window.getCurrentBitrate() : CONFIG.DEFAULT_BITRATE;
    
    const searchParams = new URLSearchParams({
        key: CONFIG.API_KEY,
        gm: keyword,
        type: 'json',
        num: '30',
        br: currentBitrate
    });
    
    console.log('搜索参数:', searchParams.toString());

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/?${searchParams}`);
        const result = await response.json();

        if (result && result.code === 200 && result.data && Array.isArray(result.data) && result.data.length > 0) {
            return result.data.map(song => ({
                title: song.title || '未知歌曲',
                singer: song.singer || '未知歌手',
                n: song.n || song.songid || '',
                id: song.songid || song.n || '',
                songid: song.songid || song.n || '',
                cover: song.pic || ''
            }));
        } else {
            throw new Error(result?.msg || '未找到相关歌曲');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        throw new Error('搜索失败，请稍后重试: ' + error.message);
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
            showToast('正在准备下载...');
            
            // 使用fetch获取音频数据
            const response = await fetch(url);
            if (!response.ok) throw new Error('无法获取文件');
            
            // 将响应转换为blob
            const blob = await response.blob();
            
            // 创建blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${title}.mp3`;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            // 触发点击
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 100);
            
            showToast('开始下载...');
        }
    } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败，请重试');
    }
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