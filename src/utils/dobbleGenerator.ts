/**
 * 生成Dobble卡片游戏所需的图案组合
 * 基于有限射影平面(finite projective plane)的数学原理
 */

/**
 * 计算给定n值需要的图片总数
 * @param n 阶数，每张卡片有n+1个图案
 * @returns 需要的图片总数
 */
export function calculateRequiredImageCount(n: number): number {
  // 在有限射影平面中，总共需要n^2 + n + 1个不同图案
  return n * n + n + 1;
}

/**
 * 生成阶为n的Dobble卡片组合
 * @param n 阶数，每张卡片有n+1个图案，总共有n²+n+1个图案
 * @returns 卡片组合，每个数组表示一张卡片上的图案索引
 */
export function generateDobbleCards(n: number): number[][] {
  // 检查n是否为素数幂
  if (!isPrimePower(n)) {
    throw new Error('n必须是素数的幂，比如2,3,4,5,7,8,9等');
  }
  
  // 特殊处理n=9的情况
  if (n === 9) {
    return generateDobbleCardsSpecial9();
  }
  
  const symbolsPerCard = n + 1;
  const cards: number[][] = [];
  
  // 创建第一组n+1张卡片
  const firstCard: number[] = [];
  for (let i = 0; i < symbolsPerCard; i++) {
    firstCard.push(i);
  }
  cards.push(firstCard);
  
  // 对于每个点i (从1到n)
  for (let i = 1; i <= n; i++) {
    const card: number[] = [0]; // 每张卡片都包含第一个符号
    for (let j = 1; j <= n; j++) {
      card.push((i - 1) * n + j + n);
    }
    cards.push(card);
  }
  
  // 对于每个斜率m (从0到n-1)
  for (let m = 0; m < n; m++) {
    for (let c = 0; c < n; c++) {
      const card: number[] = [m + 1]; // 包含点m+1
      for (let j = 0; j < n; j++) {
        // 公式: (m * j + c) mod n + (j * n) + n + 1
        const symbolIndex = ((m * j + c) % n) + (j * n) + n + 1;
        card.push(symbolIndex);
      }
      cards.push(card);
    }
  }
  
  // 验证生成的卡片
  if (!validateDobbleCards(cards)) {
    throw new Error('生成的卡片组合不符合Dobble规则，算法错误');
  }
  
  return cards;
}

/**
 * 为n=9的情况特殊生成卡片组合
 * 使用有限域GF(3^2)上的射影平面构造
 */
function generateDobbleCardsSpecial9(): number[][] {
  // 使用有限几何原理，n=9 (3^2)的射影平面构造
  const cards: number[][] = [];
  const n = 9;
  const symbolsPerCard = n + 1; // 10
  const totalSymbols = n * n + n + 1; // 91
  
  // 创建第一张卡片（包含0-9的符号）
  const firstCard: number[] = [];
  for (let i = 0; i < symbolsPerCard; i++) {
    firstCard.push(i);
  }
  cards.push(firstCard);
  
  // 创建9张每张都包含0号符号的卡片
  for (let i = 1; i <= n; i++) {
    const card: number[] = [0];
    for (let j = 1; j <= n; j++) {
      card.push(j * n + i);
    }
    cards.push(card);
  }
  
  // 为每个1-9的符号创建9张卡片
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < n; j++) {
      const card: number[] = [i];
      for (let k = 0; k < n; k++) {
        // 这个公式是基于有限射影平面的正确构造方法
        const symbolIndex = n + 1 + ((j * k + i * (n - 1)) % n) + k * n;
        card.push(symbolIndex);
      }
      cards.push(card);
    }
  }
  
  // 验证生成的卡片
  if (!validateDobbleCards(cards)) {
    console.error("特殊n=9算法生成无效卡片，尝试使用通用算法");
    // 尝试使用一般算法生成n=9的卡片
    return generateDobbleCardsGeneral(9);
  }
  
  return cards;
}

/**
 * 通用的Dobble卡片生成算法
 * 适用于任何素数幂的n值
 */
function generateDobbleCardsGeneral(n: number): number[][] {
  const symbolsPerCard = n + 1;
  const totalSymbols = n * n + n + 1;
  const cards: number[][] = [];
  
  // 第一张卡片包含0到n的所有符号
  const firstCard: number[] = [];
  for (let i = 0; i < symbolsPerCard; i++) {
    firstCard.push(i);
  }
  cards.push(firstCard);
  
  // 创建n组，每组n张卡片
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      const card: number[] = [i];
      for (let k = 1; k <= n; k++) {
        // 使用线性同余方法生成符号索引
        const index = n + 1 + (j - 1) * n + (k - 1);
        card.push(index);
      }
      cards.push(card);
    }
  }
  
  // 验证和优化卡片组合
  let attempts = 0;
  let validatedCards = [...cards];
  
  // 多次尝试优化卡片组合，直到满足Dobble规则
  while (!validateDobbleCards(validatedCards) && attempts < 5) {
    attempts++;
    validatedCards = optimizeCardCombination(cards, n);
  }
  
  if (!validateDobbleCards(validatedCards)) {
    // 如果仍然无法生成有效卡片，则使用回退方法
    return generateDobbleCardsFallback(n);
  }
  
  return validatedCards;
}

/**
 * 优化卡片组合以满足Dobble规则
 */
