import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterParams = {
  category?: string;
  available?: boolean;
  preorder?: boolean;
  rare?: boolean;
  easy?: boolean;
  discount?: boolean;
  minPrice?: number;
  maxPrice?: number;
  plantSize?: string;
  lightLevel?: string;
  humidityLevel?: string;
  plantType?: string;
  origin?: string;
  petSafe?: boolean;
  airPurifying?: boolean;
  flowering?: boolean;
};

function CategoryFilter() {
  const [location, setLocation] = useLocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([500, 5000]);
  const [minPriceInput, setMinPriceInput] = useState("500");
  const [maxPriceInput, setMaxPriceInput] = useState("5000");
  
  // Parse current URL params using useMemo to ensure it updates when location changes
  const filterState = useMemo(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    return {
      currentCategory: searchParams.get("category") || "",
      available: searchParams.get("available") === "true",
      preorder: searchParams.get("preorder") === "true",
      rare: searchParams.get("rare") === "true",
      easy: searchParams.get("easy") === "true",
      discount: searchParams.get("discount") === "true",
      plantSize: searchParams.get("plantSize") || "",
      lightLevel: searchParams.get("lightLevel") || "",
      humidityLevel: searchParams.get("humidityLevel") || "",
      plantType: searchParams.get("plantType") || "",
      origin: searchParams.get("origin") || "",
      petSafe: searchParams.get("petSafe") === "true",
      airPurifying: searchParams.get("airPurifying") === "true",
      flowering: searchParams.get("flowering") === "true",
    };
  }, [location]);

  const { 
    currentCategory, available, preorder, rare, easy, discount,
    plantSize, lightLevel, humidityLevel, plantType, origin,
    petSafe, airPurifying, flowering
  } = filterState;
  
  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters);
  };
  
  const applyFilter = (newParams: FilterParams) => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    
    // Update or remove parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    // Construct new URL
    const newUrl = `/catalog${params.toString() ? `?${params.toString()}` : ""}`;
    setLocation(newUrl);
    
    // Close mobile filters
    setShowMobileFilters(false);
  };
  
  const handleCategoryClick = (category: string | undefined) => {
    applyFilter({ category });
  };
  
  const handleToggleFilter = (filter: keyof FilterParams) => {
    const currentValue = searchParams.get(filter) === "true";
    applyFilter({ [filter]: !currentValue });
  };
  
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
    applyFilter({ minPrice: priceRange[0], maxPrice: priceRange[1] });
  };

  const clearAllFilters = () => {
    setLocation("/catalog");
    setShowMobileFilters(false);
  };

  const handleSelectFilter = (filterKey: keyof FilterParams, value: string | undefined) => {
    applyFilter({ [filterKey]: value || undefined });
  };

  // Check if any filters are active
  const hasActiveFilters = currentCategory || available || preorder || rare || easy || discount || 
    plantSize || lightLevel || humidityLevel || plantType || origin || petSafe || airPurifying || flowering;
  
  return (
    <section className="bg-neutral-medium py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading font-montserrat font-semibold text-xl">Каталог растений</h2>
          <button
            className="lg:hidden flex items-center text-neutral-dark"
            onClick={toggleMobileFilters}
          >
            <Filter className="h-5 w-5 mr-1" />
            <span>Фильтры</span>
          </button>
        </div>
        
        <div className="hidden lg:block">
          {/* Basic Filters Row */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
            <Button
              variant={!currentCategory ? "default" : "outline"}
              className={!currentCategory ? "bg-primary text-white" : ""}
              onClick={() => handleCategoryClick(undefined)}
            >
              Все растения
            </Button>
            <Button
              variant={available ? "default" : "outline"}
              className={available ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("available")}
            >
              В наличии
            </Button>
            <Button
              variant={preorder ? "default" : "outline"}
              className={preorder ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("preorder")}
            >
              Предзаказ
            </Button>
            <Button
              variant={rare ? "default" : "outline"}
              className={rare ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("rare")}
            >
              Редкие виды
            </Button>
            <Button
              variant={easy ? "default" : "outline"}
              className={easy ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("easy")}
            >
              Простой уход
            </Button>
            <Button
              variant={discount ? "default" : "outline"}
              className={discount ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("discount")}
            >
              Со скидкой
            </Button>
            <Button
              variant={petSafe ? "default" : "outline"}
              className={petSafe ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("petSafe")}
            >
              Безопасно для питомцев
            </Button>
            <Button
              variant={airPurifying ? "default" : "outline"}
              className={airPurifying ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("airPurifying")}
            >
              Очищает воздух
            </Button>
            <Button
              variant={flowering ? "default" : "outline"}
              className={flowering ? "bg-primary text-white" : ""}
              onClick={() => handleToggleFilter("flowering")}
            >
              Цветущие
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Очистить фильтры
              </Button>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>Дополнительные фильтры</span>
              {showAdvancedFilters ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-white rounded-lg border">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Размер растения</label>
                <Select value={plantSize} onValueChange={(value) => handleSelectFilter("plantSize", value === "all" ? undefined : value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Любой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любой размер</SelectItem>
                    <SelectItem value="small">Маленькие</SelectItem>
                    <SelectItem value="medium">Средние</SelectItem>
                    <SelectItem value="large">Большие</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Освещение</label>
                <Select value={lightLevel} onValueChange={(value) => handleSelectFilter("lightLevel", value === "all" ? undefined : value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Любое" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любое освещение</SelectItem>
                    <SelectItem value="low">Слабое</SelectItem>
                    <SelectItem value="moderate">Умеренное</SelectItem>
                    <SelectItem value="bright">Яркое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Влажность</label>
                <Select value={humidityLevel} onValueChange={(value) => handleSelectFilter("humidityLevel", value === "all" ? undefined : value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Любая" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любая влажность</SelectItem>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Тип растения</label>
                <Select value={plantType} onValueChange={(value) => handleSelectFilter("plantType", value === "all" ? undefined : value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Любой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любой тип</SelectItem>
                    <SelectItem value="succulent">Суккуленты</SelectItem>
                    <SelectItem value="fern">Папоротники</SelectItem>
                    <SelectItem value="flowering">Цветущие</SelectItem>
                    <SelectItem value="decorative">Декоративно-лиственные</SelectItem>
                    <SelectItem value="palm">Пальмы</SelectItem>
                    <SelectItem value="vine">Лианы</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Происхождение</label>
                <Select value={origin} onValueChange={(value) => handleSelectFilter("origin", value === "all" ? undefined : value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Любое" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любое происхождение</SelectItem>
                    <SelectItem value="tropical">Тропические</SelectItem>
                    <SelectItem value="desert">Пустынные</SelectItem>
                    <SelectItem value="temperate">Умеренные</SelectItem>
                    <SelectItem value="subtropical">Субтропические</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-2xl shadow-lg animate-slideUp">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Фильтры</h3>
                  <button 
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors" 
                    onClick={() => setShowMobileFilters(false)}
                    aria-label="Закрыть фильтры"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Категории</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={!currentCategory ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          !currentCategory 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleCategoryClick(undefined)}
                      >
                        Все растения
                      </Button>
                      {/* Add categories here */}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Фильтры</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={available ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          available 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("available")}
                      >
                        В наличии
                      </Button>
                      <Button
                        variant={preorder ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          preorder 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("preorder")}
                      >
                        Предзаказ
                      </Button>
                      <Button
                        variant={rare ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          rare 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("rare")}
                      >
                        Редкие виды
                      </Button>
                      <Button
                        variant={easy ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          easy 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("easy")}
                      >
                        Простой уход
                      </Button>
                      <Button
                        variant={discount ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          discount 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("discount")}
                      >
                        Со скидкой
                      </Button>
                      <Button
                        variant={petSafe ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          petSafe 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("petSafe")}
                      >
                        Безопасно для питомцев
                      </Button>
                      <Button
                        variant={airPurifying ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          airPurifying 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("airPurifying")}
                      >
                        Очищает воздух
                      </Button>
                      <Button
                        variant={flowering ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-sm transition-all duration-200",
                          flowering 
                            ? "bg-primary text-white hover:bg-primary/90" 
                            : "hover:bg-gray-100"
                        )}
                        onClick={() => handleToggleFilter("flowering")}
                      >
                        Цветущие
                      </Button>
                    </div>
                  </div>

                  {/* Advanced Mobile Filters */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Дополнительные фильтры</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Размер растения</label>
                        <Select value={plantSize} onValueChange={(value) => handleSelectFilter("plantSize", value === "all" ? undefined : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Любой размер" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Любой размер</SelectItem>
                            <SelectItem value="small">Маленькие</SelectItem>
                            <SelectItem value="medium">Средние</SelectItem>
                            <SelectItem value="large">Большие</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Освещение</label>
                        <Select value={lightLevel} onValueChange={(value) => handleSelectFilter("lightLevel", value === "all" ? undefined : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Любое освещение" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Любое освещение</SelectItem>
                            <SelectItem value="low">Слабое</SelectItem>
                            <SelectItem value="moderate">Умеренное</SelectItem>
                            <SelectItem value="bright">Яркое</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Тип растения</label>
                        <Select value={plantType} onValueChange={(value) => handleSelectFilter("plantType", value === "all" ? undefined : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Любой тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Любой тип</SelectItem>
                            <SelectItem value="succulent">Суккуленты</SelectItem>
                            <SelectItem value="fern">Папоротники</SelectItem>
                            <SelectItem value="flowering">Цветущие</SelectItem>
                            <SelectItem value="decorative">Декоративно-лиственные</SelectItem>
                            <SelectItem value="palm">Пальмы</SelectItem>
                            <SelectItem value="vine">Лианы</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  {hasActiveFilters && (
                    <Button 
                      variant="outline"
                      className="w-full text-red-600 border-red-600 hover:bg-red-50" 
                      onClick={clearAllFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Очистить все фильтры
                    </Button>
                  )}
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    Применить фильтры
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoryFilter;
