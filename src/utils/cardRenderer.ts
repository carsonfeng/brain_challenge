/**
 * 在圆形卡片上渲染图像
 */

/**
 * 在Canvas上渲染单张卡片
 * @param symbols 卡片上的图案数组
 * @param imageList 所有可用的图像
 * @param cardSize 卡片尺寸（直径）或样式选项
 * @returns 包含卡片图像的Blob和名称
 */
export async function renderCard(
  symbols: number[],
  imageList: { url: string, name: string }[],
  cardSizeOrStyle: number | {
    background: string,
    borderColor: string,
    borderWidth: number,
    borderStyle: string,
    size?: number
  } = 800
): Promise<{ blob: Blob, name: string }> {
  if (imageList.length === 0) {
    throw new Error('没有可用的图像');
  }

  console.log(`开始渲染卡片, 符号数量: ${symbols.length}`);

  // 处理参数
  let cardSize = 800;
  let background = 'white';
  let borderColor = '#333';
  let borderWidth = 2;
  let borderStyle = 'solid';

  if (typeof cardSizeOrStyle === 'number') {
    cardSize = cardSizeOrStyle;
  } else {
    cardSize = cardSizeOrStyle.size || 800;
    background = cardSizeOrStyle.background;
    borderColor = cardSizeOrStyle.borderColor;
    borderWidth = cardSizeOrStyle.borderWidth;
    borderStyle = cardSizeOrStyle.borderStyle;
  }

  // 渲染阶段
  try {
    // 第一步：预加载所有图像，确保图像资源可用
    console.log(`预加载图像开始...`);
    const loadedImages: HTMLImageElement[] = await Promise.all(
      symbols.map(async (symbolIndex, idx) => {
        try {
          // 确保索引在范围内
          const validIndex = symbolIndex % imageList.length;
          const imageUrl = imageList[validIndex].url;
          
          // 加载图像
          const image = await loadImage(imageUrl);
          return image;
        } catch (error) {
          console.warn(`加载图像 ${symbolIndex} 失败:`, error);
          // 创建一个备用图像
          return createFallbackImage();
        }
      })
    );
    console.log(`预加载图像完成，成功加载: ${loadedImages.length} 个`);
    
    // 检查是否有成功加载的图像
    if (loadedImages.length === 0) {
      throw new Error('所有图像加载失败');
    }
    
    // 创建Canvas元素
    console.log(`创建渲染画布...`);
    const canvas = document.createElement('canvas');
    canvas.width = cardSize;
    canvas.height = cardSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }
    
    // 清除画布
    ctx.clearRect(0, 0, cardSize, cardSize);
    
    // 绘制背景
    console.log(`绘制卡片背景...`);
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cardSize, cardSize);
    
    // 然后再绘制圆形背景
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.arc(cardSize / 2, cardSize / 2, cardSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制边框（如果有）
    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      
      // 设置虚线样式
      if (borderStyle === 'dashed') {
        ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
      } else if (borderStyle === 'dotted') {
        ctx.setLineDash([borderWidth, borderWidth * 2]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.arc(cardSize / 2, cardSize / 2, cardSize / 2 - borderWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 生成固定的图像位置
    console.log(`计算图像位置...`);
    // 使用固定种子确保每次生成的位置一致
    const symbolKey = symbols.join('_');
    const positions = generateFixedSeedPositions(symbols.length, cardSize, symbolKey);
    
    // 顺序渲染每个图像
    console.log(`开始渲染 ${symbols.length} 个图像...`);
    for (let i = 0; i < symbols.length; i++) {
      // 获取当前图像和位置
      const image = loadedImages[i];
      const position = positions[i];
      
      // 使用图像索引作为随机种子确保一致性
      const pseudoRandom = getPseudoRandom(i, symbols[i]);
      
      // 计算到中心的距离
      const distanceFromCenter = Math.sqrt(
        Math.pow(position.x - cardSize / 2, 2) + 
        Math.pow(position.y - cardSize / 2, 2)
      );
      
      // 增大图像尺寸
      // 根据图像总数调整大小
      let baseSizeFactor;
      if (symbols.length <= 4) {
        baseSizeFactor = 0.19; // 从0.17增大到0.19
      } else if (symbols.length <= 6) {
        baseSizeFactor = 0.17; // 从0.15增大到0.17
      } else {
        baseSizeFactor = 0.15; // 从0.13增大到0.15
      }
      
      // 边缘图像比中心小一些
      const maxDistance = cardSize * 0.42; // 增大到0.42
      const centralScaleFactor = baseSizeFactor;
      const edgeScaleFactor = baseSizeFactor * 0.85; // 从0.8增大到0.85
      
      // 根据到中心的距离计算大小
      const sizeFactor = centralScaleFactor - 
        ((distanceFromCenter / maxDistance) * (centralScaleFactor - edgeScaleFactor));
      
      // 随机缩放范围
      const randomScale = 0.95 + pseudoRandom * 0.1; // 0.95-1.05的随机缩放
      const size = cardSize * sizeFactor * randomScale;
      
      // 计算旋转角度
      const centerX = cardSize / 2;
      const centerY = cardSize / 2;
      const angleToCenter = Math.atan2(position.y - centerY, position.x - centerX);
      
      // 使用固定的旋转策略
      const orientationStrategy = Math.floor(pseudoRandom * 3);
      let finalRotation = 0;
      
      switch (orientationStrategy) {
        case 0: 
          finalRotation = angleToCenter;
          break;
        case 1:
          finalRotation = angleToCenter + Math.PI;
          break;
        case 2:
          finalRotation = angleToCenter + Math.PI/2;
          break;
      }
      
      // 添加固定扰动
      finalRotation += (pseudoRandom - 0.5) * Math.PI / 12;
      
      try {
        // 绘制旋转图像
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.rotate(finalRotation);
        ctx.drawImage(image, -size/2, -size/2, size, size);
        ctx.restore();
        
        console.log(`成功绘制图像 ${i+1}/${symbols.length}`);
      } catch (error) {
        console.error(`渲染图像 ${i+1} 时出错:`, error);
      }
    }
    
    // 确保所有渲染操作完成后再导出
    console.log(`所有图像绘制完成，准备导出...`);
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`开始导出图像...`);
        
        // 使用较长的延迟确保所有绘制操作完成
        setTimeout(() => {
          canvas.toBlob((blob) => {
            if (blob) {
              console.log(`导出成功，大小: ${blob.size} 字节`);
              resolve({ 
                blob,
                name: `card_${symbolKey}.png`
              });
            } else {
              reject(new Error('生成Blob失败'));
            }
          }, 'image/png', 0.95);
        }, 100);
      } catch (error) {
        console.error(`导出过程中出错:`, error);
        reject(error);
      }
    });
  } catch (error) {
    console.error(`渲染过程中发生错误:`, error);
    
    // 创建错误卡片
    const errorCanvas = document.createElement('canvas');
    errorCanvas.width = cardSize;
    errorCanvas.height = cardSize;
    const ctx = errorCanvas.getContext('2d');
    
    if (ctx) {
      // 绘制错误卡片
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, cardSize, cardSize);
      
      ctx.beginPath();
      ctx.arc(cardSize / 2, cardSize / 2, cardSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffebee';
      ctx.fill();
      
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#d32f2f';
      ctx.font = `${cardSize * 0.06}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('图像加载错误', cardSize / 2, cardSize / 2);
    }
    
    return new Promise((resolve, reject) => {
      try {
        errorCanvas.toBlob((blob) => {
          if (blob) {
            resolve({ 
              blob,
              name: `error_card.png` 
            });
          } else {
            reject(new Error('生成错误卡片Blob失败'));
          }
        });
      } catch (err) {
        reject(new Error('无法创建备用错误卡片'));
      }
    });
  }
}

/**
 * 基于固定种子生成伪随机数，确保每次生成的随机数一致
 */
function getPseudoRandom(index: number, seed: number): number {
  // 简单的伪随机数生成器，基于输入值返回0-1之间的伪随机数
  const x = Math.sin(index * 9999 + seed * 7919) * 10000;
  return x - Math.floor(x);
}

/**
 * 基于固定种子生成位置，确保每次生成的位置一致
 * 改进分布算法，避免图像重叠
 */
function generateFixedSeedPositions(count: number, cardSize: number, seed: string): {x: number, y: number}[] {
  // 从种子字符串生成数字种子
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue += seed.charCodeAt(i) * (i + 1);
  }

  const positions: {x: number, y: number}[] = [];
  const center = cardSize / 2;
  
  // 增大安全半径，使图像分布更广
  const safeRadius = cardSize * 0.42; // 从0.35增加到0.42
  
  // 根据图像数量预定义固定位置
  if (count <= 3) {
    // 少量图像时，分布更均匀
    const angles = [0, 2*Math.PI/3, 4*Math.PI/3]; // 三等分圆周
    const baseRadius = safeRadius * 0.5; // 从0.35增加到0.5，距离中心更远
    
    for (let i = 0; i < count; i++) {
      // 添加一些基于种子的变化，但保持变化很小
      const angle = angles[i] + (seedValue % 100) / 1000;
      const radius = baseRadius + (((seedValue + i * 37) % 50) - 25) / 250 * baseRadius;
      
      positions.push({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      });
    }
  } else if (count <= 5) {
    // 4-5个图像：一个在中心，其余均匀分布
    // 对于4-5个图像，总是放一个在中心，使得布局更加均衡
    const hasCenterImage = true;
    
    if (hasCenterImage) {
      // 在中心放置一个图像
      positions.push({
        x: center + ((seedValue % 10) - 5), // 更靠近中心
        y: center + (((seedValue / 100) % 10) - 5)
      });
    }
    
    // 其余图像均匀分布在圆周上
    const remainingCount = hasCenterImage ? count - 1 : count;
    const angleOffset = (seedValue % 100) / 100 * Math.PI * 2; // 0到2π的偏移
    
    for (let i = 0; i < remainingCount; i++) {
      const angle = angleOffset + i * (Math.PI * 2 / remainingCount);
      // 使用较大的半径
      const radius = safeRadius * 0.65; // 从0.55增加到0.65
      
      positions.push({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      });
    }
  } else {
    // 对于6-8个图像，使用更均匀的分布
    // 6个图像：放一个在中心，5个在外围
    // 7个图像：放两个在内环，5个在外环
    // 8个图像：放3个在内环，5个在外环
    
    const outerCount = Math.min(count, 5); // 外环最多5个图像
    const innerCount = count - outerCount; // 剩余的放在内环
    
    // 先放置外环图像
    const outerRadius = safeRadius * 0.76; // 增加到0.76，更靠近边缘
    const outerAngleOffset = (seedValue % 100) / 100 * Math.PI * 2;
    
    for (let i = 0; i < outerCount; i++) {
      const angle = outerAngleOffset + i * (Math.PI * 2 / outerCount);
      positions.push({
        x: center + outerRadius * Math.cos(angle),
        y: center + outerRadius * Math.sin(angle)
      });
    }
    
    // 放置内环图像
    if (innerCount > 0) {
      if (innerCount == 1) {
        // 如果只有一个内环图像，放在中心
        positions.push({
          x: center,
          y: center
        });
      } else {
        // 多个内环图像，均匀分布
        const innerRadius = safeRadius * 0.38; // 增加到0.38
        const innerAngleOffset = outerAngleOffset + Math.PI / outerCount; // 错开外环的角度
        
        for (let i = 0; i < innerCount; i++) {
          const angle = innerAngleOffset + i * (Math.PI * 2 / innerCount);
          positions.push({
            x: center + innerRadius * Math.cos(angle),
            y: center + innerRadius * Math.sin(angle)
          });
        }
      }
    }
  }
  
  return positions;
}

/**
 * 加载图像
 * @param url 图像URL
 * @returns Promise，包含已加载的HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 如果是data URL，不需要设置crossOrigin
    if (!url.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    
    // 不再添加URL参数，因为这可能破坏某些图像URL的有效性
    // 直接使用原始URL
    const imgUrl = url;
    
    // 设置超时时间
    const timeoutId = setTimeout(() => {
      console.warn(`图像 加载超时:`, url.substring(0, 100) + '...');
      reject(new Error('图像加载超时'));
    }, 8000); // 8秒超时
    
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log(`图像 加载成功: 尺寸=${img.width}x${img.height}`);
      resolve(img);
    };
    
    img.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error(`图像 加载失败:`, e);
      reject(new Error('图像加载失败'));
    };
    
    // 尝试处理可能的图片格式问题
    try {
      img.src = imgUrl;
      
      // 强制浏览器开始加载
      if (img.complete) {
        // 图像已经加载完成（可能是缓存）
        clearTimeout(timeoutId);
        console.log(`图像 从缓存加载`);
        resolve(img);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`设置图像 源时出错:`, err);
      reject(err);
    }
  });
}

/**
 * 创建一个备用图像
 */
function createFallbackImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      // 创建一个简单的彩色方块图像
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      
      // 随机生成更柔和的颜色
      const hue = Math.floor(Math.random() * 360); // HSL色相
      
      // 绘制白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 100, 100);
      
      // 绘制圆形而不是方块，视觉上更友好
      ctx.beginPath();
      ctx.arc(50, 50, 40, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
      ctx.fill();
      ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 添加文本
      ctx.fillStyle = `hsl(${hue}, 80%, 30%)`;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('图像加载失败', 50, 55);
      
      // 转换为Data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // 加载图像
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('备用图像创建失败'));
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
} 