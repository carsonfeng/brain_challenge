/**
 * 生成默认的测试图片
 */

// 定义12种鲜明的颜色，确保易于识别
const COLORS = [
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 洋红
  '#00FFFF', // 青色
  '#FF8000', // 橙色
  '#8000FF', // 紫色
  '#0080FF', // 天蓝色
  '#FF0080', // 粉色
  '#4CAF50', // 深绿色
  '#FFC107'  // 琥珀色
];

// 定义简单的图标符号
const ICONS = [
  '★', // 星星
  '♥', // 心形
  '♦', // 方块
  '♣', // 梅花
  '♠', // 黑桃
  '✿', // 花朵
  '✓', // 对勾
  '☂', // 雨伞
  '☯', // 太极
  '☀', // 太阳
  '☁', // 云
  '☃', // 雪人
];

/**
 * 生成一组默认图片，用于测试
 * @param count 需要生成的图片数量
 * @returns 图片URL和名称的数组
 */
export function generateDefaultImages(count: number = 50): { url: string, name: string }[] {
  const images: { url: string, name: string }[] = [];
  
  // 确保图片数量不超过颜色种类数量的可能组合数，避免过多重复
  const maxCount = COLORS.length * 8; // 增加形状类型到8种
  const actualCount = Math.min(count, maxCount);
  
  for (let i = 0; i < actualCount; i++) {
    const colorIndex = i % COLORS.length;
    const color = COLORS[colorIndex];
    
    // 生成不同形状的变体
    const shapeType = Math.floor(i / COLORS.length) % 8; // 8种不同形状
    
    // 为每个图像随机选择一个图标
    const iconIndex = Math.floor(Math.random() * ICONS.length);
    const icon = ICONS[iconIndex];
    
    try {
      // 创建Canvas画布
      const canvas = document.createElement('canvas');
      const size = 200; // 增加尺寸，提高清晰度
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }
      
      // 绘制白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      
      // 根据shapeType绘制不同形状
      drawShape(ctx, shapeType, color, size);
      
      // 添加图标
      drawIcon(ctx, icon, color, size);
      
      // 转换为data URL
      const dataUrl = canvas.toDataURL('image/png');
      const shapeName = getShapeName(shapeType);
      const name = `${shapeName}_${colorIndex}_${iconIndex}.png`;
      
      images.push({ url: dataUrl, name });
    } catch (error) {
      console.error('创建默认图像失败:', error);
    }
  }
  
  return images;
}

/**
 * 绘制简单形状
 */
function drawShape(ctx: CanvasRenderingContext2D, shapeType: number, color: string, size: number): void {
  // 添加轻微的渐变效果
  const gradient = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size/2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, adjustColor(color, -30)); // 稍微暗一点的颜色
  
  ctx.fillStyle = gradient;
  
  switch (shapeType) {
    case 0: // 矩形
      ctx.fillRect(size*0.2, size*0.2, size*0.6, size*0.6);
      break;
      
    case 1: // 圆形
      ctx.beginPath();
      ctx.arc(size/2, size/2, size*0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 2: // 三角形
      ctx.beginPath();
      ctx.moveTo(size/2, size*0.2);
      ctx.lineTo(size*0.8, size*0.8);
      ctx.lineTo(size*0.2, size*0.8);
      ctx.fill();
      break;
      
    case 3: // 菱形
      ctx.beginPath();
      ctx.moveTo(size/2, size*0.2);
      ctx.lineTo(size*0.8, size/2);
      ctx.lineTo(size/2, size*0.8);
      ctx.lineTo(size*0.2, size/2);
      ctx.fill();
      break;
      
    case 4: // 五边形
      ctx.beginPath();
      const centerX = size/2;
      const centerY = size/2;
      const radius = size*0.3;
      const sides = 5;
      
      ctx.moveTo(centerX + radius * Math.cos(0), centerY + radius * Math.sin(0));
      for (let i = 1; i <= sides; i++) {
        const angle = i * 2 * Math.PI / sides;
        ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
      }
      
      ctx.fill();
      break;
      
    case 5: // 六边形
      ctx.beginPath();
      drawPolygon(ctx, 6, size/2, size/2, size*0.3);
      ctx.fill();
      break;
      
    case 6: // 星形
      ctx.beginPath();
      drawStar(ctx, size/2, size/2, 5, size*0.3, size*0.15);
      ctx.fill();
      break;
      
    case 7: // 椭圆形
      ctx.beginPath();
      ctx.ellipse(size/2, size/2, size*0.35, size*0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    default:
      ctx.fillRect(size*0.2, size*0.2, size*0.6, size*0.6);
  }
  
  // 添加边框
  ctx.strokeStyle = adjustColor(color, -50);
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * 在形状中心添加图标
 */
function drawIcon(ctx: CanvasRenderingContext2D, icon: string, color: string, size: number): void {
  // 改用直接绘制简单图形而非使用Unicode字符
  const centerX = size/2;
  const centerY = size/2;
  const iconSize = size * 0.15; // 图标大小
  
  // 保存当前状态
  ctx.save();
  
  // 绘制实心圆形图标
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制边框
  ctx.strokeStyle = adjustColor(color, 30); // 浅一点的颜色
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 恢复状态
  ctx.restore();
}

/**
 * 绘制正多边形
 */
function drawPolygon(ctx: CanvasRenderingContext2D, sides: number, centerX: number, centerY: number, radius: number): void {
  ctx.moveTo(centerX + radius * Math.cos(0), centerY + radius * Math.sin(0));
  for (let i = 1; i <= sides; i++) {
    const angle = i * 2 * Math.PI / sides;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
}

/**
 * 绘制星形
 */
function drawStar(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, points: number, outer: number, inner: number): void {
  let step = Math.PI / points;
  
  for (let i = 0; i < 2 * points; i++) {
    let r = (i % 2 === 0) ? outer : inner;
    let angle = i * step;
    
    if (i === 0) {
      ctx.moveTo(centerX + r * Math.cos(angle), centerY + r * Math.sin(angle));
    } else {
      ctx.lineTo(centerX + r * Math.cos(angle), centerY + r * Math.sin(angle));
    }
  }
  
  ctx.closePath();
}

/**
 * 调整颜色亮度
 */
function adjustColor(color: string, amount: number): string {
  // 简单的颜色亮度调整
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 获取形状名称
 */
function getShapeName(shapeType: number): string {
  switch (shapeType) {
    case 0: return 'rectangle';
    case 1: return 'circle';
    case 2: return 'triangle';
    case 3: return 'diamond';
    case 4: return 'pentagon';
    case 5: return 'hexagon';
    case 6: return 'star';
    case 7: return 'ellipse';
    default: return 'shape';
  }
} 