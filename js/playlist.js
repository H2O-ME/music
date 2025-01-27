let savedPlaylist = [];

function loadSavedPlaylist() {
    const savedData = localStorage.getItem(CONFIG.PLAYLIST_STORAGE_KEY);
    if (savedData) {
        try {
            savedPlaylist = JSON.parse(savedData);
            renderPlaylist();
        } catch (error) {
            console.error('Failed to load playlist:', error);
            savedPlaylist = [];
        }
    }
}

function savePlaylist() {
    try {
        localStorage.setItem(CONFIG.PLAYLIST_STORAGE_KEY, JSON.stringify(savedPlaylist));
    } catch (error) {
        console.error('Failed to save playlist:', error);
        showToast('保存歌单失败');
    }
}

// 渲染歌单
function renderPlaylist() {
    const playlistContainer = document.getElementById('playlistItems');
    if (!playlistContainer) return;
    
    playlistContainer.innerHTML = '';
    
    savedPlaylist.forEach((song, index) => {
        if (!song || typeof song !== 'object') return;
        
        const title = song.title || song.name || '未知歌曲';
        const artist = song.singer || song.artist || '未知歌手';
        
        const item = document.createElement('div');
        const isPlaying = currentAudio && playlist[currentSongIndex] && 
                         playlist[currentSongIndex].n === song.n;
        item.className = `playlist-item${isPlaying ? ' active' : ''}`;
        
        item.onclick = (e) => {
            if (e.target.closest('.playlist-item-controls')) {
                return;
            }
            playFromPlaylist(index);
        };
        
        item.innerHTML = `
            <div class="playlist-item-info">
                <div class="playlist-item-title">${title}</div>
                <div class="playlist-item-artist">${artist}</div>
            </div>
            <div class="playlist-item-controls">
                <button class="playlist-item-btn" onclick="playFromPlaylist(${index})">▶️</button>
                <button class="playlist-item-btn" onclick="removeFromPlaylist(${index})">🗑️</button>
            </div>
        `;
        playlistContainer.appendChild(item);
    });
}

// 从歌单播放
async function playFromPlaylist(index) {
    const song = savedPlaylist[index];
    try {
        // 更新播放列表和索引
        const playlistIndex = playlist.findIndex(s => s.n === song.n);
        if (playlistIndex === -1) {
            playlist.push(song);
            currentSongIndex = playlist.length - 1;
        } else {
            currentSongIndex = playlistIndex;
        }
        
        if (song.url) {
            const audio = new Audio(song.url);
            await setupAudioPlayer(audio, song);
            audio.play();
        } else {
            await playTrack(song);
        }
    } catch (error) {
        console.error('播放失败:', error);
        showToast('播放失败，请重试');
    }
    renderPlaylist();
}

// 添加歌曲到歌单
function addToPlaylist(song) {
    if (!savedPlaylist.some(item => item.n === song.n)) {
        const songWithUrl = {
            ...song,
            url: currentAudio ? currentAudio.src : null,
            lastPlayed: Date.now()
        };
        savedPlaylist.push(songWithUrl);
        savePlaylist();
        renderPlaylist();
        showToast('已添加到歌单');
    } else {
        showToast('歌曲已在歌单中');
    }
}

// 从歌单中移除歌曲
function removeFromPlaylist(index) {
    savedPlaylist.splice(index, 1);
    savePlaylist();
    renderPlaylist();
    showToast('已从歌单中移除');
}

// 清空歌单
function clearPlaylist() {
    if (confirm('确定要清空歌单吗？')) {
        savedPlaylist = [];
        savePlaylist();
        renderPlaylist();
        showToast('歌单已清空');
    }
}

// 添加当前播放歌曲到歌单
function addCurrentToPlaylist() {
    if (!currentAudio || currentSongIndex === -1) {
        showToast('当前没有正在播放的歌曲');
        return;
    }
    
    const currentSong = playlist[currentSongIndex];
    
    if (!currentSong || !currentSong.n) {
        showToast('当前歌曲信息不完整');
        return;
    }
    
    const songWithUrl = {
        ...currentSong,
        url: currentAudio.src,
        lastPlayed: Date.now()
    };
    
    const existingIndex = savedPlaylist.findIndex(item => item.n === currentSong.n);
    if (existingIndex === -1) {
        savedPlaylist.push(songWithUrl);
        savePlaylist();
        renderPlaylist();
        showToast('已添加到歌单');
    } else {
        savedPlaylist[existingIndex] = songWithUrl;
        savePlaylist();
        showToast('歌曲已在歌单中');
    }
}

// ... 其他歌单相关函数 