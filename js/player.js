let currentAudio = null;
let currentSongIndex = -1;
let playlist = [];
let currentBr = "1";

// 更新播放器UI
function updatePlayerUI(song) {
    const playerContainer = document.querySelector('.player-container');
    const playerSection = document.querySelector('.player-section');
    const lyricsDisplay = document.querySelector('.lyrics-display');
    
    if (!playerContainer || !playerSection) return;
    
    // 确保播放器和歌词区域都显示
    playerSection.style.display = 'flex';  // 使用flex布局
    playerContainer.style.display = 'block';
    lyricsDisplay.style.display = 'flex';
    
    // 更新歌曲信息
    document.getElementById('playerTitle').textContent = song.title || '未知歌曲';
    document.getElementById('playerArtist').textContent = song.singer || '未知歌手';
    
    // 更新播放按钮状态
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.textContent = '⏸';
    playPauseBtn.setAttribute('data-state', 'playing');
    
    // 重置进度条
    document.querySelector('.progress').style.width = '0%';
    document.getElementById('currentTime').textContent = '0:00';
    document.getElementById('duration').textContent = '0:00';
}

// 清理音频资源
function cleanupAudio() {
    if (currentAudio) {
        // 暂停播放
        currentAudio.pause();
        
        // 移除所有事件监听器
        const newAudio = currentAudio.cloneNode(false);
        currentAudio.replaceWith(newAudio);
        
        // 释放资源
        currentAudio.src = '';
        currentAudio.load();
        currentAudio = null;
        
        // 强制垃圾回收（如果浏览器支持）
        if (window.gc) {
            window.gc();
        }
    }
}

// 清理播放器UI
function cleanupPlayerUI() {
    cleanupAudio();
    
    // 重置播放状态
    currentSongIndex = -1;
    
    // 更新UI
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.textContent = '▶';
        playPauseBtn.setAttribute('data-state', 'paused');
    }
    
    // 清除歌词
    clearLyrics();
}

// 设置音频事件监听
function setupAudioEvents(audio) {
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        document.querySelector('.progress').style.width = `${progress}%`;
        document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
        document.getElementById('duration').textContent = formatTime(audio.duration);
        // 应用10秒的时间偏移，提前显示歌词
        const timeOffset = 0.1; // 歌词提前显示10秒
        const adjustedTime = audio.currentTime + timeOffset;
        console.log(`播放时间: ${audio.currentTime.toFixed(2)}秒, 歌词时间: ${adjustedTime.toFixed(2)}秒 (提前${timeOffset}秒)`);
        updateLyrics(adjustedTime);
    });

    audio.addEventListener('ended', () => {
        nextTrack();
    });
}

// 设置进度条
function setupProgressBar(audio) {
    const progressContainer = document.getElementById('progressContainer');
    let isDragging = false;

    // 点击跳转
    progressContainer.onclick = (e) => {
        if (isDragging) return;
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
        if (audio.duration) {
            audio.currentTime = percent * audio.duration;
            updateProgressBar(percent * 100);
        }
    };

    // 拖动功能
    progressContainer.onmousedown = (e) => {
        isDragging = true;
        const wasPlaying = !audio.paused;
        if (wasPlaying) {
            audio.pause();
        }
        
        const rect = progressContainer.getBoundingClientRect();
        const moveHandler = (moveEvent) => {
            const percent = Math.min(Math.max(0, (moveEvent.clientX - rect.left) / rect.width), 1);
            const newTime = percent * audio.duration;
            audio.currentTime = newTime;
            updateProgressBar(percent * 100);
            document.getElementById('currentTime').textContent = formatTime(newTime);
        };
        
        const upHandler = (upEvent) => {
            const percent = Math.min(Math.max(0, (upEvent.clientX - rect.left) / rect.width), 1);
            const newTime = percent * audio.duration;
            audio.currentTime = newTime;
            
            if (wasPlaying) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('播放失败:', error);
                    });
                }
            }
            
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            setTimeout(() => { isDragging = false; }, 100);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler, { once: true });
    };

    // 触摸屏支持
    progressContainer.ontouchstart = (e) => {
        isDragging = true;
        const wasPlaying = !audio.paused;
        if (wasPlaying) {
            audio.pause();
        }
        
        const rect = progressContainer.getBoundingClientRect();
        const touch = e.touches[0];
        let percent = Math.min(Math.max(0, (touch.clientX - rect.left) / rect.width), 1);
        let newTime = percent * audio.duration;
        audio.currentTime = newTime;
        updateProgressBar(percent * 100);
        document.getElementById('currentTime').textContent = formatTime(newTime);
        
        const moveHandler = (moveEvent) => {
            const touch = moveEvent.touches[0];
            percent = Math.min(Math.max(0, (touch.clientX - rect.left) / rect.width), 1);
            newTime = percent * audio.duration;
            audio.currentTime = newTime;
            updateProgressBar(percent * 100);
            document.getElementById('currentTime').textContent = formatTime(newTime);
            moveEvent.preventDefault();
        };
        
        const endHandler = () => {
            if (audio.duration) {
                audio.currentTime = newTime;
                if (wasPlaying) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('播放失败:', error);
                        });
                    }
                }
            }
            progressContainer.removeEventListener('touchmove', moveHandler);
            progressContainer.removeEventListener('touchend', endHandler);
            setTimeout(() => { isDragging = false; }, 100);
        };

        progressContainer.addEventListener('touchmove', moveHandler, { passive: false });
        progressContainer.addEventListener('touchend', endHandler, { once: true });
        e.preventDefault();
    };
}

