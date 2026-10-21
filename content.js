// content.js

function showCopyModal(blobUrl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;flex-direction:column;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;padding:24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.3);display:flex;flex-direction:column;align-items:center;max-width:80vw;max-height:80vh;';

    const title = document.createElement('h2');
    title.textContent = '截图生成完毕！';
    title.style.cssText = 'margin:0 0 16px 0;font-size:20px;color:#121212;';

    const previewWrapper = document.createElement('div');
    previewWrapper.style.cssText = 'max-width:100%;max-height:calc(85vh - 130px);overflow-y:auto;border:1px solid #eee;border-radius:4px;background:#f9f9f9;';

    const imgPreview = document.createElement('img');
    imgPreview.src = blobUrl;
    imgPreview.style.cssText = 'width:500px;max-width:100%;height:auto;display:block;';
    previewWrapper.appendChild(imgPreview);

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
    modal.appendChild(previewWrapper);
    modal.appendChild(btnContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// 检测当前浏览器 Canvas 支持的最大安全高度（优先测试 65535，回退到 32767）
let cachedMaxCanvasHeight = null;
function getMaxCanvasHeight() {
    if (cachedMaxCanvasHeight) return cachedMaxCanvasHeight;
    for (const limit of [65535, 32767]) {
        try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = limit;
            const ctx = testCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#0f0';
                ctx.fillRect(0, limit - 1, 1, 1);
                const data = ctx.getImageData(0, limit - 1, 1, 1).data;
                if (data[1] === 255) {
                    cachedMaxCanvasHeight = limit;
                    return limit;
                }
            }
        } catch (e) {
            // 忽略并尝试下一个上限
        }
    }
    cachedMaxCanvasHeight = 32767;
    return cachedMaxCanvasHeight;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

