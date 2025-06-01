// 时间格式化
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 显示灵动岛风格的通知
function showToast(message, duration = 2000) {
    // 移除现有的toast
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        toast.style.animation = 'toastOut 0.4s forwards';
        setTimeout(() => toast.remove(), 400);
    });
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // 创建内容容器
    const content = document.createElement('div');
    content.textContent = message;
    content.style.position = 'relative';
    content.style.zIndex = '1';
    content.style.padding = '8px 16px';
    content.style.borderRadius = '6px';
    content.style.backgroundColor = 'var(--bg-color)';
    content.style.color = 'var(--text-primary)';
    content.style.fontSize = '14px';
    content.style.fontWeight = '500';
    content.style.whiteSpace = 'nowrap';
    content.style.overflow = 'hidden';
    content.style.textOverflow = 'ellipsis';
    
    toast.appendChild(content);
    document.body.appendChild(toast);
    
    // 触发重绘
    void toast.offsetWidth;
    
    // 显示toast
    toast.style.animation = 'toastIn 0.4s forwards';
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s forwards';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, duration);
}