// 播放/暂停切换 - 增加错误检查
function togglePlay() {
    if (!currentAudio) return;
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    
    // 添加安全检查，防止null错误
    if (!playPauseIcon) {
        console.warn('播放图标元素未找到');
        // 使用旧方式更新按钮状态
        if (currentAudio.paused) {
            currentAudio.play()
                .then(() => {
                    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => {
                    console.error('播放失败:', error);
                    showToast('播放失败，请重试');
                });
        } else {
            currentAudio.pause();
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        return;
    }
    
    if (currentAudio.paused) {
        currentAudio.play()
            .then(() => {
                playPauseIcon.className = 'fas fa-pause';
            })
            .catch(error => {
                console.error('播放失败:', error);
                showToast('播放失败，请重试');
            });
    } else {
        currentAudio.pause();
        playPauseIcon.className = 'fas fa-play';
    }
}

// 静音切换
function toggleMute() {
    if (!currentAudio) return;
    
    const volumeBtn = document.querySelector('.volume-button');
    const volumeSlider = document.getElementById('volumeSlider');
    
    currentAudio.muted = !currentAudio.muted;
    updateVolumeUI(currentAudio.muted ? 0 : volumeSlider.value);
}

// 播放上一首
function previousTrack() {
    if (currentSongIndex > 0 && playlist.length > 0) {
        currentSongIndex--;
        playTrack(playlist[currentSongIndex]);
    }
}

// 播放下一首
function nextTrack() {
    if (currentSongIndex < playlist.length - 1) {
        currentSongIndex++;
        playTrack(playlist[currentSongIndex]);
    }
}

// 播放指定歌曲
async function playTrack(song) {
    if (!song) {
        console.error('无效的歌曲信息');
        return;
    }
    
    // 清理之前的音频资源
    cleanupAudio();
    
    try {
        const url = await fetchSongUrl(song);
        if (url) {
            console.log('获取到播放链接:', url);
            
            // 更新当前播放歌曲信息
            currentSong = song;
            updatePlayerUI(song);
            
            // 创建新的音频对象
            const audio = new Audio();
            audio.preload = 'auto';
            audio.autoplay = true;
            
            // 设置音频源
            audio.src = url;
            
            // 设置音频事件
            setupAudioEvents(audio);
            setupProgressBar(audio);
            
            // 更新当前音频对象
            currentAudio = audio;
            
            // 尝试播放
            try {
                await audio.play();
                updatePlayButtonState(true);
            } catch (playError) {
                console.error('播放失败:', playError);
                showToast('播放失败: ' + (playError.message || '未知错误'));
                cleanupAudio();
            }
        }
    } catch (error) {
        console.error('播放失败:', error);
        showToast('播放失败，请重试');
        cleanupAudio();
    }
}

// 设置音频播放器
async function setupAudioPlayer(audio, song) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
    }
    
    currentAudio = audio;
    
    try {
        // 更新UI
        updatePlayerUI(song);
        
        // 预先初始化播放按钮
        const playPauseIcon = document.getElementById('playPauseIcon');
        if (playPauseIcon) {
            playPauseIcon.className = 'fas fa-pause';
        } else {
            const playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        }
        
        // 设置音频事件监听
        setupAudioEvents(audio);
        
        // 设置进度条
        setupProgressBar(audio);
        
        // 加载歌词
        await loadLyrics(song);
        
        return true;
    } catch (error) {
        console.error('设置播放器失败:', error);
        throw error;
    }
}

