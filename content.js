// content.js

function showCopyModal(blobUrl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;padding:24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.3);display:flex;flex-direction:column;align-items:center;max-width:80vw;max-height:80vh;';

    const title = document.createElement('h2');
    title.textContent = '截图生成完毕！';
    title.style.cssText = 'margin:0 0 16px 0;font-size:20px;color:#121212;';

    const imgPreview = document.createElement('img');
    imgPreview.src = blobUrl;
    imgPreview.style.cssText = 'max-width:100%;max-height:calc(85vh - 130px);object-fit:contain;border:1px solid #eee;border-radius:4px;';

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'margin-top:20px;display:flex;gap:16px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '点击复制到剪贴板';
    copyBtn.style.cssText = 'padding:10px 32px;font-size:16px;background:#056de8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'padding:10px 32px;font-size:16px;background:#f6f6f6;color:#8590a6;border:none;border-radius:6px;cursor:pointer;';

    const cleanup = () => {
        if(document.body.contains(overlay)) document.body.removeChild(overlay);
        URL.revokeObjectURL(blobUrl);
    };

    copyBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            
            copyBtn.textContent = '已复制！';
            copyBtn.style.background = '#4caf50';
            setTimeout(cleanup, 1000);
        } catch (err) {
            console.error(err);
            alert('复制失败，请重试或右键上方图片直接复制/保存。');
        }
    });

    closeBtn.addEventListener('click', cleanup);
    
    btnContainer.appendChild(copyBtn);
    btnContainer.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(imgPreview);
    modal.appendChild(btnContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function addShareButtons() {
    // 找到所有还没有分享按钮的回答操作栏
    const actionBars = document.querySelectorAll('.ContentItem-actions:not(.has-share-btn)');
    
    actionBars.forEach(bar => {
        // 找到父级 AnswerItem 或 ArticleItem
        const item = bar.closest('.AnswerItem, .ArticleItem');
        if (!item) return;

        // 标记为已处理
        bar.classList.add('has-share-btn');

        // 创建分享按钮
        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'Button ContentItem-action Button--plain Button--withIcon Button--withLabel share-screenshot-btn';
        shareBtn.innerHTML = `
            <span style="display: inline-flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="currentColor" style="margin-right: 4px;">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                截图分享
            </span>
        `;
        
        const originalText = shareBtn.innerHTML;
        shareBtn.dataset.state = 'idle';

        shareBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const state = shareBtn.dataset.state;

            if (state === 'generating') return;

            // 开始生成截图
            shareBtn.dataset.state = 'generating';
            shareBtn.innerHTML = '<span style="display: inline-flex; align-items: center;">生成中...</span>';
            
            try {
                // 查找并点击“阅读全文”按钮
                const expandBtn = item.querySelector('.ContentItem-more, .ContentItem-expandButton');
                if (expandBtn && (expandBtn.textContent.includes('阅读全文') || expandBtn.textContent.includes('展开'))) {
                    expandBtn.click();
                    // 等待展开动画和内容加载完成（大幅降低延迟以加快速度）
                    await new Promise(r => setTimeout(r, 400));
                } else {
                    // 没有展开按钮，极短等待即可
                    await new Promise(r => setTimeout(r, 50));
                }
                
                const bgColor = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
                const pixelRatio = 2; // 提高清晰度
                
                // 先生成原始 Canvas
                const originalCanvas = await htmlToImage.toCanvas(item, {
                    pixelRatio: pixelRatio,
                    backgroundColor: bgColor,
                    skipFonts: true, // 忽略自定义字体加载，这能极大提升 html-to-image 的生成速度！
                    filter: (element) => {
                        // 忽略 noscript 标签，防止懒加载图片的原始 HTML 代码被当作纯文本渲染出来叠加在图上
                        if (element.tagName && element.tagName.toLowerCase() === 'noscript') return false;
                        // 忽略不需要截图的元素
                        if (element.classList && element.classList.contains('Sticky')) return false;
                        return true;
                    }
                });
                
                // 创建一个加上 20px padding 的新 Canvas
                const paddingPx = 20;
                const canvasPadding = paddingPx * pixelRatio;
                
                const paddedCanvas = document.createElement('canvas');
                paddedCanvas.width = originalCanvas.width + canvasPadding * 2;
                paddedCanvas.height = originalCanvas.height + canvasPadding * 2;
                
                const ctx = paddedCanvas.getContext('2d');
                // 填充统一的背景色
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
                // 把原始截图绘制到带 padding 的画布中心
                ctx.drawImage(originalCanvas, canvasPadding, canvasPadding);
                
                const blob = await new Promise(resolve => paddedCanvas.toBlob(resolve, 'image/png'));
                
                if (!blob) {
                    alert('截图生成失败');
                    shareBtn.innerHTML = originalText;
                    shareBtn.dataset.state = 'idle';
                    return;
                }
                
                // 恢复按钮状态
                shareBtn.innerHTML = originalText;
                shareBtn.dataset.state = 'idle';

                // 将生成的 Blob 转换为 URL 并显示大弹窗
                const blobUrl = URL.createObjectURL(blob);
                showCopyModal(blobUrl);
                
            } catch (err) {
                console.error('html-to-image 错误:', err);
                alert('生成截图时发生错误');
                shareBtn.innerHTML = originalText;
                shareBtn.dataset.state = 'idle';
            }
        });

        // 将按钮添加到操作栏的末尾
        bar.appendChild(shareBtn);
    });
}

// 初始运行
addShareButtons();

// 使用 MutationObserver 处理动态加载的回答（例如滚动加载或展开更多）
const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldRun = true;
            break;
        }
    }
    if (shouldRun) {
        // 使用 debounce 避免频繁调用
        clearTimeout(window.addShareButtonsTimeout);
        window.addShareButtonsTimeout = setTimeout(addShareButtons, 500);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
