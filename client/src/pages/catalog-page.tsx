import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Product } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import CategoryFilterSimple from "@/components/CategoryFilterSimple";

// Custom hook для debounce
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CatalogPage() {
  const [location, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minPriceInput, setMinPriceInput] = useState("0");
  const [maxPriceInput, setMaxPriceInput] = useState("10000");
  const [sortBy, setSortBy] = useState<string>("default");
  const itemsPerPage = 12;
  
  // Debounced поиск с задержкой 500ms
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Принудительное обновление при изменении URL
  const [urlParams, setUrlParams] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      searchParams,
      initialSearch: searchParams.get("search") || "",
      minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
      initialCategory: searchParams.get("category") || "",
      initialRare: searchParams.get("rare") === "true",
      initialPage: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
    };
  });
  
  // Обновляем параметры при изменении location
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const newParams = {
      searchParams,
      initialSearch: searchParams.get("search") || "",
      minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
      initialCategory: searchParams.get("category") || "",
      initialRare: searchParams.get("rare") === "true",
      initialPage: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
    };
    
    console.log("🔥 CATALOG: Updated URL params:", newParams);
    setUrlParams(newParams);
  }, [location]);
  
  const { searchParams, initialSearch, minPrice, maxPrice, initialCategory, initialRare, initialPage } = urlParams;
  
  // Set initial search term and page
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
    if (minPrice !== undefined) {
      setMinPriceInput(minPrice.toString());
      setPriceRange(prev => [minPrice, prev[1]]);
    }
    if (maxPrice !== undefined) {
      setMaxPriceInput(maxPrice.toString());
      setPriceRange(prev => [prev[0], maxPrice]);
    }
    if (initialPage !== undefined && initialPage !== page) {
      setPage(initialPage);
    }
  }, [initialSearch, minPrice, maxPrice, initialPage]);
  
  // Автоматический поиск при изменении debouncedSearchTerm
  useEffect(() => {
    if (debouncedSearchTerm !== (initialSearch || "")) {
      updateUrlParams({ search: debouncedSearchTerm || undefined });
    }
  }, [debouncedSearchTerm]);
  
  // Build API query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.append("search", searchTerm);
    
    // Добавляем фильтрацию по цене
    if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
    if (priceRange[1] < 10000) params.append("maxPrice", priceRange[1].toString());
    
    // Добавляем фильтрацию по категории
    if (initialCategory) {
      params.append("category", initialCategory);
    }
    
    // Добавляем фильтрацию по редким растениям
    if (initialRare) {
      params.append("rare", "true");
    }
    
    // Добавляем сортировку
    if (sortBy !== "default") params.append("sortBy", sortBy);
    
    return params.toString();
  };
  
  // Fetch products with filters
  const queryString = buildQueryString();
  
  // Простое состояние без React Query
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Загружаем данные обычным fetch при изменении queryString
  useEffect(() => {
    console.log("🔥 CATALOG: queryString changed:", queryString);
    console.log("🔥 CATALOG: initialCategory:", initialCategory);
    
    const fetchProducts = async () => {
      setDataLoading(true);
      try {
        const url = queryString ? `/api/products?${queryString}` : '/api/products';
        console.log("🔥 CATALOG: Fetching URL:", url);
        
        const res = await fetch(url, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        
        console.log("🔥 CATALOG: Received products:", data.length || 0, "items");
        setRawProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        setRawProducts([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProducts();
  }, [queryString]);
  
  // Обрабатываем случай когда данные еще не загружены
  const allProducts = rawProducts || [];
  const isLoading = dataLoading;
  
  // Apply sorting to products
  const products = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    
    const sorted = [...allProducts];
    
    switch (sortBy) {
      case "price_asc":
        return sorted.sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
      case "price_desc":
        return sorted.sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
      case "name_asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      case "name_desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      default:
        return sorted;
    }
  }, [allProducts, sortBy]);
  
  // Simple pagination calculation
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  

  
  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
    setMinPriceInput(value[0].toString());
    setMaxPriceInput(value[1].toString());
  };
  
  const handlePriceInputChange = (min: string, max: string) => {
    const minValue = parseInt(min) || 0;
    const maxValue = parseInt(max) || 10000;
    
    setMinPriceInput(min);
    setMaxPriceInput(max);
    
    if (minValue >= 0 && maxValue > minValue) {
      setPriceRange([minValue, maxValue]);
    }
  };
  
  const applyPriceFilter = () => {
    // Обновляем URL и запускаем запрос с новыми параметрами цены
    updateUrlParams({ 
      minPrice: priceRange[0] > 0 ? priceRange[0].toString() : undefined, 
      maxPrice: priceRange[1] < 10000 ? priceRange[1].toString() : undefined 
    });
  };
  
  const updateUrlParams = (newParams: Record<string, string | undefined>, resetPage = true) => {
    console.log("Updating URL params:", newParams);
    const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
    
    // Update or remove parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined) {
        params.delete(key);
        console.log(`Removed param: ${key}`);
      } else {
        params.set(key, value);
        console.log(`Set param: ${key} = ${value}`);
      }
    });
    
    // Reset to page 1 when filters change (but not when manually changing page)
    if (resetPage && !newParams.page) {
      setPage(1);
      params.delete('page'); // Remove page param when resetting to 1
    }
    
    // Construct new URL
    const newUrl = `/catalog${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("New URL:", newUrl);
    console.log("Setting location to:", newUrl);
    setLocation(newUrl);
  };
  
  const clearAllFilters = () => {
    setSearchTerm("");
    setPriceRange([0, 10000]);
    setMinPriceInput("0");
    setMaxPriceInput("10000");
    setSortBy("default");
    setLocation("/catalog");
  };
  
  return (
    <>
      <div className="bg-primary text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="heading font-montserrat font-bold text-2xl md:text-3xl">Каталог растений</h1>
        </div>
      </div>
      
      <CategoryFilterSimple />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          {/* Search */}
          <div className="relative w-full md:w-auto">
            <Input
              type="text"
              placeholder="Поиск растений..."
              className="form-input pl-10 pr-4 w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                Поиск...
              </span>
            )}
          </div>
          
          {/* Mobile filters button */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Фильтры
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="py-4">
                  <h3 className="font-montserrat font-semibold text-lg mb-4">Фильтры</h3>
                  
                  <div className="space-y-6">
                    
                    <div>
                      <h4 className="font-medium mb-2">Цена</h4>
                      <Slider
                        defaultValue={priceRange}
                        min={0}
                        max={10000}
                        step={100}
                        value={priceRange}
                        onValueChange={handlePriceChange}
                        className="mb-4"
                      />
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          type="text"
                          placeholder="От"
                          className="form-input"
                          value={minPriceInput}
                          onChange={(e) => handlePriceInputChange(e.target.value, maxPriceInput)}
                        />
                        <span>-</span>
                        <Input
                          type="text"
                          placeholder="До"
                          className="form-input"
                          value={maxPriceInput}
                          onChange={(e) => handlePriceInputChange(minPriceInput, e.target.value)}
                        />
                      </div>
                      <SheetClose asChild>
                        <Button onClick={applyPriceFilter} className="w-full">
                          Применить
                        </Button>
                      </SheetClose>
                    </div>

                    {/* Сортировка для мобильных */}
                    <div>
                      <h4 className="font-medium mb-2">Сортировка</h4>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите сортировку" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">По умолчанию</SelectItem>
                          <SelectItem value="price_asc">Цена: по возрастанию</SelectItem>
                          <SelectItem value="price_desc">Цена: по убыванию</SelectItem>
                          <SelectItem value="name_asc">Название: А-Я</SelectItem>
                          <SelectItem value="name_desc">Название: Я-А</SelectItem>
                          <SelectItem value="newest">Сначала новые</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Clear filters button for mobile */}
                    {(searchTerm || priceRange[0] > 0 || priceRange[1] < 10000) && (
                      <div className="pt-4 border-t">
                        <SheetClose asChild>
                          <Button 
                            variant="outline" 
                            onClick={clearAllFilters} 
                            className="w-full"
                          >
                            Сбросить все фильтры
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Clear search and price filters */}
          {(searchTerm || priceRange[0] > 0 || priceRange[1] < 10000) && (
            <div className="hidden md:block mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
        
        {/* Desktop price filter and sorting */}
        <div className="hidden md:flex items-center justify-between mb-6 gap-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Цена:</span>
            
            {/* Два отдельных ползунка для цены */}
            <div className="flex items-center space-x-4">
              <div className="flex flex-col space-y-2">
                <label className="text-xs text-gray-500">От:</label>
                <div className="w-32">
                  <Slider
                    value={[priceRange[0]]}
                    min={0}
                    max={9900}
                    step={100}
                    onValueChange={(value) => {
                      const newMin = value[0];
                      if (newMin < priceRange[1]) {
                        setPriceRange([newMin, priceRange[1]]);
                        setMinPriceInput(newMin.toString());
                      }
                    }}
                    className="mb-2"
                  />
                  <Input
                    type="text"
                    placeholder="От"
                    className="form-input w-20 text-xs"
                    value={minPriceInput}
                    onChange={(e) => {
                      setMinPriceInput(e.target.value);
                      const val = parseInt(e.target.value) || 0;
                      if (val >= 0 && val < priceRange[1]) setPriceRange([val, priceRange[1]]);
                    }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <label className="text-xs text-gray-500">До:</label>
                <div className="w-32">
                  <Slider
                    value={[priceRange[1]]}
                    min={100}
                    max={10000}
                    step={100}
                    onValueChange={(value) => {
                      const newMax = value[0];
                      if (newMax > priceRange[0]) {
                        setPriceRange([priceRange[0], newMax]);
                        setMaxPriceInput(newMax.toString());
                      }
                    }}
                    className="mb-2"
                  />
                  <Input
                    type="text"
                    placeholder="До"
                    className="form-input w-20 text-xs"
                    value={maxPriceInput}
                    onChange={(e) => {
                      setMaxPriceInput(e.target.value);
                      const val = parseInt(e.target.value) || 10000;
                      if (val > priceRange[0] && val <= 10000) setPriceRange([priceRange[0], val]);
                    }}
                  />
                </div>
              </div>
              
              <Button onClick={applyPriceFilter} size="sm">
                Применить
              </Button>
            </div>
          </div>
          
          {/* Сортировка */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Сортировка:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Выберите сортировку" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">По умолчанию</SelectItem>
                <SelectItem value="price_asc">Цена: по возрастанию</SelectItem>
                <SelectItem value="price_desc">Цена: по убыванию</SelectItem>
                <SelectItem value="name_asc">Название: А-Я</SelectItem>
                <SelectItem value="name_desc">Название: Я-А</SelectItem>
                <SelectItem value="newest">Сначала новые</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Result count */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-gray-600 font-medium">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Загрузка...
                </span>
              ) : (
                `Найдено ${products.length} растений`
              )}
          </p>
            {products.length > 0 && totalPages > 1 && (
              <p className="text-sm text-gray-500">
                Страница {page} из {totalPages}
              </p>
            )}
          </div>
        </div>
        
        {/* Products */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-[1400px] mx-auto items-stretch place-items-center">
              {paginatedProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg w-full max-w-[280px]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            
            {/* Показать информацию о товарах */}
            {products.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Показано {paginatedProducts.length} из {products.length} растений
                  {totalPages > 1 && ` • Страница ${page} из ${totalPages}`}
                </p>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent className="gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          const newPage = Math.max(1, page - 1);
                          setPage(newPage);
                          updateUrlParams({ page: newPage > 1 ? newPage.toString() : undefined }, false);
                        }}
                        className={`${page === 1 ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-primary/10"} transition-colors`}
                        aria-disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {/* Display page numbers with improved logic */}
                    {(() => {
                      const pages = [];
                      const maxVisible = 3; // Уменьшаем количество видимых страниц
                      
                      // Простая логика пагинации
                      let startPage = Math.max(1, page - 1);
                      let endPage = Math.min(totalPages, page + 1);

                      // Корректируем для показа 3 страниц
                      if (endPage - startPage + 1 < maxVisible && totalPages >= maxVisible) {
                        if (startPage === 1) {
                          endPage = Math.min(totalPages, maxVisible);
                        } else if (endPage === totalPages) {
                          startPage = Math.max(1, totalPages - maxVisible + 1);
                        }
                      }

                      // Показываем первую страницу если мы далеко от неё
                      if (startPage > 1) {
                        pages.push(1);
                        if (startPage > 2) {
                          pages.push('...');
                        }
                      }

                      // Добавляем видимые страницы
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }

                      // Показываем последнюю страницу если мы далеко от неё
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push('...');
                        }
                        pages.push(totalPages);
                      }
                      
                      return pages.map((pageItem, index) => {
                        if (pageItem === '...') {
                      return (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <PaginationEllipsis />
                        </PaginationItem>
                      );
                        }
                    
                        return (
                          <PaginationItem key={pageItem}>
                        <PaginationLink
                              onClick={() => {
                                const newPage = pageItem as number;
                                setPage(newPage);
                                updateUrlParams({ page: newPage > 1 ? newPage.toString() : undefined }, false);
                              }}
                              isActive={page === pageItem}
                              className={`cursor-pointer transition-colors ${
                                page === pageItem 
                                  ? "bg-primary text-white hover:bg-primary/90" 
                                  : "hover:bg-primary/10"
                              }`}
                        >
                              {pageItem}
                        </PaginationLink>
                      </PaginationItem>
                        );
                      });
                    })()}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => {
                          const newPage = Math.min(totalPages, page + 1);
                          setPage(newPage);
                          updateUrlParams({ page: newPage > 1 ? newPage.toString() : undefined }, false);
                        }}
                        className={`${page === totalPages ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-primary/10"} transition-colors`}
                        aria-disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">По вашему запросу ничего не найдено</h3>
            <p className="text-gray-600 mb-4">Попробуйте изменить параметры поиска или фильтры</p>
            <Button 
              onClick={() => {
                setLocation("/catalog");
                setSearchTerm("");
                setPriceRange([0, 10000]);
                setMinPriceInput("0");
                setMaxPriceInput("10000");
              }}
              variant="outline"
            >
              Сбросить все фильтры
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