/**
 * 获取歌曲播放URL
 * @param {Object} song 歌曲对象
 * @returns {Promise<string>} 歌曲播放URL
 */
async function fetchSongUrl(song) {
    try {
        if (!song || (!song.title && !song.songid)) {
            throw new Error('无效的歌曲信息');
        }

        // 获取当前选择的音质
        const currentBitrate = window.getCurrentBitrate ? window.getCurrentBitrate() : CONFIG.DEFAULT_BITRATE;
        
        // 构建请求参数
        const urlParams = new URLSearchParams({
            key: CONFIG.API_KEY,
            gm: song.title || '',
            n: song.n || song.songid || song.id || '',
            type: 'json',
            br: currentBitrate
        });
        
        console.log('获取歌曲URL参数:', urlParams.toString());
        
        // 发送请求获取歌曲详情
        const response = await fetch(`${CONFIG.API_BASE_URL}/?${urlParams}`);
        const responseText = await response.text();
        
        // 尝试解析响应文本
        try {
            // 尝试解析为JSON
            const data = JSON.parse(responseText);
            
            // 保存歌词数据到歌曲对象
            if (data.lrc) {
                song.lrc = data.lrc;
                // 如果有歌词更新UI
                if (document.querySelector('.lyrics-display').style.display !== 'none') {
                    parseLyrics(data.lrc);
                }
            }
            
            // 如果直接返回了URL
            if (data && data.url) {
                return data.url;
            } else if (data && data.music_url) {
                return data.music_url;
            } else if (data && data[0] && data[0].url) {
                return data[0].url;
            } else {
                console.error('无效的API响应:', data);
                throw new Error('无法获取播放链接：无效的API响应格式');
            }
        } catch (jsonError) {
            // 如果不是JSON格式，尝试从文本中提取URL
            console.log('响应不是JSON格式，尝试从文本中提取URL');
            
            // 尝试从文本中提取URL
            const urlMatch = responseText.match(/播放链接：(https?:\/\/[^\s\n]+)/);
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1].trim();
            }
            
            // 尝试提取封面图片URL
            const imgMatch = responseText.match(/±img=([^±]+)±/);
            if (imgMatch && imgMatch[1]) {
                // 更新歌曲封面
                song.cover = imgMatch[1].trim();
            }
            
            // 尝试提取歌曲信息
            const titleMatch = responseText.match(/歌名：([^\n]+)/);
            if (titleMatch && titleMatch[1]) {
                song.title = titleMatch[1].trim();
            }
            
            const artistMatch = responseText.match(/歌手：([^\n]+)/);
            if (artistMatch && artistMatch[1]) {
                song.singer = artistMatch[1].trim();
            }
            
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1].trim();
            }
            
            throw new Error('无法从响应中提取播放链接');
        }
    } catch (error) {
        console.error('获取播放链接失败:', error);
        throw new Error('获取播放链接失败，请稍后重试');
    }
}

// 加载歌词
async function loadLyrics(song) {
    try {
        if (song.lrc) {
            parseLyrics(song.lrc);
        } else {
            document.querySelector('.lyrics-scroll').innerHTML = '<p class="lyrics-line">暂无歌词</p>';
        }
    } catch (error) {
        console.error('加载歌词失败:', error);
        document.querySelector('.lyrics-scroll').innerHTML = '<p class="lyrics-line">加载歌词失败</p>';
    }
}

// 更新播放按钮状态 - 增加安全检查
function updatePlayButtonState(isPlaying) {
    const playPauseIcon = document.getElementById('playPauseIcon');
    
    // 添加安全检查
    if (!playPauseIcon) {
        console.warn('播放图标元素未找到');
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
        return;
    }
    
    if (isPlaying) {
        playPauseIcon.className = 'fas fa-pause';
    } else {
        playPauseIcon.className = 'fas fa-play';
    }
}

// ... 其他播放器相关函数 