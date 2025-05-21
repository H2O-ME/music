/**
 * 壁纸管理类
 * 使用竞速API机制加载壁纸，并支持缓存
 */
class WallpaperManager {
    constructor() {
        // 壁纸API列表
        this.wallpaperApis = [
            { url: 'https://api.timelessq.com/bing/random', params: '' },
            { url: 'https://api.bimg.cc/random', params: 'w=1920&h=1080&mkt=zh-CN' },
            { url: 'https://bing.img.run/rand.php', params: '' },
            { url: 'https://api.xsot.cn/bing', params: 'jump=true' }
        ];
        
        // 配置参数
        this.loadTimeThreshold = 5000; // 加载超时时间（毫秒）
        this.useCache = true; // 是否使用缓存
        this.cacheExpiryTime = 24 * 60 * 60 * 1000; // 缓存过期时间（24小时）
        this.maxCacheSize = 5 * 1024 * 1024; // 最大缓存大小（5MB）
        this.currentCacheKey = 'current_wallpaper'; // 当前壁纸缓存键
        this.nextCacheKey = 'next_wallpaper'; // 下一张壁纸缓存键
        
        // 状态变量
        this.keepAnimationOnly = false; // 是否只保留动画背景
        this.wallpaperLoadTimeout = null; // 壁纸加载超时计时器
        
        // 初始化DOM元素
        this.initDomElements();
    }
    
    // 初始化DOM元素
    initDomElements() {
        // 创建壁纸容器
        this.createWallpaperContainer();
        
        // 创建必应壁纸层
        this.bingLayer = document.getElementById('bingWallpaperLayer');
        if (!this.bingLayer) {
            this.bingLayer = document.createElement('div');
            this.bingLayer.id = 'bingWallpaperLayer';
            this.bingLayer.className = 'wallpaper-layer bing-layer';
            document.getElementById('wallpaperContainer').appendChild(this.bingLayer);
        }
        
        // 创建效果层
        this.effectLayer = document.getElementById('wallpaperEffectLayer');
        if (!this.effectLayer) {
            this.effectLayer = document.createElement('div');
            this.effectLayer.id = 'wallpaperEffectLayer';
            this.effectLayer.className = 'wallpaper-layer effect-layer';
            document.getElementById('wallpaperContainer').appendChild(this.effectLayer);
        }
        
        // 创建粒子动画层
        this.particlesLayer = document.getElementById('particlesLayer');
        if (!this.particlesLayer) {
            this.particlesLayer = document.createElement('div');
            this.particlesLayer.id = 'particlesLayer';
            this.particlesLayer.className = 'wallpaper-layer particles-layer';
            document.getElementById('wallpaperContainer').appendChild(this.particlesLayer);
        }
    }
    
    // 创建壁纸容器
    createWallpaperContainer() {
        let container = document.getElementById('wallpaperContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'wallpaperContainer';
            container.className = 'wallpaper-container';
            document.body.insertBefore(container, document.body.firstChild);
        }
    }
    
