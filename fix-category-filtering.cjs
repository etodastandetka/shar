const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('=== ИСПРАВЛЕНИЕ ФИЛЬТРАЦИИ ТОВАРОВ ПО КАТЕГОРИЯМ ===\n');

try {
  // 1. Получаем все категории и товары
  console.log('📂 Анализ категорий и товаров...');
  
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  const allProducts = db.prepare('SELECT * FROM products ORDER BY category, name').all();
  
  console.log(`\n✅ Найдено:`);
  console.log(`   - Категорий: ${categories.length}`);
  console.log(`   - Товаров: ${allProducts.length}`);
  
  // 2. Группируем товары по категориям
  const productsByCategory = {};
  
  categories.forEach(cat => {
    const categoryName = cat.category;
    productsByCategory[categoryName] = allProducts.filter(p => p.category === categoryName);
  });
  
  console.log('\n📊 Товары по категориям:');
  Object.entries(productsByCategory).forEach(([category, products]) => {
    console.log(`   ${category}: ${products.length} товаров`);
  });
  
  // 3. Создаем файл с данными для фронтенда
  const categoryData = {
    categories: categories.map(c => c.category),
    productsByCategory: productsByCategory,
    allProducts: allProducts,
    lastUpdated: new Date().toISOString()
  };
  
  // 4. Записываем данные в JSON файл
  const dataPath = path.join(__dirname, 'client', 'public', 'category-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(categoryData, null, 2));
  console.log(`\n💾 Данные сохранены в: ${dataPath}`);
  
  console.log('\n🎉 ДАННЫЕ ПОДГОТОВЛЕНЫ!');
  console.log('\n📋 Создан файл category-data.json с:');
  console.log(`   - ${categories.length} категориями`);
  console.log(`   - ${allProducts.length} товарами`);
  console.log('   - Группировкой по категориям');
  
  // 5. Создаем простое решение
  console.log('\n🔧 Создаю упрощенную версию...');
  
  // Создаем простой компонент который использует принудительную перезагрузку
  const simpleFilter = `import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

function CategoryFilterSimple() {
  const [location, setLocation] = useLocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Получаем категории из API
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    staleTime: 0,
    gcTime: 0
  });
  
  // Парсим текущие фильтры из URL
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const currentCategory = searchParams.get("category") || "";
  const isRareFilter = searchParams.get("rare") === "true";
  
  const applyFilter = (category, rare) => {
    const params = new URLSearchParams();
    
    if (category) params.set("category", category);
    if (rare) params.set("rare", "true");
    
    const currentSearch = searchParams.get("search");
    if (currentSearch) params.set("search", currentSearch);
    
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    
    const newUrl = \`/catalog\${params.toString() ? \`?\${params.toString()}\` : ""}\`;
    
    // Принудительная перезагрузка страницы - это решит проблему кэша
    window.location.href = newUrl;
  };
  
  const clearAllFilters = () => {
    window.location.href = "/catalog";
  };
  
  const hasActiveFilters = currentCategory || isRareFilter;
  
  return (
    <section className="bg-gray-50 py-4 border-b">
      <div className="container mx-auto px-4">
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
            <Button
              variant={!currentCategory && !isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter()}
            >
              Все растения
            </Button>
            
            {!isLoading && categories.map((category) => (
              <Button
                key={category}
                variant={currentCategory === category ? "default" : "outline"}
                onClick={() => applyFilter(category)}
              >
                {category}
              </Button>
            ))}
            
            <Button
              variant={isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter(undefined, true)}
            >
              Редкие растения
            </Button>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
        </div>
        
        {isLoading && (
          <div className="text-center py-4">
            <span className="text-gray-500">Загрузка категорий...</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoryFilterSimple;`;

  const simpleFilterPath = path.join(__dirname, 'client', 'src', 'components', 'CategoryFilterSimple.tsx');
  fs.writeFileSync(simpleFilterPath, simpleFilter);
  console.log(`📝 Создан простой компонент: CategoryFilterSimple.tsx`);
  
  console.log('\n💡 РЕШЕНИЕ:');
  console.log('1. Замените в catalog-page.tsx строку:');
  console.log('   import CategoryFilter from "@/components/CategoryFilter";');
  console.log('   НА:');
  console.log('   import CategoryFilterSimple from "@/components/CategoryFilterSimple";');
  console.log('');
  console.log('2. Замените в JSX:');
  console.log('   <CategoryFilter />');
  console.log('   НА:');
  console.log('   <CategoryFilterSimple />');
  console.log('');
  console.log('3. Соберите проект: npm run build');
  console.log('');
  console.log('🔧 Что делает новое решение:');
  console.log('   - Использует window.location.href для принудительной перезагрузки');
  console.log('   - Полностью обходит React Query кэш');
  console.log('   - Гарантированно работает с фильтрацией');

} catch (error) {
  console.error('❌ Ошибка при исправлении:', error);
} finally {
  db.close();
} 