import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

function CategoryFilter() {
  const [location, setLocation] = useLocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Получаем категории из API
  const { data: categories = [], isLoading } = useQuery<string[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });
  
  // Парсим текущие фильтры из URL
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const currentCategory = searchParams.get("category") || "";
  const isRareFilter = searchParams.get("rare") === "true";
  
  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters);
  };
  
  const applyFilter = (category?: string, rare?: boolean) => {
    const params = new URLSearchParams();
    
    // Добавляем категорию если выбрана
    if (category) {
      params.set("category", category);
    }
    
    // Добавляем фильтр редких растений
    if (rare) {
      params.set("rare", "true");
    }
    
    // Сохраняем поиск если есть
    const currentSearch = searchParams.get("search");
    if (currentSearch) {
      params.set("search", currentSearch);
    }
    
    // Сохраняем ценовые фильтры если есть
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    
    // Переходим на новый URL
    const newUrl = `/catalog${params.toString() ? `?${params.toString()}` : ""}`;
    setLocation(newUrl);
    setShowMobileFilters(false);
  };

  const clearAllFilters = () => {
    setLocation("/catalog");
    setShowMobileFilters(false);
  };

  // Проверяем есть ли активные фильтры
  const hasActiveFilters = currentCategory || isRareFilter;
  
  return (
    <section className="bg-gray-50 py-4 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <h2 className="font-montserrat font-semibold text-lg">Категории</h2>
          <button
            className="flex items-center text-gray-600 hover:text-gray-800"
            onClick={toggleMobileFilters}
          >
            <Filter className="h-5 w-5 mr-1" />
            <span>Фильтры</span>
          </button>
        </div>
        
        {/* Десктопная версия */}
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
            {/* Кнопка "Все растения" */}
            <Button
              variant={!currentCategory && !isRareFilter ? "default" : "outline"}
              onClick={() => {
                applyFilter();
              }}
              className={!currentCategory && !isRareFilter ? "bg-primary text-white" : ""}
            >
              Все растения
            </Button>
            
            {/* Кнопки категорий из БД */}
            {!isLoading && categories.map((category) => (
            <Button
                key={category}
                variant={currentCategory === category ? "default" : "outline"}
                onClick={() => {
                  applyFilter(category);
                }}
                className={currentCategory === category ? "bg-primary text-white" : ""}
              >
                {category}
            </Button>
            ))}
            
            {/* Кнопка "Редкие растения" */}
            <Button
              variant={isRareFilter ? "default" : "outline"}
              onClick={() => {
                applyFilter(undefined, true);
              }}
              className={isRareFilter ? "bg-secondary text-white" : ""}
            >
              Редкие растения
            </Button>
            
            {/* Кнопка сброса фильтров */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
        </div>
        
        {/* Мобильная версия */}
        {showMobileFilters && (
          <div className="lg:hidden bg-white border rounded-lg p-4 mt-4 shadow-sm">
            <div className="space-y-3">
              <h3 className="font-medium">Категории</h3>
              
              {/* Кнопка "Все растения" */}
                  <button 
                onClick={() => applyFilter()}
                className={`block w-full text-left px-3 py-2 rounded ${
                  !currentCategory && !isRareFilter 
                    ? "bg-primary text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                      >
                        Все растения
              </button>
              
              {/* Кнопки категорий */}
              {!isLoading && categories.map((category) => (
                <button
                  key={category}
                  onClick={() => applyFilter(category)}
                  className={`block w-full text-left px-3 py-2 rounded ${
                    currentCategory === category 
                      ? "bg-primary text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
              
              {/* Кнопка "Редкие растения" */}
              <button
                onClick={() => applyFilter(undefined, true)}
                className={`block w-full text-left px-3 py-2 rounded ${
                  isRareFilter 
                    ? "bg-secondary text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Редкие растения
              </button>
              
              {/* Кнопка сброса */}
                  {hasActiveFilters && (
                <button
                      onClick={clearAllFilters}
                  className="block w-full text-left px-3 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <X className="h-4 w-4 inline mr-2" />
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="text-center py-4">
            <span className="text-gray-500">Загрузка категорий...</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoryFilter;