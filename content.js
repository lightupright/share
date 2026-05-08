// content.js
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

            // 第二次点击：将已经生成的截图写入剪贴板
            if (state === 'ready') {
                try {
                    const response = await fetch(shareBtn.dataset.blobUrl);
                    const blob = await response.blob();
                    const clipboardItem = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([clipboardItem]);
                    
                    shareBtn.innerHTML = '<span style="display: inline-flex; align-items: center; color: #175199;">已复制到剪切板</span>';
                    shareBtn.dataset.state = 'idle';
                    
                    setTimeout(() => {
                        shareBtn.innerHTML = originalText;
                        URL.revokeObjectURL(shareBtn.dataset.blobUrl);
                        shareBtn.dataset.blobUrl = '';
                    }, 3000);
                } catch (err) {
                    console.error('写入剪切板失败:', err);
                    alert('复制失败，请确保页面已聚焦。');
                }
                return;
            }

            // 第一次点击：开始生成截图
            shareBtn.dataset.state = 'generating';
            shareBtn.innerHTML = '<span style="display: inline-flex; align-items: center;">生成中...</span>';
            
            try {
                // 查找并点击“阅读全文”按钮
                const expandBtn = item.querySelector('.ContentItem-more, .ContentItem-expandButton');
                if (expandBtn && (expandBtn.textContent.includes('阅读全文') || expandBtn.textContent.includes('展开'))) {
                    expandBtn.click();
                    // 等待展开动画和内容加载完成（可根据情况适当调整延迟）
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    // 等待一下确保没有进行中的渲染
                    await new Promise(r => setTimeout(r, 100));
                }
                
                const bgColor = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
                const pixelRatio = 2; // 提高清晰度
                
                // 先生成原始 Canvas
                const originalCanvas = await htmlToImage.toCanvas(item, {
                    pixelRatio: pixelRatio,
                    backgroundColor: bgColor,
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
                
                // 将生成的 Blob 转换为 URL 存放在按钮属性上
                const blobUrl = URL.createObjectURL(blob);
                shareBtn.dataset.blobUrl = blobUrl;
                shareBtn.dataset.state = 'ready';
                // 提示用户再次点击以复制
                shareBtn.innerHTML = '<span style="display: inline-flex; align-items: center; color: #ff9800; font-weight: bold;">生成完毕，点击复制</span>';
                
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
