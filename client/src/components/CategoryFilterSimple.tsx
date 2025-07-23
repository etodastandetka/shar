import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

function CategoryFilterSimple() {
  const [location, setLocation] = useLocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Получаем категории из API
  const { data: categories = [], isLoading } = useQuery<string[]>({
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
  
  const applyFilter = (category?: string, rare?: boolean) => {
    const params = new URLSearchParams();
    
    if (category) params.set("category", category);
    if (rare) params.set("rare", "true");
    
    const currentSearch = searchParams.get("search");
    if (currentSearch) params.set("search", currentSearch);
    
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    
    const newUrl = `/catalog${params.toString() ? `?${params.toString()}` : ""}`;
    
    // Принудительная навигация с полной перезагрузкой
    window.location.assign(newUrl);
  };
  
  const clearAllFilters = () => {
    window.location.href = "/catalog";
  };
  
  const hasActiveFilters = currentCategory || isRareFilter;
  
  return (
    <section className="bg-gray-50 py-4 border-b">
      <div className="container mx-auto px-4">
        {/* Desktop версия */}
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
            <Button
              variant={!currentCategory && !isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter("", false)}
            >
              Все растения
            </Button>
            
            {!isLoading && categories.map((category) => (
              <Button
                key={category}
                variant={currentCategory === category ? "default" : "outline"}
                onClick={() => applyFilter(category, false)}
              >
                {category}
              </Button>
            ))}
            
            <Button
              variant={isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter("", true)}
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

        {/* Мобильная версия */}
        <div className="block lg:hidden">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
            <Button
              size="sm"
              variant={!currentCategory && !isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter("", false)}
            >
              Все растения
            </Button>
            
            {!isLoading && categories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={currentCategory === category ? "default" : "outline"}
                onClick={() => applyFilter(category, false)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
            
            <Button
              size="sm"
              variant={isRareFilter ? "default" : "outline"}
              onClick={() => applyFilter("", true)}
            >
              Редкие
            </Button>
            
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearAllFilters}>
                <X className="h-4 w-4" />
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

export default CategoryFilterSimple;