    // 预加载图片函数
    preloadImage(url) {
        return new Promise((resolve, reject) => {
            const loadStartTime = Date.now();
            
            // 检查是否是必应壁纸URL
            const isBingUrl = url.includes('api.bimg.cc') || url.includes('bingw.com') || 
                              url.includes('bing.img.run') || url.includes('api.xsot.cn');
            
            // 如果是必应壁纸URL，使用fetch先处理重定向
            if (isBingUrl) {
                console.log('检测到必应壁纸URL，使用fetch处理重定向:', url);
                
                // 使用fetch获取实际URL（允许重定向）
                fetch(url, {
                    method: 'GET',
                    redirect: 'follow',
                    cache: 'no-store' // 禁用缓存
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误! 状态: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    // 创建本地URL
                    const localUrl = URL.createObjectURL(blob);
                    
                    // 加载本地URL
                    const img = new Image();
                    
                    // 设置超时
                    const timeoutId = setTimeout(() => {
                        URL.revokeObjectURL(localUrl);
                        reject(new Error(`图片加载超时: ${url}`));
                    }, this.loadTimeThreshold);
                    
                    img.onload = () => {
                        clearTimeout(timeoutId);
                        const loadTime = Date.now() - loadStartTime;
                        console.log(`必应壁纸重定向后加载成功，总耗时: ${loadTime}ms`);
                        resolve({ url: localUrl, loadTime, originalUrl: url });
                    };
                    
                    img.onerror = () => {
                        clearTimeout(timeoutId);
                        URL.revokeObjectURL(localUrl);
                        reject(new Error(`图片加载失败(重定向后): ${url}`));
                    };
                    
                    img.src = localUrl;
                })
                .catch(error => {
                    console.error('fetch处理重定向失败:', error);
                    reject(error);
                });
            } else {
                // 普通图片直接加载
                // 设置超时计时器
                const timeoutId = setTimeout(() => {
                    reject(new Error(`图片加载超时: ${url}`));
                }, this.loadTimeThreshold);
                
                const img = new Image();
                
                img.onload = () => {
                    clearTimeout(timeoutId);
                    const loadTime = Date.now() - loadStartTime;
                    resolve({ url, loadTime });
                };
                
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error(`图片加载失败: ${url}`));
                };
                
                img.src = url;
            }
        });
    }
    
    // 获取API URL列表
    getApiUrls() {
        // 为每个API添加时间戳避免缓存
        return this.wallpaperApis.map(api => {
            const timestamp = Date.now();
            const separator = api.params ? '&' : '?';
            return `${api.url}${api.params ? '?' + api.params : ''}${separator}t=${timestamp}`;
        });
    }
    
    // 竞速加载多个API，返回最快加载成功的结果
    async raceWallpaperApis() {
        const apiUrls = this.getApiUrls();
        console.log('正在竞速加载壁纸，API数量:', apiUrls.length);
        
        // 创建加载Promise数组，每个都带有超时处理
        const loadPromises = apiUrls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const loadStartTime = Date.now();
                
                const timeoutId = setTimeout(() => {
                    img.src = ''; // 清除图片源
                    reject(new Error(`图片加载超时: ${url}`));
                }, this.loadTimeThreshold);
                
                img.onload = () => {
                    clearTimeout(timeoutId);
                    const loadTime = Date.now() - loadStartTime;
                    console.log(`API ${url} 加载成功，耗时: ${loadTime}ms`);
                    resolve({ url: url, loadTime, apiUrl: url });
                };
                
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error(`图片加载失败: ${url}`));
                };
                
                img.src = url;
            });
        });
        
        // 使用Promise.any来获取第一个成功的结果
        try {
            return await Promise.any(loadPromises);
        } catch (error) {
            // 所有API都失败
            console.error('所有壁纸API加载均失败');
            throw new Error('所有壁纸API加载失败');
        }
    }
    
    // 检查壁纸缓存
    checkWallpaperCache(cacheKey) {
        if (!this.useCache) return null;
        
        try {
            const cacheData = localStorage.getItem(cacheKey);
            if (!cacheData) return null;
            
            const cache = JSON.parse(cacheData);
            const now = Date.now();
            
            // 检查缓存是否过期
            if (now - cache.timestamp > this.cacheExpiryTime) {
                console.log(`壁纸缓存 ${cacheKey} 已过期，需要重新获取`);
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            console.log(`发现有效的壁纸缓存 ${cacheKey}，上次缓存时间:`, new Date(cache.timestamp).toLocaleString());
            return cache;
        } catch (error) {
            console.warn(`读取壁纸缓存 ${cacheKey} 失败:`, error);
            localStorage.removeItem(cacheKey);
            return null;
        }
    }
    
    // 缓存壁纸数据
    cacheWallpaper(imageData, imageUrl, cacheKey) {
        if (!this.useCache) return;
        
        try {
            // 创建缓存对象
            const cache = {
                data: imageData,
                url: imageUrl,
                timestamp: Date.now()
            };
            
            // 估计缓存大小
            const cacheSize = JSON.stringify(cache).length;
            
            // 检查缓存大小是否超过限制
            if (cacheSize > this.maxCacheSize) {
                console.warn(`壁纸缓存 ${cacheKey} 大小超过限制，不进行缓存`);
                return;
            }
            
            // 存储缓存
            localStorage.setItem(cacheKey, JSON.stringify(cache));
            console.log(`壁纸已缓存到 ${cacheKey}，大小:`, (cacheSize / 1024).toFixed(2), 'KB');
        } catch (error) {
            console.warn(`缓存壁纸到 ${cacheKey} 失败:`, error);
            // 如果缓存失败（例如localStorage已满），清除缓存键
            try {
                localStorage.removeItem(cacheKey);
            } catch (e) {
                // 忽略清除失败的错误
            }
        }
    }
    
    // 从缓存加载壁纸
    async loadWallpaperFromCache(cacheKey) {
        try {
            const cache = this.checkWallpaperCache(cacheKey);
            if (!cache) return false;
            
            console.log(`正在从缓存 ${cacheKey} 加载壁纸...`);
            
            // 从Base64数据创建Blob对象
            const binary = atob(cache.data);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'image/jpeg' });
            
            // 创建ObjectURL
            const objectUrl = URL.createObjectURL(blob);
            
            // 加载缓存的图片
            const img = new Image();
            const loadStartTime = Date.now();
            
            await new Promise((resolve, reject) => {
                // 设置超时
                const timeoutId = setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error(`缓存图片加载超时`));
                }, this.loadTimeThreshold);
                
                img.onload = () => {
                    clearTimeout(timeoutId);
                    const loadTime = Date.now() - loadStartTime;
                    console.log(`缓存壁纸加载成功，总耗时: ${loadTime}ms`);
                    resolve();
                };
                
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error(`缓存图片加载失败`));
                };
                
                img.src = objectUrl;
            });
            
            // 设置壁纸
            this.bingLayer.style.backgroundImage = `url('${objectUrl}')`;
            
            // 添加图片元素以确保显示
            this.bingLayer.innerHTML = '';
            const imgElement = document.createElement('img');
            imgElement.src = objectUrl;
            imgElement.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;';
            this.bingLayer.appendChild(imgElement);
            
            // 显示壁纸和效果层
            requestAnimationFrame(() => {
                if (!this.keepAnimationOnly) {
                    this.bingLayer.style.opacity = '1';
                    this.bingLayer.style.transform = 'scale(1)'; // 缩放动画
                    this.effectLayer.style.opacity = '1';
                    
                    // 隐藏粒子动画层
                    this.hideParticlesBackground();
                }
            });
            
            return true;
        } catch (error) {
            console.warn(`从缓存 ${cacheKey} 加载壁纸失败:`, error);
            return false;
        }
    }
    
    // 预加载下一张壁纸并缓存
    async preloadNextWallpaper() {
        try {
            console.log('开始预加载下一张壁纸...');
            
            // 竞速加载多个API获取下一张壁纸
            const { url, loadTime, originalUrl, apiUrl } = await this.raceWallpaperApis();
            
            // 使用重定向后的实际URL
            const actualUrl = url || originalUrl;
            console.log(`下一张壁纸预加载成功，来源: ${apiUrl}，耗时: ${loadTime}ms`);
            
            // 获取图片的Base64数据并缓存到next_wallpaper键
            const imageData = await this.getImageAsBase64(actualUrl);
            this.cacheWallpaper(imageData, apiUrl, this.nextCacheKey);
            
            console.log('下一张壁纸已成功缓存');
        } catch (error) {
            console.error('预加载下一张壁纸失败:', error);
        }
    }

    // 获取并缓存图片的Base64数据
    async getImageAsBase64(url) {
        try {
            // 使用fetch获取图片
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
        
            // 获取blob数据
            const blob = await response.blob();
            
            // 转换为Base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // 从DataURL中提取Base64字符串
                    const base64String = reader.result.split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('获取图片Base64数据失败:', error);
            throw error;
        }
    }

    // 加载并显示必应壁纸
    async loadBingWallpaper() {
        try {
            // 将上次缓存的"下一张壁纸"作为当前壁纸
            const nextCache = this.checkWallpaperCache(this.nextCacheKey);
            if (nextCache) {
                // 将"下一张"壁纸移动到"当前"壁纸缓存
                localStorage.setItem(this.currentCacheKey, localStorage.getItem(this.nextCacheKey));
                // 清除"下一张"壁纸缓存
                localStorage.removeItem(this.nextCacheKey);
            }
            
            // 尝试从当前壁纸缓存加载
            if (await this.loadWallpaperFromCache(this.currentCacheKey)) {
                // 成功从缓存加载，开始异步预加载下一张壁纸
                setTimeout(() => this.preloadNextWallpaper(), 1000);
                return true;
            }
            
            // 设置超时计时器，如果加载时间过长则显示粒子动画
            this.wallpaperLoadTimeout = setTimeout(() => {
                this.activateParticlesBackground();
            }, this.loadTimeThreshold);
            
            console.log('无可用缓存，开始并行加载多个壁纸API');
            
            // 竞速加载多个API
            const { url, loadTime, originalUrl, apiUrl } = await this.raceWallpaperApis();
            
            // 清除超时计时器
            if (this.wallpaperLoadTimeout) {
                clearTimeout(this.wallpaperLoadTimeout);
                this.wallpaperLoadTimeout = null;
            }
            
            // 如果已经切换到动画模式，则不设置壁纸
            if (this.keepAnimationOnly) {
                console.log('在加载过程中已切换到粒子动画模式，不设置壁纸');
                return;
            }
            
            // 使用重定向后的实际URL
            const actualUrl = url || originalUrl;
            console.log(`壁纸加载成功，来源: ${apiUrl}，耗时: ${loadTime}ms`);
            
            // 预加载图片
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = actualUrl;
            });
            
            // 设置必应壁纸
            this.bingLayer.style.backgroundImage = `url('${actualUrl}')`;
            
            // 添加图片元素以确保显示
            this.bingLayer.innerHTML = '';
            const imgElement = document.createElement('img');
            imgElement.src = actualUrl;
            imgElement.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;';
            this.bingLayer.appendChild(imgElement);
            
            // 显示壁纸和效果层
            requestAnimationFrame(() => {
                if (!this.keepAnimationOnly) {
                    this.bingLayer.style.opacity = '1';
                    this.bingLayer.style.transform = 'scale(1)'; // 缩放动画
                    this.effectLayer.style.opacity = '1';
                    
                    // 隐藏粒子动画层
                    this.hideParticlesBackground();
                }
            });
            
            // 缓存壁纸
            try {
                // 获取图片的Base64数据并缓存到当前壁纸缓存
                const imageData = await this.getImageAsBase64(actualUrl);
                this.cacheWallpaper(imageData, apiUrl, this.currentCacheKey);
                
                // 异步预加载下一张壁纸
                setTimeout(() => this.preloadNextWallpaper(), 500);
            } catch (cacheError) {
                console.warn('缓存壁纸过程中出错:', cacheError);
                // 缓存错误不影响壁纸显示
            }
            
            return true;
        } catch (error) {
            console.error('加载必应壁纸失败:', error);
            
            // 清除超时计时器
            if (this.wallpaperLoadTimeout) {
                clearTimeout(this.wallpaperLoadTimeout);
                this.wallpaperLoadTimeout = null;
            }
            
            // 激活粒子背景作为备用
            this.activateParticlesBackground();
            
            return false;
        }
    }
    
    // 激活粒子背景
    activateParticlesBackground() {
        console.log('激活粒子背景动画');
        
        // 初始化粒子动画
        if (!this.particlesInitialized) {
            this.initParticlesBackground();
            this.particlesInitialized = true;
        }
        
        // 显示粒子层
        this.particlesLayer.style.opacity = '1';
    }
    
    // 隐藏粒子背景
    hideParticlesBackground() {
        if (this.particlesLayer) {
            this.particlesLayer.style.opacity = '0';
        }
    }
    
    // 初始化粒子背景
    initParticlesBackground() {
        // 这里可以添加粒子动画初始化代码
        // 例如使用particles.js或自定义粒子系统
        console.log('初始化粒子背景动画');
        
        // 简单的CSS渐变背景作为替代
        this.particlesLayer.style.background = 'linear-gradient(135deg, #1a1c2c 0%, #2a3c54 100%)';
    }
    
    // 初始化壁纸系统
    init() {
        console.log('初始化壁纸系统');
        
        // 加载壁纸
        this.loadBingWallpaper();
        
        // 添加刷新壁纸的事件监听
        document.addEventListener('wallpaper-refresh', () => {
            this.refreshWallpaper();
        });
    }
    
    // 刷新壁纸
    async refreshWallpaper() {
        console.log('手动刷新壁纸');
        
        // 清除当前壁纸缓存
        localStorage.removeItem(this.currentCacheKey);
        
        // 重置壁纸层
        this.bingLayer.style.opacity = '0';
        this.bingLayer.style.transform = 'scale(1.05)';
        
        // 延迟加载新壁纸
        setTimeout(() => {
            this.loadBingWallpaper();
        }, 150);
    }
}

// 创建壁纸管理器实例
const wallpaperManager = new WallpaperManager();

// 页面加载完成后初始化壁纸系统
document.addEventListener('DOMContentLoaded', () => {
    wallpaperManager.init();
});