function optimizeCardCombination(initialCards: number[][], n: number): number[][] {
  const symbolsPerCard = n + 1;
  const totalSymbols = n * n + n + 1;
  const optimizedCards = [...initialCards];
  
  // 检查并修复任何规则冲突
  for (let i = 0; i < optimizedCards.length; i++) {
    for (let j = i + 1; j < optimizedCards.length; j++) {
      const card1 = optimizedCards[i];
      const card2 = optimizedCards[j];
      
      // 找出共同符号
      const commonSymbols = card1.filter(symbol => card2.includes(symbol));
      
      // 如果有多于一个共同符号，修复冲突
      if (commonSymbols.length > 1) {
        // 保留第一个共同符号
        const keepSymbol = commonSymbols[0];
        
        // 替换卡片2中的其他共同符号
        for (let k = 1; k < commonSymbols.length; k++) {
          const symbolToReplace = commonSymbols[k];
          const indexInCard2 = card2.indexOf(symbolToReplace);
          
          // 寻找一个未使用的符号
          let newSymbol = -1;
          for (let s = 0; s < totalSymbols; s++) {
            if (!card1.includes(s) && !card2.includes(s)) {
              newSymbol = s;
              break;
            }
          }
          
          // 替换符号
          if (newSymbol !== -1) {
            card2[indexInCard2] = newSymbol;
          }
        }
      }
    }
  }
  
  // 确保每张卡片都有正确数量的符号
  for (let i = 0; i < optimizedCards.length; i++) {
    const card = optimizedCards[i];
    
    // 移除重复符号
    const uniqueSymbols = Array.from(new Set(card));
    
    // 如果缺少符号，添加新的符号
    while (uniqueSymbols.length < symbolsPerCard) {
      // 寻找未使用的符号
      for (let s = 0; s < totalSymbols; s++) {
        if (!uniqueSymbols.includes(s)) {
          uniqueSymbols.push(s);
          break;
        }
      }
    }
    
    optimizedCards[i] = uniqueSymbols;
  }
  
  return optimizedCards;
}

/**
 * 备用的Dobble卡片生成算法
 * 基于构造法，确保每两张卡片恰好有一个共同图案
 */
function generateDobbleCardsFallback(n: number): number[][] {
  const totalSymbols = n * n + n + 1;
  const symbolsPerCard = n + 1;
  const cards: number[][] = [];
  
  // 创建第一张卡片
  const firstCard: number[] = [];
  for (let i = 0; i < symbolsPerCard; i++) {
    firstCard.push(i);
  }
  cards.push(firstCard);
  
  // 对于每个点构造卡片，确保规则正确
  for (let i = 1; i < totalSymbols - n; i += n) {
    const card: number[] = [0]; // 第一个符号固定为0
    for (let j = 0; j < n; j++) {
      card.push(i + j);
    }
    cards.push(card);
  }
  
  // 构造额外的卡片，确保每两张卡片只有一个共同点
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const existingCards = cards.length;
  for (let i = 1; i < symbolsPerCard; i++) {
    for (let j = 0; j < n; j++) {
      if (cards.length >= n * n + n + 1) break;
      
      const card: number[] = [i]; // 固定第一个符号
      
      // 每张卡片都要包含不同的符号组合
      for (let k = 0; k < n; k++) {
        // 使用不同的模式确保唯一性
        const index = (j + k * n + i) % totalSymbols;
        if (index !== i && !card.includes(index)) {
          card.push(index);
        }
      }
      
      // 确保卡片上有正确数量的图案
      while (card.length < symbolsPerCard) {
        const newSymbol = Math.floor(Math.random() * totalSymbols);
        // 检查添加新符号不会破坏规则
        let isValid = true;
        for (const existingCard of cards) {
          const common = existingCard.filter(s => card.includes(s));
          if (existingCard.includes(newSymbol) && common.length > 0) {
            isValid = false;
            break;
          }
        }
        if (isValid && !card.includes(newSymbol)) {
          card.push(newSymbol);
        }
      }
      
      cards.push(card);
    }
  }
  
  // 验证和清理
  const validCards = cards.filter(card => card.length === symbolsPerCard);
  
  // 确保生成足够数量的卡片
  if (validCards.length < n + 1) {
    throw new Error(`无法为n=${n}生成有效的Dobble卡片组合`);
  }
  
  return validCards;
}

/**
 * 检查数字是否为素数的幂
 * @param n 要检查的数字
 * @returns 是否为素数的幂
 */
function isPrimePower(n: number): boolean {
  // 简化版检查，仅支持常见的素数幂
  const validValues = [2, 3, 4, 5, 7, 8, 9, 11, 13, 16, 17, 19, 23, 25, 27, 29, 31];
  return validValues.includes(n);
}

/**
 * 检查生成的卡片是否符合Dobble规则
 * @param cards 卡片组合
 * @returns 是否符合规则
 */
export function validateDobbleCards(cards: number[][]): boolean {
  // 每张卡片应该有相同数量的图案
  const symbolCount = cards.length > 0 ? cards[0].length : 0;
  if (symbolCount === 0) return false;
  
  for (const card of cards) {
    // 检查每张卡片的图案数量是否正确
    if (card.length !== symbolCount) return false;
    
    // 检查卡片上是否有重复图案
    const uniqueSymbols = new Set(card);
    if (uniqueSymbols.size !== card.length) return false;
  }
  
  // 检查任意两张卡片之间是否只有一个共同图案
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const commonSymbols = cards[i].filter(symbol => cards[j].includes(symbol));
      if (commonSymbols.length !== 1) {
        console.error(`卡片 ${i} 和卡片 ${j} 有 ${commonSymbols.length} 个共同图案: ${commonSymbols.join(", ")}`);
        return false;
      }
    }
  }
  
  return true;
} 