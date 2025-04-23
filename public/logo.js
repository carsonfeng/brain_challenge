// 在Node.js环境中生成应用图标
const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建不同尺寸的图标
const sizes = [512, 192, 64, 32, 16];

// 为每个尺寸创建图标
sizes.forEach(size => {
  createIcon(size);
});

function createIcon(size) {
  // 创建画布
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 获取画布中心
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;
  
  // 清空画布
  ctx.clearRect(0, 0, size, size);
  
  // 绘制圆形背景
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制边框
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  
  // 绘制卡片图案
  const cardWidth = size * 0.2;
  const cardHeight = size * 0.28;
  const cards = [
    { x: centerX - cardWidth * 0.8, y: centerY - cardHeight * 0.1, rotation: -0.2 },
    { x: centerX, y: centerY, rotation: 0 },
    { x: centerX + cardWidth * 0.8, y: centerY + cardHeight * 0.1, rotation: 0.2 }
  ];
  
  // 绘制卡片
  cards.forEach((card, i) => {
    ctx.save();
    ctx.translate(card.x, card.y);
    ctx.rotate(card.rotation);
    
    // 卡片背景
    ctx.fillStyle = i === 1 ? '#f0f7ff' : 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = size * 0.02;
    ctx.shadowOffsetX = size * 0.005;
    ctx.shadowOffsetY = size * 0.01;
    ctx.beginPath();
    ctx.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, size * 0.02);
    ctx.fill();
    
    // 卡片图案
    ctx.shadowColor = 'transparent';
    const shapes = 3;
    const shapeSize = cardWidth * 0.15;
    const spacing = cardHeight * 0.22;
    
    for (let j = 0; j < shapes; j++) {
      const y = -cardHeight / 2 + cardHeight * 0.25 + j * spacing;
      
      if (i === 0 || i === 2) {
        // 第一张和第三张卡片的图案：圆形
        ctx.fillStyle = ['#FF6B6B', '#4ECDC4', '#FFD166'][j];
        ctx.beginPath();
        ctx.arc(0, y, shapeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 中间卡片的图案：星形
        ctx.fillStyle = ['#FF6B6B', '#4ECDC4', '#FFD166'][j];
        drawStar(ctx, 0, y, 5, shapeSize, shapeSize/2);
      }
    }
    
    ctx.restore();
  });
  
  // 保存图像
  const buffer = canvas.toBuffer('image/png');
  if (size === 512 || size === 192) {
    fs.writeFileSync(`public/logo${size}.png`, buffer);
  } else {
    fs.writeFileSync(`public/favicon${size}.png`, buffer);
  }
}

// 绘制星形的辅助函数
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

console.log('图标已生成到public目录！'); 