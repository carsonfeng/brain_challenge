import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { generateDobbleCards, validateDobbleCards, calculateRequiredImageCount } from './utils/dobbleGenerator';
import { extractImagesFromZip, createAndDownloadZip } from './utils/zipHandler';
import { renderCard } from './utils/cardRenderer';
import { generateDefaultImages } from './utils/defaultImages';
import { Button, message, Modal, Spin, Progress, Image } from 'antd';
import 'antd/dist/antd.css';

function App() {
  const [symbolCount, setSymbolCount] = useState<number>(5);
  const [images, setImages] = useState<{ url: string, name: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [previewCards, setPreviewCards] = useState<string[]>([]);
  const [useDefaultImages, setUseDefaultImages] = useState<boolean>(true);
  const [requiredImageCount, setRequiredImageCount] = useState<number>(calculateRequiredImageCount(5));
  const [previewMode, setPreviewMode] = useState<'sample' | 'all'>('sample');
  const [allCards, setAllCards] = useState<string[]>([]);
  const [showAllCardsModal, setShowAllCardsModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleImageInputRef = useRef<HTMLInputElement>(null);
  const allCardsModalRef = useRef<HTMLDivElement>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [cardBackground, setCardBackground] = useState<string>('#FFFFFF');
  const [cardBorder, setCardBorder] = useState<string>('#DDDDDD');
  const [cardBorderWidth, setCardBorderWidth] = useState<number>(2);
  const [cardBorderStyle, setCardBorderStyle] = useState<string>('solid');
  const [loadingImages, setLoadingImages] = useState<boolean>(false);

  // 当选择卡片上的图案数量时，更新所需图片数量
  useEffect(() => {
    const count = calculateRequiredImageCount(symbolCount);
    setRequiredImageCount(count);
  }, [symbolCount]);

  // 初始化时加载默认图片
  useEffect(() => {
    if (useDefaultImages) {
      try {
        console.log('加载默认图片...');
        setLoadingImages(true);
        // 加载足够的默认图片
        const defaultImages = generateDefaultImages(Math.max(30, requiredImageCount));
        console.log(`成功生成 ${defaultImages.length} 张默认图片`);
        
        // 显示所有默认图片的URL
        defaultImages.forEach((img, index) => {
          console.log(`图片 ${index}: ${img.url.substring(0, 100)}...`);
        });
        
        setImages(defaultImages);
        
        if (defaultImages.length > 0) {
          // 安全地选择前三张图片进行预览
          const previewCount = Math.min(3, defaultImages.length);
          const previewUrls = defaultImages.slice(0, previewCount).map(img => img.url);
          setPreviewCards(previewUrls);
          
          // 创建测试图像到DOM
          const testDiv = document.createElement('div');
          testDiv.style.position = 'fixed';
          testDiv.style.bottom = '10px';
          testDiv.style.right = '10px';
          testDiv.style.zIndex = '1000';
          testDiv.style.background = '#fff';
          testDiv.style.padding = '5px';
          testDiv.style.border = '1px solid #ccc';
          
          const testImg = document.createElement('img');
          testImg.src = defaultImages[0].url;
          testImg.style.width = '50px';
          testImg.style.height = '50px';
          testImg.onload = () => console.log('测试图像加载成功!');
          testImg.onerror = () => console.error('测试图像加载失败!');
          
          testDiv.appendChild(testImg);
          document.body.appendChild(testDiv);
          
          // 10秒后移除测试div
          setTimeout(() => {
            try {
              document.body.removeChild(testDiv);
            } catch (e) {
              // 忽略
            }
          }, 10000);
        }
      } catch (error) {
        console.error('加载默认图片出错:', error);
        setError('加载默认图片失败，请尝试刷新页面');
      } finally {
        setLoadingImages(false);
      }
    }
  }, [useDefaultImages, requiredImageCount]);

  // 处理点击外部关闭模态框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (allCardsModalRef.current && !allCardsModalRef.current.contains(event.target as Node)) {
        setShowAllCardsModal(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理ZIP文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const extractedImages = await extractImagesFromZip(file);
      
      if (extractedImages.length === 0) {
        setError('ZIP包中没有找到任何图像文件');
        return;
      }
      
      // 成功提取图片后，停止使用默认图片
      setUseDefaultImages(false);
      setImages(extractedImages);
      
      // 检查图片数量是否足够
      if (extractedImages.length < requiredImageCount) {
        setError(`注意：当前上传了${extractedImages.length}张图片，但选择的卡片规模需要至少${requiredImageCount}张不同图片。您可以单独上传补充图片。`);
      }
      
      console.log(`成功从ZIP包中提取了${extractedImages.length}个图像`);
    } catch (err) {
      setError('无法处理ZIP文件，请确保文件格式正确');
      console.error(err);
    }
  };

  // 处理单个图片上传
  const handleSingleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setError('');
      
      // 创建一个新的图片数组，包含现有图片和新上传的图片
      const newImages = [...images];
      const invalidFiles: string[] = [];
      
      // 处理每个上传的图片
      Array.from(files).forEach(file => {
        // 检查文件是否为图片类型
        if (file.type.startsWith('image/')) {
          try {
            // 检查文件大小（限制为最大5MB，减小大小限制）
            if (file.size > 5 * 1024 * 1024) {
              invalidFiles.push(`${file.name} (太大，超过5MB)`);
              return;
            }
            
            // 创建安全的Blob URL
            const url = URL.createObjectURL(file);
            
            // 预加载图片以验证其有效性
            const img = document.createElement('img');
            img.crossOrigin = "anonymous"; // 添加跨域支持
            
            // 添加加载和错误事件处理器
            img.onload = () => {
              console.log(`成功预加载图片: ${file.name}, 尺寸: ${img.width}x${img.height}`);
            };
            
            img.onerror = () => {
              console.error(`图片 ${file.name} 预加载失败`);
              // 错误处理：不阻止添加，但记录错误
            };
            
            img.src = url;
            
            // 添加到图片数组
            newImages.push({
              url,
              name: file.name
            });
            
            console.log(`成功加载图片: ${file.name}, URL: ${url.substring(0, 100)}...`);
          } catch (err) {
            console.error(`处理图片 ${file.name} 时出错:`, err);
            invalidFiles.push(`${file.name} (处理失败)`);
          }
        } else {
          invalidFiles.push(`${file.name} (不是支持的图片格式)`);
        }
      });
      
      // 更新图片数组
      setImages(newImages);
      
      // 更新预览（安全地选择前三张图片）
      if (newImages.length > 0) {
        try {
          const previewCount = Math.min(3, newImages.length);
          const previewUrls = newImages.slice(0, previewCount).map(img => img.url);
          
          // 验证URL是否有效
          console.log("预览URLs:", previewUrls);
          setPreviewCards(previewUrls);
        } catch (previewErr) {
          console.error("设置预览图片时出错:", previewErr);
        }
      }
      
      // 如果是从默认图片开始上传额外图片，则关闭默认图片模式
      if (useDefaultImages && newImages.length > 0) {
        setUseDefaultImages(false);
      }
      
      // 检查图片数量是否足够
      if (newImages.length < requiredImageCount) {
        setError(`注意：当前有${newImages.length}张图片，但选择的卡片规模需要至少${requiredImageCount}张不同图片。请继续上传补充图片。${
          invalidFiles.length > 0 ? '\n\n无效文件: ' + invalidFiles.join(', ') : ''
        }`);
      } else if (invalidFiles.length > 0) {
        setError(`有些文件无法处理: ${invalidFiles.join(', ')}`);
      } else {
        setError('');
      }
      
      // 清空输入框，以便重复上传
      if (singleImageInputRef.current) {
        singleImageInputRef.current.value = '';
      }
    } catch (err) {
      console.error('处理图片上传时出错:', err);
      setError('处理图片时出错，请尝试其他图片或刷新页面');
    }
  };

  // 重置为默认图片
  const resetToDefaultImages = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (singleImageInputRef.current) {
      singleImageInputRef.current.value = '';
    }
    
    try {
      setError('');
      setUseDefaultImages(true);
      console.log('重置为默认图片...');
      
      // 加载足够的默认图片
      const defaultImages = generateDefaultImages(Math.max(30, requiredImageCount));
      console.log(`成功生成 ${defaultImages.length} 张默认图片`);
      
      setImages(defaultImages);
      
      if (defaultImages.length > 0) {
        // 安全地选择前三张图片进行预览
        const previewCount = Math.min(3, defaultImages.length);
        const previewUrls = defaultImages.slice(0, previewCount).map(img => img.url);
        setPreviewCards(previewUrls);
      }
      
      setAllCards([]);
    } catch (error) {
      console.error('重置为默认图片出错:', error);
      setError('重置为默认图片失败，请尝试刷新页面');
    }
  };

  // 测试图片加载
  const testImageLoading = () => {
    try {
      setError('');
      console.log('测试图片加载...');
      
      // 创建一个测试div显示图片
      const testDiv = document.createElement('div');
      testDiv.style.position = 'fixed';
      testDiv.style.left = '50%';
      testDiv.style.top = '50%';
      testDiv.style.transform = 'translate(-50%, -50%)';
      testDiv.style.zIndex = '9999';
      testDiv.style.background = 'white';
      testDiv.style.padding = '20px';
      testDiv.style.border = '1px solid #ccc';
      testDiv.style.borderRadius = '8px';
      testDiv.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
      testDiv.style.maxWidth = '90%';
      testDiv.style.maxHeight = '90vh';
      testDiv.style.overflow = 'auto';
      
      // 添加关闭按钮
      const closeButton = document.createElement('button');
      closeButton.textContent = '关闭测试';
      closeButton.style.display = 'block';
      closeButton.style.margin = '10px 0 20px';
      closeButton.style.padding = '8px 15px';
      closeButton.style.background = '#6a1b9a';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => document.body.removeChild(testDiv);
      testDiv.appendChild(closeButton);
      
      // 添加标题
      const title = document.createElement('h3');
      title.textContent = '图片加载测试';
      title.style.margin = '10px 0 20px';
      title.style.color = '#6a1b9a';
      testDiv.appendChild(title);

      // 添加当前图片状态信息
      const infoSection = document.createElement('div');
      infoSection.style.margin = '0 0 20px';
      infoSection.style.padding = '10px';
      infoSection.style.background = '#f5f5f5';
      infoSection.style.borderRadius = '4px';
      
      const infoText = document.createElement('p');
      infoText.innerHTML = `
        <strong>当前图片信息：</strong><br>
        已加载图片: ${images.length}张<br>
        需要图片: ${requiredImageCount}张<br>
        使用默认图片: ${useDefaultImages ? '是' : '否'}
      `;
      infoSection.appendChild(infoText);
      testDiv.appendChild(infoSection);
      
      // 添加上传测试图片功能
      const uploadSection = document.createElement('div');
      uploadSection.style.margin = '20px 0';
      uploadSection.style.padding = '15px';
      uploadSection.style.background = '#f0f7ff';
      uploadSection.style.borderRadius = '4px';
      uploadSection.style.border = '1px dashed #2196f3';
      
      const uploadTitle = document.createElement('h4');
      uploadTitle.textContent = '测试单张图片';
      uploadTitle.style.margin = '0 0 10px';
      uploadSection.appendChild(uploadTitle);
      
      const uploadHint = document.createElement('p');
      uploadHint.textContent = '从这里直接上传一张图片进行测试，看是否能正确显示';
      uploadHint.style.margin = '0 0 10px';
      uploadHint.style.fontSize = '0.9rem';
      uploadSection.appendChild(uploadHint);
      
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.style.display = 'block';
      uploadInput.style.margin = '10px 0';
      
      const testImageContainer = document.createElement('div');
      testImageContainer.style.marginTop = '15px';
      testImageContainer.style.textAlign = 'center';
      testImageContainer.style.minHeight = '200px';
      testImageContainer.style.display = 'none';
      
      uploadInput.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          
          // 显示文件信息
          const fileInfo = document.createElement('div');
          fileInfo.style.margin = '10px 0';
          fileInfo.style.padding = '8px';
          fileInfo.style.background = '#e8f5e9';
          fileInfo.style.borderRadius = '4px';
          fileInfo.innerHTML = `
            <strong>文件信息：</strong><br>
            名称: ${file.name}<br>
            大小: ${(file.size / 1024).toFixed(2)}KB<br>
            类型: ${file.type}
          `;
          testImageContainer.innerHTML = '';
          testImageContainer.appendChild(fileInfo);
          testImageContainer.style.display = 'block';
          
          // 创建图片测试
          const url = URL.createObjectURL(file);
          const img = document.createElement('img');
          img.style.maxWidth = '100%';
          img.style.maxHeight = '300px';
          img.style.border = '1px solid #ddd';
          img.style.margin = '10px 0';
          img.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
          
          img.onload = () => {
            const imgInfo = document.createElement('div');
            imgInfo.style.color = 'green';
            imgInfo.innerHTML = `图片加载成功! 尺寸: ${img.width}x${img.height}px`;
            testImageContainer.appendChild(imgInfo);
          };
          
          img.onerror = () => {
            const imgInfo = document.createElement('div');
            imgInfo.style.color = 'red';
            imgInfo.innerHTML = `图片加载失败!`;
            testImageContainer.appendChild(imgInfo);
          };
          
          img.src = url;
          testImageContainer.appendChild(img);
          
          // 尝试添加到图片库
          const addButton = document.createElement('button');
          addButton.textContent = '将此图片添加到图片库';
          addButton.style.display = 'block';
          addButton.style.margin = '15px auto';
          addButton.style.padding = '8px 15px';
          addButton.style.background = '#4CAF50';
          addButton.style.color = 'white';
          addButton.style.border = 'none';
          addButton.style.borderRadius = '4px';
          addButton.style.cursor = 'pointer';
          
          addButton.onclick = () => {
            // 添加图片到图片库
            setImages(prev => [...prev, { url, name: file.name }]);
            addButton.textContent = '已添加!';
            addButton.disabled = true;
            addButton.style.background = '#ccc';
            
            // 更新信息
            infoText.innerHTML = `
              <strong>当前图片信息：</strong><br>
              已加载图片: ${images.length + 1}张<br>
              需要图片: ${requiredImageCount}张<br>
              使用默认图片: ${useDefaultImages ? '是' : '否'}
            `;
          };
          
          testImageContainer.appendChild(addButton);
        }
      };
      
      uploadSection.appendChild(uploadInput);
      uploadSection.appendChild(testImageContainer);
      testDiv.appendChild(uploadSection);
      
      // 添加默认图像测试
      const testDefaultImages = generateDefaultImages(5);
      
      const defaultSection = document.createElement('div');
      defaultSection.style.margin = '20px 0';
      
      const defaultTitle = document.createElement('h4');
      defaultTitle.textContent = '默认图片渲染测试';
      defaultTitle.style.margin = '0 0 10px';
      defaultSection.appendChild(defaultTitle);
      
      const defaultImagesContainer = document.createElement('div');
      defaultImagesContainer.style.display = 'flex';
      defaultImagesContainer.style.flexWrap = 'wrap';
      defaultImagesContainer.style.gap = '10px';
      defaultImagesContainer.style.justifyContent = 'center';
      
      testDefaultImages.forEach((img, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';
        imgContainer.style.border = '1px solid #ddd';
        imgContainer.style.padding = '5px';
        
        const imgElement = document.createElement('img');
        imgElement.src = img.url;
        imgElement.alt = `测试图片 ${index + 1}`;
        imgElement.style.width = '80px';
        imgElement.style.height = '80px';
        imgElement.style.objectFit = 'contain';
        
        imgElement.onload = () => {
          imgContainer.style.background = '#e6ffe6';
          console.log(`测试图片 ${index + 1} 加载成功`);
        };
        
        imgElement.onerror = () => {
          imgContainer.style.background = '#ffcccc';
          console.error(`测试图片 ${index + 1} 加载失败`);
        };
        
        // 添加图片编号
        const label = document.createElement('div');
        label.textContent = `#${index + 1}`;
        label.style.position = 'absolute';
        label.style.bottom = '0';
        label.style.right = '0';
        label.style.background = 'rgba(0,0,0,0.5)';
        label.style.color = 'white';
        label.style.padding = '2px 5px';
        label.style.fontSize = '10px';
        
        imgContainer.appendChild(imgElement);
        imgContainer.appendChild(label);
        defaultImagesContainer.appendChild(imgContainer);
      });
      
      defaultSection.appendChild(defaultImagesContainer);
      testDiv.appendChild(defaultSection);
      
      // 显示用户图片库中的前10张图片
      if (images.length > 0) {
        const userImagesSection = document.createElement('div');
        userImagesSection.style.margin = '20px 0';
        
        const userImagesTitle = document.createElement('h4');
        userImagesTitle.textContent = '当前图片库预览';
        userImagesTitle.style.margin = '0 0 10px';
        userImagesSection.appendChild(userImagesTitle);
        
        const userImagesContainer = document.createElement('div');
        userImagesContainer.style.display = 'flex';
        userImagesContainer.style.flexWrap = 'wrap';
        userImagesContainer.style.gap = '10px';
        userImagesContainer.style.justifyContent = 'center';
        
        const showCount = Math.min(10, images.length);
        images.slice(0, showCount).forEach((img, index) => {
          const imgContainer = document.createElement('div');
          imgContainer.style.position = 'relative';
          imgContainer.style.border = '1px solid #ddd';
          imgContainer.style.padding = '5px';
          
          const imgElement = document.createElement('img');
          imgElement.src = img.url;
          imgElement.alt = `用户图片 ${index + 1}`;
          imgElement.style.width = '80px';
          imgElement.style.height = '80px';
          imgElement.style.objectFit = 'contain';
          
          imgElement.onload = () => {
            imgContainer.style.background = '#e6ffe6';
            console.log(`用户图片 ${index + 1} 加载成功`);
          };
          
          imgElement.onerror = () => {
            imgContainer.style.background = '#ffcccc';
            console.error(`用户图片 ${index + 1} 加载失败`);
          };
          
          // 添加图片编号
          const label = document.createElement('div');
          label.textContent = `#${index + 1}`;
          label.style.position = 'absolute';
          label.style.bottom = '0';
          label.style.right = '0';
          label.style.background = 'rgba(0,0,0,0.5)';
          label.style.color = 'white';
          label.style.padding = '2px 5px';
          label.style.fontSize = '10px';
          
          imgContainer.appendChild(imgElement);
          imgContainer.appendChild(label);
          userImagesContainer.appendChild(imgContainer);
        });
        
        userImagesSection.appendChild(userImagesContainer);
        testDiv.appendChild(userImagesSection);
      }
      
      document.body.appendChild(testDiv);
    } catch (error) {
      console.error('测试图片加载失败:', error);
      setError('测试图片加载失败');
    }
  };

  // 预览所有卡片
  const previewAllCards = async () => {
    if (isGenerating) {
      message.info('正在生成中，请稍候');
      return;
    }
    
    if (symbolCount <= 0) {
      message.error('请先设置符号数量');
      return;
    }
    
    if (symbolCount === 9) {
      message.error('10个图案/卡片选项暂不可用，请选择其他选项');
      return;
    }
    
    if (images.length < symbolCount + 1) {
      message.error(`符号数量 ${symbolCount} 需要至少 ${symbolCount + 1} 张图片才能生成卡片`);
      return;
    }

    // 开始生成
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // 获取可能的卡片组合
      const cardCombinations = generateDobbleCards(symbolCount);
      
      // 验证生成的组合是否有效
      const isValid = validateDobbleCards(cardCombinations);
      if (!isValid) {
        // 错误处理 - 特殊情况，尤其是n=9的情况
        if (symbolCount === 9) {
          message.error(`n=9配置下生成卡片失败，请使用n=8或其他值`);
        } else {
          message.error(`生成卡片失败: 卡片组合验证失败`);
        }
        setIsGenerating(false);
        return;
      }
      
      console.log(`将生成 ${cardCombinations.length} 张卡片进行预览`);
      
      // 生成所有可能的卡片
      const cardsToShow = cardCombinations;
      
      // 渲染单张卡片的函数
      const renderCardAsync = async (card: number[], index: number) => {
        try {
          // 获取图片并绘制
          const cardCanvas = document.createElement('canvas');
          const cardCtx = cardCanvas.getContext('2d');
          if (!cardCtx) {
            console.error(`卡片 ${index + 1} 创建Canvas上下文失败`);
            return { success: false, url: '', index };
          }
          
          // 设置Canvas大小为2100x2100，在这个分辨率下生成，再缩小展示，以提高清晰度
          cardCanvas.width = 2100;
          cardCanvas.height = 2100;
          
          // 使用设置的背景色
          cardCtx.fillStyle = cardBackground;
          cardCtx.beginPath();
          cardCtx.arc(cardCanvas.width/2, cardCanvas.height/2, cardCanvas.width/2, 0, Math.PI * 2);
          cardCtx.fill();
          
          // 添加边框
          if (cardBorderWidth > 0) {
            cardCtx.strokeStyle = cardBorder;
            cardCtx.lineWidth = cardBorderWidth * 3; // 放大边框宽度以适应高分辨率
            cardCtx.beginPath();
            cardCtx.arc(cardCanvas.width/2, cardCanvas.height/2, cardCanvas.width/2 - cardCtx.lineWidth/2, 0, Math.PI * 2);
            cardCtx.stroke();
          }
          
          // 绘制所有图像
          for (let j = 0; j < card.length; j++) {
            const symbolIndex = card[j];
            const img = document.createElement('img');
            
            // 生成相对于中心的位置
            // 使用黄金角度分布算法，可以使元素均匀分布在圆形区域内
            const centerX = cardCanvas.width / 2;
            const centerY = cardCanvas.height / 2;
            
            // 为每张卡片设置一个固定的起始角度（使用卡片索引作为种子）
            const cardSeed = (index * 7919) % 360;
            const startAngle = (cardSeed * Math.PI) / 180;
            
            // 黄金角度约为137.5度
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            
            // 调整分布参数
            const totalSymbols = card.length;
            
            // 正常图像数量(8个及以下)的处理
            const minRadius = cardCanvas.width * 0.08; // 增加内圈留空
            
            // 根据卡片上的总符号数调整最大半径
            // 缩小最大半径，让图像远离边缘，防止被切割
            const maxRadiusScale = totalSymbols <= 6 ? 0.42 : (totalSymbols <= 8 ? 0.38 : 0.36); // 减小最大半径
            const maxRadius = cardCanvas.width * maxRadiusScale;
            
            // 计算该符号的角度和距离
            const angle = startAngle + j * goldenAngle;
            
            // 使用平方根分布，这会让图像在整个可用空间更加均匀分布
            const normalizedIndex = j / (totalSymbols - 1 || 1); // 避免除以零
            let radius;
            if (totalSymbols <= 3) {
              // 对于少量图像，使用特殊分布
              radius = maxRadius * 0.6; // 进一步将图像向内移
            } else {
              // 对于更多图像，使用平方根分布
              radius = minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedIndex);
              
              // 对半数图像做轻微内移调整，避免过于规则
              if (j % 2 === 0 && totalSymbols > 6) {
                radius *= 0.85; // 增加内移量
              }
            }
            
            // 计算位置
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // 图片大小随位置变化，中心大，边缘小
            // 根据卡片上的总图像数量动态调整大小，减小整体尺寸防止切割
            const baseSizePercent = card.length <= 6 ? 0.24 : 0.18; // 全局减小图片尺寸
            const maxSize = cardCanvas.width * baseSizePercent;
            const minSize = cardCanvas.width * (baseSizePercent * 0.85);
            // 根据到中心的距离计算大小，越靠近中心越大
            const distanceRatio = radius / maxRadius; // 0到1之间的比例
            const imgSize = maxSize - (maxSize - minSize) * distanceRatio;
            
            // 计算旋转角度 - 图片朝向不同方向
            // 计算图片相对圆心的角度
            const angleToCenter = Math.atan2(y - centerY, x - centerX);
            
            // 选择旋转策略
            let rotation: number = 0;
            const directionRandom = Math.random();
            
            if (directionRandom < 0.7) {
              // 70%概率朝向外侧 - 更符合现实卡片观感
              rotation = angleToCenter;
            } else if (directionRandom < 0.9) {
              // 20%概率朝向内侧
              rotation = angleToCenter + Math.PI;
            } else {
              // 10%概率完全随机
              rotation = Math.random() * Math.PI * 2;
            }
            
            // 添加较小随机扰动 (±15度)
            rotation += (Math.random() - 0.5) * Math.PI / 12;
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                try {
                  // 绘制旋转的图像
                  cardCtx.save();
                  cardCtx.translate(x, y);
                  cardCtx.rotate(rotation);
                  cardCtx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
                  cardCtx.restore();
                  resolve();
                } catch (err) {
                  console.error(`绘制图片时出错 (卡片 ${index + 1}, 符号 ${symbolIndex})`);
                  reject(new Error(`绘制图片失败`));
                }
              };
              
              img.onerror = () => {
                console.error(`加载图片时出错 (卡片 ${index + 1}, 符号 ${symbolIndex})`);
                reject(new Error(`加载图片失败`));
              };
              
              // 设置图片源
              img.src = images[symbolIndex].url;
            });
          }
          
          // 转换为数据URL
          const cardUrl = cardCanvas.toDataURL('image/png');
          
          return { success: true, url: cardUrl, index };
        } catch (error) {
          console.error(`渲染卡片 ${index + 1} 时出错:`, error);
          return { success: false, url: '', index };
        }
      };
      
      // 分批处理
      const results: {success: boolean, url: string, index: number}[] = [];
      const batchSize = cardsToShow.length; // 修改为等于卡片总数，确保一次处理所有卡片
      const totalBatches = Math.ceil(cardsToShow.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, cardsToShow.length);
        const batch = cardsToShow.slice(start, end);
        
        console.log(`处理卡片 ${start+1} 到 ${end} (共 ${cardsToShow.length} 张)`);
        
        // 并行处理所有卡片
        const batchPromises = batch.map((card, i) => 
          renderCardAsync(card, start + i)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 更新状态，显示已渲染的卡片
        const successResults = results
          .filter(result => result.success)
          .sort((a, b) => a.index - b.index)
          .map(result => result.url);
          
        setAllCards(successResults);
        
        // 更新进度
        setProgress(Math.round((end / cardsToShow.length) * 100));
      }
      
      // 最后更新一次状态
      const successResults = results
        .filter(result => result.success)
        .sort((a, b) => a.index - b.index)
        .map(result => result.url);
        
      setAllCards(successResults);
      console.log(`成功渲染 ${successResults.length} 张卡片`);
      
    } catch (error) {
      console.error('预览卡片失败:', error);
      message.error('预览卡片失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
    
    // 显示模态框
    setShowAllCardsModal(true);
  };

  // 生成卡片并下载
  const generateCards = async () => {
    if (images.length === 0) {
      setError('没有可用图像');
      return;
    }

    if (images.length < requiredImageCount) {
      setError(`图片不足，需${requiredImageCount}张，现有${images.length}张`);
      return;
    }
    
    if (symbolCount === 9) {
      setError('10个图案/卡片选项暂不可用，请选择其他选项');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      setProgress(0);

      // 生成卡片组合
      const cards = generateDobbleCards(symbolCount);
      
      // 验证生成的卡片是否符合Dobble规则
      const isValid = validateDobbleCards(cards);
      if (!isValid) {
        console.error(`生成卡片组合验证失败，尝试使用回退算法`);
        
        // 错误处理 - 特殊情况，尤其是n=9的情况
        if (symbolCount === 9) {
          // 使用n=8或n=7，然后添加额外符号
          const fallbackN = 8;
          console.log(`尝试使用n=${fallbackN}作为回退方案`);
          const fallbackCards = generateDobbleCards(fallbackN);
          if (validateDobbleCards(fallbackCards)) {
            console.log(`使用n=${fallbackN}的卡片组合作为替代`);
            // 成功使用回退方案
            throw new Error(`生成n=9的卡片失败，请使用n=8或其他有效值`);
          } else {
            throw new Error('卡片组合不符合规则，请选择其他符号数量');
          }
        } else {
          throw new Error('卡片组合不符合规则');
        }
      }

      // 使用深度复制图像，防止引用问题
      const imagesCopy = images.map(img => ({
        url: img.url,
        name: img.name
      }));

      // 传递样式参数
      const styleOptions = {
        background: cardBackground,
        borderColor: cardBorder,
        borderWidth: cardBorderWidth,
        borderStyle: cardBorderStyle
      };

      // 渲染每张卡片
      const renderedCards: { blob: Blob, name: string }[] = [];
      
      console.log('开始生成卡片，总计:', cards.length);
      
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        try {
          console.log(`渲染卡片 ${i+1}/${cards.length}`);
          // 传递样式参数给renderCard函数
          const renderedCard = await renderCard(card, imagesCopy, styleOptions);
          renderedCards.push(renderedCard);
        } catch (error) {
          console.error(`渲染卡片 ${i+1} 失败:`, error);
          
          // 创建错误卡片
          const errorCanvas = document.createElement('canvas');
          errorCanvas.width = 800;
          errorCanvas.height = 800;
          const ctx = errorCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 800, 800);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(400, 400, 398, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'red';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('卡片渲染失败', 400, 400);
          }
          
          // 转换为Blob
          await new Promise<void>((resolve) => {
            errorCanvas.toBlob(blob => {
              if (blob) {
                renderedCards.push({
                  blob,
                  name: `error_card_${i + 1}.png`
                });
              }
              resolve();
            });
          });
        }
        
        // 更新进度
        setProgress(Math.floor((i + 1) / cards.length * 100));
      }

      if (renderedCards.length === 0) {
        throw new Error('没有成功生成任何卡片');
      }

      // 创建并下载ZIP文件
      await createAndDownloadZip(renderedCards);
      
      setIsGenerating(false);
      setProgress(100);
      
      alert(`成功生成了${renderedCards.length}张卡片，已打包为ZIP文件供下载`);
    } catch (err) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : '生成卡片时出错');
      console.error(err);
    }
  };

  // 安全获取卡片数量的函数
  const getSafeCardCount = (symbolCount: number): number => {
    if (symbolCount <= 2) return 0;
    
    try {
      // 特殊处理一些会导致错误的情况
      if (symbolCount === 6) return 7;
      
      // 使用射影平面几何公式计算
      // 对于n阶有限射影平面，点数为n^2+n+1
      const n = symbolCount - 1; // 因为我们用的是卡片上的图案数量，而不是n值
      return n*n + n + 1;
    } catch (error) {
      console.error('获取卡片数量时出错:', error);
      return 0;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>脑力挑战卡片生成器</h1>
        <p>生成类似Dobble游戏的卡片，任意两张卡片之间只有一个相同图案</p>
      </header>
      
      <main className="App-main">
        <section className="config-section">
          <h2>快速设置</h2>
          
          <div className="form-group">
            <label htmlFor="symbolCount">每张卡片图案数量：</label>
            <select 
              id="symbolCount" 
              value={symbolCount} 
              onChange={(e) => {
                const value = Number(e.target.value);
                setSymbolCount(value);
              }}
            >
              <option value={2}>3个/卡片 (需7张图)</option>
              <option value={3}>4个/卡片 (需13张图)</option>
              <option value={4}>5个/卡片 (需21张图)</option>
              <option value={5}>6个/卡片 (需31张图)</option>
              <option value={7}>8个/卡片 (需57张图)</option>
            </select>
            <p className="image-count-info">
              已有<strong>{images.length}</strong>张，需<strong>{requiredImageCount}</strong>张
              {images.length < requiredImageCount && <span className="warning-text">（不足）</span>}
            </p>
          </div>
          
          <div className="form-group">
            <div className="image-source-selector">
              <button 
                className={`source-button ${useDefaultImages ? 'active' : ''}`}
                onClick={resetToDefaultImages}
                style={{ backgroundColor: useDefaultImages ? '#2563EB' : '#f0f0f0' }}
              >
                默认图案
              </button>
              <span className="source-divider">或</span>
              <div className="upload-container">
                <label htmlFor="fileInput" className="upload-label">上传ZIP包</label>
                <input 
                  type="file" 
                  id="fileInput" 
                  ref={fileInputRef}
                  accept=".zip" 
                  onChange={handleFileChange} 
                />
              </div>
            </div>
            <p className="help-text">
              {useDefaultImages 
                ? '使用基本图形图案' 
                : '上传PNG/JPG图像，建议透明背景'}
            </p>

            <div className="additional-upload">
              <label htmlFor="singleImageInput" className="upload-label">单独上传图片</label>
              <input 
                type="file" 
                id="singleImageInput" 
                ref={singleImageInputRef}
                accept="image/*" 
                onChange={handleSingleImageUpload}
                multiple
              />
              <p className="help-text">可选择多张图片同时上传</p>
            </div>
          </div>
          
          <div className="form-group card-style-options" style={{marginBottom: '15px'}}>
            <h3>卡片样式</h3>
            <div className="style-grid">
              <div className="style-item">
                <label htmlFor="cardBackground">底色：</label>
                <input 
                  type="color" 
                  id="cardBackground" 
                  value={cardBackground} 
                  onChange={(e) => setCardBackground(e.target.value)}
                />
              </div>
              
              <div className="style-item">
                <label htmlFor="cardBorder">边框色：</label>
                <input 
                  type="color" 
                  id="cardBorder" 
                  value={cardBorder} 
                  onChange={(e) => setCardBorder(e.target.value)}
                />
              </div>
              
              <div className="style-item">
                <label htmlFor="cardBorderWidth">边框粗细：</label>
                <select
                  id="cardBorderWidth"
                  value={cardBorderWidth}
                  onChange={(e) => setCardBorderWidth(Number(e.target.value))}
                >
                  <option value={0}>无边框</option>
                  <option value={1}>细</option>
                  <option value={2}>中</option>
                  <option value={4}>粗</option>
                </select>
              </div>
            </div>
          </div>
          
          {error && (
            <div style={{
              padding: '10px 15px',
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  color: '#ff4d4f',
                  fontSize: '14px',
                  marginRight: '8px',
                  fontWeight: 'bold'
                }}>!</div>
                <div style={{ color: '#434343' }}>{error}</div>
              </div>
            </div>
          )}
          
          <div className="button-group">
            <button 
              className="preview-button" 
              onClick={previewAllCards}
              disabled={isGenerating || images.length === 0 || images.length < requiredImageCount}
              style={{
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: (isGenerating || images.length === 0 || images.length < requiredImageCount) ? 'not-allowed' : 'pointer',
                opacity: (isGenerating || images.length === 0 || images.length < requiredImageCount) ? 0.6 : 1
              }}
            >
              {isGenerating ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.8)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  生成预览中...
                </div>
              ) : '预览卡片'}
            </button>
            
            <button 
              className="generate-button" 
              onClick={generateCards}
              disabled={isGenerating || images.length === 0 || images.length < requiredImageCount}
            >
              {isGenerating ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.8)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  正在生成...
                </div>
              ) : '生成并下载'}
            </button>
          </div>
        </section>
        
        <section className="info-section">
          <h2>说明</h2>
          
          <div className="update-notification">
            <h3>更新通知</h3>
            <ul>
              <li>优化图像布局，卡片设计更美观</li>
              <li>提升应用性能，加快卡片生成速度</li>
              <li>每张卡片最多支持8个图案</li>
            </ul>
          </div>
          
          <p>生成的卡片将以圆形呈现，根据选择的参数自动计算最佳图案分布。</p>
          
          <div className="image-requirements">
            <h3>图片数量要求：</h3>
            <ul className="image-requirement-list">
              <li>3个图案/卡片 - 需要7张图片</li>
              <li>4个图案/卡片 - 需要13张图片</li>
              <li>5个图案/卡片 - 需要21张图片</li>
              <li>6个图案/卡片 - 需要31张图片</li>
              <li>8个图案/卡片 - 需要57张图片</li>
            </ul>
          </div>
          
          <p>推荐使用透明背景PNG图像，简单清晰的图案效果最佳。</p>
        </section>
      </main>
      
      <footer className="App-footer">
        <p>© {new Date().getFullYear()} 脑力挑战卡片生成器</p>
      </footer>

      {showAllCardsModal && (
        <div className="modal-overlay">
          <div className="modal-content" ref={allCardsModalRef} style={{ maxWidth: '90vw', width: 'auto', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>卡片预览 ({allCards.length} 张，共 {symbolCount > 0 ? getSafeCardCount(symbolCount) : 0} 张)</h3>
              <button 
                className="close-button"
                onClick={() => setShowAllCardsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {isGenerating && (
                <div style={{ 
                  padding: '10px', 
                  margin: '0 0 20px',
                  background: '#e3f2fd',
                  color: '#0d47a1',
                  borderRadius: '4px',
                  border: '1px solid #bbdefb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '3px solid #bbdefb',
                    borderTopColor: '#1976d2',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  正在生成卡片，已完成: {progress}%（{allCards.length} 张 / {symbolCount > 0 ? getSafeCardCount(symbolCount) : 0} 张）
                </div>
              )}
              {!isGenerating && allCards.length < getSafeCardCount(symbolCount) && (
                <div style={{ 
                  padding: '10px', 
                  margin: '0 0 20px',
                  background: '#fff3cd',
                  color: '#856404',
                  borderRadius: '4px',
                  border: '1px solid #ffeeba'
                }}>
                  提示：当前只显示了部分卡片。点击"全部预览"按钮生成所有卡片进行预览。
                </div>
              )}
              <div className="cards-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '15px',
                justifyItems: 'center' 
              }}>
                {allCards.length === 0 && !isGenerating ? (
                  <div className="no-cards-message">没有可预览的卡片</div>
                ) : (
                  allCards.map((url, index) => (
                    <div className="card-preview-item" key={index} style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '180px'
                    }}>
                      <img 
                        src={url} 
                        alt={`卡片 ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '50%',
                          border: '2px solid #ddd',
                          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
                        }}
                        onError={(e) => {
                          // 处理图片加载失败
                          console.error(`卡片预览图片 ${index + 1} 加载失败`);
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%22150%22%20r%3D%22149%22%20fill%3D%22white%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22150%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20fill%3D%22red%22%20text-anchor%3D%22middle%22%3E%E5%9B%BE%E5%83%8F%E5%8A%A0%E8%BD%BD%E9%94%99%E8%AF%AF%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                      />
                      <div className="card-number" style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        backgroundColor: 'rgba(106, 27, 154, 0.8)',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>#{index + 1}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="close-modal-button"
                onClick={() => setShowAllCardsModal(false)}
                style={{
                  backgroundColor: '#6a1b9a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
              >
                关闭预览
              </button>
              {!isGenerating && allCards.length < getSafeCardCount(symbolCount) && (
                <button 
                  className="preview-all-button" 
                  onClick={previewAllCards}
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 20px',
                    marginLeft: '10px',
                    cursor: 'pointer'
                  }}
                >
                  全部预览
                </button>
              )}
              <button 
                className="generate-button" 
                onClick={generateCards}
                disabled={isGenerating}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 20px',
                  marginLeft: '10px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.7 : 1
                }}
              >
                立即生成并下载 ({symbolCount > 0 ? getSafeCardCount(symbolCount) : 0}张)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
