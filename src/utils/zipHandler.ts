import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 从ZIP文件中提取图片
 * @param file 上传的ZIP文件
 * @returns Promise，包含图片URL和名称的数组
 */
export async function extractImagesFromZip(file: File): Promise<{ url: string, name: string }[]> {
  console.log(`开始从ZIP提取图片: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const images: { url: string, name: string }[] = [];
    const errors: string[] = [];
    
    const filenames = Object.keys(loadedZip.files)
      .filter(filename => {
        // 只处理图片文件
        const lowerFilename = filename.toLowerCase();
        const isDir = loadedZip.files[filename].dir;
        const isImage = (
          lowerFilename.endsWith('.png') || 
          lowerFilename.endsWith('.jpg') || 
          lowerFilename.endsWith('.jpeg') || 
          lowerFilename.endsWith('.gif')
        );
        
        if (isDir) {
          console.log(`跳过目录: ${filename}`);
        } else if (!isImage) {
          console.log(`跳过非图片文件: ${filename}`);
        }
        
        return !isDir && isImage;
      });
    
    console.log(`在ZIP中找到 ${filenames.length} 个有效图片文件`);
    
    // 检查是否找到图片
    if (filenames.length === 0) {
      throw new Error('ZIP包中没有找到任何图片文件。请确保ZIP包中包含.png, .jpg, .jpeg或.gif格式的图片。');
    }
    
    // 使用Promise.allSettled代替Promise.all以避免一个失败导致整体失败
    const results = await Promise.allSettled(
      filenames.map(async (filename) => {
        try {
          const content = await loadedZip.files[filename].async('blob');
          
          // 验证blob是否有效
          if (content.size === 0) {
            throw new Error(`文件 ${filename} 内容为空`);
          }
          
          const name = filename.split('/').pop() || filename;
          const url = URL.createObjectURL(content);
          
          // 验证创建的URL
          if (!url.startsWith('blob:')) {
            throw new Error(`文件 ${filename} 创建URL失败`);
          }
          
          // 预加载图像以验证
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              if (img.width === 0 || img.height === 0) {
                reject(new Error(`文件 ${filename} 加载后尺寸无效`));
              } else {
                console.log(`成功加载图片: ${name}, 尺寸: ${img.width}x${img.height}`);
                resolve();
              }
            };
            
            img.onerror = () => {
              reject(new Error(`文件 ${filename} 无法作为图像加载`));
            };
            
            // 添加超时处理
            const timeout = setTimeout(() => {
              reject(new Error(`文件 ${filename} 加载超时`));
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              console.log(`成功加载图片: ${name}, 尺寸: ${img.width}x${img.height}`);
              resolve();
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error(`文件 ${filename} 无法作为图像加载`));
            };
            
            img.src = url;
          });
          
          return { url, name };
        } catch (error) {
          console.error(`处理ZIP中的文件 ${filename} 时出错:`, error);
          throw error;
        }
      })
    );
    
    // 处理结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        images.push(result.value);
      } else {
        const filename = filenames[index];
        errors.push(`${filename}: ${result.reason?.message || '未知错误'}`);
      }
    });
    
    // 记录结果
    console.log(`成功提取 ${images.length} 张图片，${errors.length} 张图片提取失败`);
    
    if (images.length === 0 && errors.length > 0) {
      throw new Error(`提取图片失败: ${errors.join('; ')}`);
    }
    
    return images;
  } catch (error) {
    console.error('ZIP处理失败:', error);
    throw error;
  }
}

/**
 * 创建并下载包含卡片图片的ZIP文件
 * @param cardImages 卡片图片的Blob数据数组
 */
export async function createAndDownloadZip(cardImages: { blob: Blob, name: string }[]): Promise<void> {
  const zip = new JSZip();
  
  // 将卡片图片添加到ZIP文件中
  cardImages.forEach((card, index) => {
    zip.file(`card_${index + 1}.png`, card.blob);
  });
  
  // 生成ZIP文件并下载
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'dobble_cards.zip');
} 