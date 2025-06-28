import Hero from "@/components/Hero";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import FaqAccordion from "@/components/FaqAccordion";
import { Loader2, ArrowRight } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function HomePage() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const [location, setLocation] = useLocation();
  
  // Parse URL parameters for filters
  const filterParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
    const params = new URLSearchParams();
    
    // Add filters if they exist
    if (searchParams.get("category")) params.append("category", searchParams.get("category")!);
    if (searchParams.get("available") === "true") params.append("available", "true");
    if (searchParams.get("preorder") === "true") params.append("preorder", "true");
    if (searchParams.get("rare") === "true") params.append("rare", "true");
    if (searchParams.get("easy") === "true") params.append("easy", "true");
    if (searchParams.get("discount") === "true") params.append("discount", "true");
    if (searchParams.get("petSafe") === "true") params.append("petSafe", "true");
    if (searchParams.get("airPurifying") === "true") params.append("airPurifying", "true");
    if (searchParams.get("flowering") === "true") params.append("flowering", "true");
    if (searchParams.get("plantSize")) params.append("plantSize", searchParams.get("plantSize")!);
    if (searchParams.get("lightLevel")) params.append("lightLevel", searchParams.get("lightLevel")!);
    if (searchParams.get("humidityLevel")) params.append("humidityLevel", searchParams.get("humidityLevel")!);
    if (searchParams.get("plantType")) params.append("plantType", searchParams.get("plantType")!);
    if (searchParams.get("origin")) params.append("origin", searchParams.get("origin")!);
    if (searchParams.get("search")) params.append("search", searchParams.get("search")!);
    if (searchParams.get("minPrice")) params.append("minPrice", searchParams.get("minPrice")!);
    if (searchParams.get("maxPrice")) params.append("maxPrice", searchParams.get("maxPrice")!);
    
    return params.toString();
  }, [location]);
  
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/products`, filterParams],
    queryFn: async ({ queryKey }) => {
      const [endpoint, params] = queryKey;
      const url = params ? `${endpoint}?${params}` : endpoint;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });
  
  // Случайная выборка товаров для рекомендаций
  const shuffledProducts = useMemo(() => {
    return [...products].sort(() => Math.random() - 0.5);
  }, [products]);
  
  const totalPages = Math.ceil(shuffledProducts.length / itemsPerPage);
  const paginatedProducts = shuffledProducts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Улучшенная функция пагинации
  const renderPagination = () => {
    if (totalPages <= 1) return null;

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

    return (
      <div className="mt-12 flex justify-center">
        <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`${page === 1 ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-primary/10"} transition-colors`}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            
            {pages.map((pageItem, index) => {
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
                    onClick={() => setPage(pageItem as number)}
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
            })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={`${page === totalPages ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-primary/10"} transition-colors`}
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };
  
  return (
    <>
      <Hero />
      
      {/* Product Catalog */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Наши рекомендации
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Специально подобранные для вас растения от наших экспертов
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-600">Загружаем лучшие растения для вас...</p>
            </div>
          ) : shuffledProducts.length > 0 ? (
            <>
              {/* Товары */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8 place-items-center">
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="transform transition-transform duration-300 hover:scale-105 w-full max-w-[280px]">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* Информация о количестве товаров */}
              <div className="text-center mb-8">
                <p className="text-gray-600">
                  Показано {paginatedProducts.length} из {shuffledProducts.length} растений
                </p>
              </div>
              
              {/* Пагинация */}
              {renderPagination()}

              {/* Кнопка "Смотреть все" */}
              <div className="text-center mt-12">
                <Button 
                  onClick={() => setLocation("/catalog")}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                >
                  Смотреть весь каталог
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467-.881-6.08-2.33m15.893 3.893l3.395-3.395A1 1 0 0121 12V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 00.293.707l3.395 3.395" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Растения временно недоступны</h3>
              <p className="text-gray-600 mb-6">Мы работаем над пополнением каталога</p>
              <Button 
                onClick={() => setLocation("/catalog")}
                variant="outline"
                className="px-6 py-2"
              >
                Перейти в каталог
              </Button>
            </div>
          )}
        </div>
      </section>
      
      <Features />
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="heading font-montserrat font-semibold text-xl mb-4">Наши отзывы в Telegram</h2>
        <p className="mb-6">Прочитайте, что говорят о нас наши клиенты</p>
        <Button asChild variant="outline" size="lg">
          <a href="https://t.me/junglefeedback" target="_blank" rel="noreferrer">
            Перейти к отзывам в Telegram
          </a>
        </Button>
      </div>
      <FaqAccordion />
    </>
  );
}
