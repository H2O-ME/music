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

// 清理播放器UI
function cleanupPlayerUI() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }
    
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
    document.getElementById('progressContainer').onclick = (e) => {
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (audio.duration) {
            audio.currentTime = percent * audio.duration;
        }
    };
}

// 设置音量控制
function setupVolumeControl(audio) {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeBtn = document.querySelector('.volume-button');
    
    audio.volume = volumeSlider.value / 100;
    
    volumeSlider.oninput = (e) => {
        const value = e.target.value;
        audio.volume = value / 100;
        updateVolumeUI(value);
    };

    volumeBtn.onclick = toggleMute;
}

// 更新音量UI
function updateVolumeUI(value) {
    const volumeBtn = document.querySelector('.volume-button');
    document.getElementById('volumeSliderFill').style.width = `${value}%`;
    
    if (value == 0) {
        volumeBtn.textContent = '🔇';
        volumeBtn.classList.add('muted');
    } else if (value < 50) {
        volumeBtn.textContent = '🔉';
        volumeBtn.classList.remove('muted');
    } else {
        volumeBtn.textContent = '🔊';
        volumeBtn.classList.remove('muted');
    }
    
    volumeBtn.classList.add('active');
    setTimeout(() => volumeBtn.classList.remove('active'), 300);
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
    if (currentAudio) {
        currentAudio.pause();
    }
    
    try {
        const url = await fetchSongUrl(song);
        if (url) {
            const audio = new Audio(url);
            await setupAudioPlayer(audio, song);
            audio.play();
        }
    } catch (error) {
        console.error('播放失败:', error);
        showToast('播放失败，请重试');
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
        
        // 设置音量控制
        setupVolumeControl(audio);
        
        // 加载歌词
        await loadLyrics(song);
        
        return true;
    } catch (error) {
        console.error('设置播放器失败:', error);
        throw error;
    }
}

// 获取歌曲URL
async function fetchSongUrl(song) {
    try {
        const urlParams = new URLSearchParams({
            gm: song.title,
            n: song.n,
            type: 'json',
            br: currentBr
        });
        
        const response = await fetch(`${CONFIG.API_BASE_URL}?${urlParams}`);
        const data = await response.json();
        
        if (data.code === 200 && data.music_url) {
            return data.music_url;
        } else {
            throw new Error('无效的播放链接');
        }
    } catch (error) {
        console.error('获取播放链接失败:', error);
        throw new Error('无效的播放链接');
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