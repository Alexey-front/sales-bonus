/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
   if (discount === 0) {
    return sale_price * quantity;
   }
   const discountCalc = 1 - discount / 100;
   return sale_price * quantity * discountCalc;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller
    if(index === 0) {
        return profit * (15 / 100)
    }
    else if(index === 1 || index === 2) {
        return profit * (10 / 100)
    }
    else if(index === total - 1) {
        return 0;
    }
    else {
        return profit * (5 / 100);
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if(!options || typeof options !== "object") {
        throw new Error('Options должен быть объектом')
    }
    if(!data 
        || !Array.isArray(data.products) || !Array.isArray(data.sellers) || !Array.isArray(data.purchase_records) || !Array.isArray(data.customers) // проверка на тип данных(массив)
        || data.products.length === 0 || data.sellers.length === 0 || data.purchase_records.length === 0 || data.customers.length === 0) // проверка на заполненность данных
        {
            throw new Error('Некорректные входные данные');
        } 

    // @TODO: Проверка наличия опций

        const { calculateRevenue, calculateBonus } = options;

        if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
            throw new Error('Чего-то не хватает');
        }

    // @TODO: Подготовка промежуточных данных для сбора статистики

        const sellerStats = data.sellers.map(seller => ({
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {} // Сюда пойдёт ключ - SKU(артикул) и количество продаж товара. 
                              // По сути будем искать по индексу id продавца (seller.id) в purchase_records(чеках) в items значение по ключу sku
                              // Не понятно только, как нам спуститься в items, проверяя "снаружи" id продавца. 
                              // Может на вход давать просто массив purchase_records, без items. И каким методом проходиться? reduce?  
                              // Ясно! В качестве id будет подаваться sellerIndex. И теперь можно проходиться по продуктам productIndex -
                              // циклом, искать там по id продавца, хотя не получится, нам ведь нужен чек, а не продукты.                        
        }))

    // @TODO: Индексация продавцов и товаров для быстрого доступа

        const sellerIndex = Object.fromEntries(sellerStats.map(item => [item.id, item])) // Ключом будет id, значением — запись из sellerStats
        const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item])) // Ключом будет sku, значением — запись из data.products 
                                                                                            // Наверное для функции расчёта прибыли

    // @TODO: Расчет выручки и прибыли для каждого продавца

        data.purchase_records.forEach(record => {
            const seller = sellerIndex[record.seller_id]; // Продавец
             seller.sales_count++
             seller.revenue += record.total_amount;
            
             record.items.forEach(item => {
                const product = productIndex[item.sku];
                const cost = product.purchase_price * item.quantity;
                const revenue = calculateRevenue(item); 
                const profit = revenue - cost;
                seller.profit += profit;

                 if(!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
                seller.products_sold[item.sku]++;
             })
        })

    // @TODO: Сортировка продавцов по прибыли

        sellerStats.sort((a, b) => {
        if(a.profit > b.profit) {
            return -1;
        }
        if(a.profit < b.profit) {
            return 1;
        }
        return 0;
        })

        // @TODO: Назначение премий на основе ранжирования
        sellerStats.forEach((seller, index) => {
            seller.bonus = calculateBonus(index, sellerStats.length, seller);
            seller.top_products = Object.entries(seller.products_sold).map(item => ({                  
                sku: item[0],
                quantity: item[1]
            }))
             seller.top_products.sort((a, b) => b.quantity - a.quantity);
        })
        for(seller of sellerStats) {
            seller.top_products = seller.top_products.slice(0, 10);
        }
        
          return sellerStats.map(seller => ({
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: seller.top_products,
            bonus: +seller.bonus.toFixed(2)
          }))
    // @TODO: Подготовка итоговой коллекции с нужными по
        }