function addShareButtons() {
    // 找到所有还没有分享按钮的回答操作栏
    const actionBars = document.querySelectorAll('.ContentItem-actions:not(.has-share-btn)');
    
    actionBars.forEach(bar => {
        // 找到父级 AnswerItem 或 ArticleItem
        const item = bar.closest('.AnswerItem, .ArticleItem');
        if (!item) return;

        // 确认是否已经添加过截图按钮，如果已经添加过则不再添加
        if (bar.querySelector('.share-screenshot-btn')) return;

        // 标记为已处理
        bar.classList.add('has-share-btn');

        // 创建分享按钮
        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'Button ContentItem-action Button--plain Button--withIcon Button--withLabel share-screenshot-btn';
        shareBtn.innerHTML = `
            <span style="display: inline-flex; align-items: center;">&#8203;
                <svg viewBox="0 0 24 24" class="Zi Zi--InsertImage Button-zi" fill="currentColor" width="1.2em" height="1.2em" style="margin-right: 4px;">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                截图
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
                const desiredPixelRatio = 2; // 提高清晰度
                const paddingPx = 20;
                
                // 保存原始样式，用于截图后恢复
                const originalWidth = item.style.width;
                const originalMaxWidth = item.style.maxWidth;
                const originalMinWidth = item.style.minWidth;
                const originalBoxSizing = item.style.boxSizing;

                // 强制设置为 710px，加上左右各 20px 的 padding，最终生成的截图总宽度恰好为 750px
                const targetWidthPx = 710;
                const targetWidth = `${targetWidthPx}px`;
                item.style.setProperty('width', targetWidth, 'important');
                item.style.setProperty('max-width', targetWidth, 'important');
                item.style.setProperty('min-width', targetWidth, 'important');
                item.style.setProperty('box-sizing', 'border-box', 'important');

                // 等待微任务/宏任务执行，让浏览器完成布局更新
                await new Promise(r => setTimeout(r, 20));

                let svgDataUrl;
                let itemWidth;
                let itemHeight;
                try {
                    const cs = window.getComputedStyle(item);
                    const borderLeft = parseFloat(cs.getPropertyValue('border-left-width')) || 0;
                    const borderRight = parseFloat(cs.getPropertyValue('border-right-width')) || 0;
                    const borderTop = parseFloat(cs.getPropertyValue('border-top-width')) || 0;
                    const borderBottom = parseFloat(cs.getPropertyValue('border-bottom-width')) || 0;
                    itemWidth = Math.ceil(item.clientWidth + borderLeft + borderRight) || targetWidthPx;
                    itemHeight = Math.ceil(item.clientHeight + borderTop + borderBottom);

                    // 先导出为矢量 SVG（避免 html-to-image 在 toCanvas 中因高度超过 16384px 而自动缩小分辨率导致文字模糊）
                    svgDataUrl = await htmlToImage.toSvg(item, {
                        width: itemWidth,
                        height: itemHeight,
                        backgroundColor: bgColor,
                        skipFonts: true, // 忽略自定义字体加载，极大提升生成速度
                        filter: (element) => {
                            // 忽略 noscript 标签，防止懒加载图片的原始 HTML 代码被当作纯文本渲染出来叠加在图上
                            if (element.tagName && element.tagName.toLowerCase() === 'noscript') return false;
                            // 忽略不需要截图的元素
                            if (element.classList && element.classList.contains('Sticky')) return false;
                            return true;
                        }
                    });
                } finally {
                    // 无论成功还是失败，都必须恢复原始样式，防止影响网页排版
                    if (originalWidth) {
                        item.style.width = originalWidth;
                    } else {
                        item.style.removeProperty('width');
                    }
                    if (originalMaxWidth) {
                        item.style.maxWidth = originalMaxWidth;
                    } else {
                        item.style.removeProperty('max-width');
                    }
                    if (originalMinWidth) {
                        item.style.minWidth = originalMinWidth;
                    } else {
                        item.style.removeProperty('min-width');
                    }
                    if (originalBoxSizing) {
                        item.style.boxSizing = originalBoxSizing;
                    } else {
                        item.style.removeProperty('box-sizing');
                    }
                }

                // 计算在浏览器 Canvas 最大高度限制下可用的最高缩放倍率
                const totalCssHeight = itemHeight + paddingPx * 2;
                const totalCssWidth = itemWidth + paddingPx * 2;
                const maxCanvasHeight = getMaxCanvasHeight();
                const maxCanvasArea = 16384 * 16384; // 浏览器 Canvas 最大像素面积限制 (~2.68 亿像素)
                const maxRatioByHeight = maxCanvasHeight / totalCssHeight;
                const maxRatioByArea = Math.sqrt(maxCanvasArea / (totalCssWidth * totalCssHeight));
                const pixelRatio = Math.min(desiredPixelRatio, maxRatioByHeight, maxRatioByArea);

                const canvasPadding = Math.round(paddingPx * pixelRatio);
                const paddedCanvas = document.createElement('canvas');
                paddedCanvas.width = Math.round(itemWidth * pixelRatio) + canvasPadding * 2;
                paddedCanvas.height = Math.round(itemHeight * pixelRatio) + canvasPadding * 2;

                const ctx = paddedCanvas.getContext('2d');
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);

                // 分片渲染 SVG 到 Canvas，避免单张 SVG 纹理高度超过 GPU 16384px 限制导致模糊或空白
                const maxSliceCssHeight = Math.floor(8192 / Math.max(pixelRatio, 1));
                if (itemHeight <= maxSliceCssHeight) {
                    const img = await loadImage(svgDataUrl);
                    ctx.drawImage(
                        img,
                        canvasPadding,
                        canvasPadding,
                        Math.round(itemWidth * pixelRatio),
                        Math.round(itemHeight * pixelRatio)
                    );
                } else {
                    const prefix = 'data:image/svg+xml;charset=utf-8,';
                    const rawSvg = decodeURIComponent(svgDataUrl.slice(prefix.length));
                    for (let offsetY = 0; offsetY < itemHeight; offsetY += maxSliceCssHeight) {
                        const sliceCssH = Math.min(maxSliceCssHeight, itemHeight - offsetY);
                        const sliceSvg = rawSvg
                            .replace(
                                /^<svg[^>]*>/,
                                `<svg xmlns="http://www.w3.org/2000/svg" width="${itemWidth}" height="${sliceCssH}" viewBox="0 0 ${itemWidth} ${sliceCssH}">`
                            )
                            .replace(
                                /<foreignObject[^>]*>/,
                                `<foreignObject width="${itemWidth}" height="${itemHeight}" x="0" y="-${offsetY}" externalResourcesRequired="true">`
                            );
                        const sliceUrl = prefix + encodeURIComponent(sliceSvg);
                        const sliceImg = await loadImage(sliceUrl);
                        const destY = canvasPadding + Math.round(offsetY * pixelRatio);
                        const destW = Math.round(itemWidth * pixelRatio);
                        const destH = Math.round(sliceCssH * pixelRatio);
                        ctx.drawImage(sliceImg, canvasPadding, destY, destW, destH);
                    }
                }
                
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

        // 尝试找到知乎自带的“分享”按钮节点
        const shareNode = Array.from(bar.children).find(child => child.textContent && child.textContent.includes('分享'));
        
        if (shareNode && shareNode.nextSibling) {
            // 插入到分享按钮之后
            bar.insertBefore(shareBtn, shareNode.nextSibling);
        } else if (bar.lastElementChild) {
            // 如果没找到“分享”文字，则插到倒数第一个元素（通常是“...”）的前面
            bar.insertBefore(shareBtn, bar.lastElementChild);
        } else {
            // 兜底方案：添加到末尾
            bar.appendChild(shareBtn);
        }
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
