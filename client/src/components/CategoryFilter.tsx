import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";

type FilterParams = {
  category?: string;
  available?: boolean;
  preorder?: boolean;
  rare?: boolean;
  easy?: boolean;
  discount?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

function CategoryFilter() {
  const [location, setLocation] = useLocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([500, 5000]);
  const [minPriceInput, setMinPriceInput] = useState("500");
  const [maxPriceInput, setMaxPriceInput] = useState("5000");
  
  // Parse current URL params
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const currentCategory = searchParams.get("category") || "";
  const available = searchParams.get("available") === "true";
  const preorder = searchParams.get("preorder") === "true";
  const rare = searchParams.get("rare") === "true";
  const easy = searchParams.get("easy") === "true";
  const discount = searchParams.get("discount") === "true";
  
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
        
        <div className="hidden lg:flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
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
        </div>
        
        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="lg:hidden bg-white rounded-lg p-4 mt-3 animate-fadeIn shadow-md">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={!currentCategory ? "default" : "outline"}
                className={!currentCategory ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleCategoryClick(undefined)}
              >
                Все растения
              </Button>
              <Button
                variant={available ? "default" : "outline"}
                className={available ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleToggleFilter("available")}
              >
                В наличии
              </Button>
              <Button
                variant={preorder ? "default" : "outline"}
                className={preorder ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleToggleFilter("preorder")}
              >
                Предзаказ
              </Button>
              <Button
                variant={rare ? "default" : "outline"}
                className={rare ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleToggleFilter("rare")}
              >
                Редкие виды
              </Button>
              <Button
                variant={easy ? "default" : "outline"}
                className={easy ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleToggleFilter("easy")}
              >
                Простой уход
              </Button>
              <Button
                variant={discount ? "default" : "outline"}
                className={discount ? "bg-primary text-white text-sm" : "text-sm"}
                onClick={() => handleToggleFilter("discount")}
              >
                Со скидкой
              </Button>
            </div>
            
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold mb-3">Цена</h3>
              <Slider
                defaultValue={priceRange}
                min={0}
                max={10000}
                step={100}
                value={priceRange}
                onValueChange={handlePriceChange}
                className="mb-4"
              />
              <div className="flex items-center">
                <Input
                  type="text"
                  placeholder="От"
                  className="form-input w-full rounded border mr-2"
                  value={minPriceInput}
                  onChange={(e) => handlePriceInputChange(e.target.value, maxPriceInput)}
                />
                <span>-</span>
                <Input
                  type="text"
                  placeholder="До"
                  className="form-input w-full rounded border ml-2"
                  value={maxPriceInput}
                  onChange={(e) => handlePriceInputChange(minPriceInput, e.target.value)}
                />
              </div>
              <Button 
                className="w-full mt-2" 
                variant="default"
                onClick={applyPriceFilter}
              >
                Применить
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CategoryFilter;
